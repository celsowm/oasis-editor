import {
  isBundledMetricFontFamily,
  normalizeFamily,
} from "@/export/pdf/fonts/officeFontAssets.js";
import { createEditorLogger } from "@/utils/logger.js";
import { defaultFontDecoderRegistry } from "./decoders/FontDecoderRegistry.js";
import { SfntFontProgram } from "./sfnt/SfntFontProgram.js";

export interface RemotePdfFontFace {
  family: string;
  bold: boolean;
  italic: boolean;
  fontData: Uint8Array;
  postscriptName?: string;
}

const fontLogger = createEditorLogger("fonts");
const activeFamilies = new Set<string>();
const familyLoads = new Map<string, Promise<boolean>>();
const pdfFaces = new Map<string, RemotePdfFontFace>();
const fontDataLoads = new Map<string, Promise<Uint8Array | null>>();

function familyKey(fontFamily: string | null | undefined): string {
  return normalizeFamily(fontFamily).toLowerCase();
}

export function isRemoteWebFontActive(
  fontFamily: string | null | undefined,
): boolean {
  return activeFamilies.has(familyKey(fontFamily));
}

function cdnFontsSlug(family: string): string {
  return family
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function providerUrls(family: string): string[] {
  const googleFamily = encodeURIComponent(family).replace(/%20/g, "+");
  return [
    `https://fonts.googleapis.com/css2?family=${googleFamily}&display=swap`,
    `https://fonts.cdnfonts.com/css/${cdnFontsSlug(family)}`,
  ];
}

function faceKey(family: string, bold: boolean, italic: boolean): string {
  return `${family.toLowerCase()}|${bold ? "b" : ""}${italic ? "i" : ""}`;
}

function cssValue(block: string, property: string): string | undefined {
  return new RegExp(`${property}\\s*:\\s*([^;]+)`, "i")
    .exec(block)?.[1]
    ?.trim();
}

function parseRemoteFaceSources(
  css: string,
  stylesheetUrl: string,
): Array<{ bold: boolean; italic: boolean; url: string }> {
  const result: Array<{ bold: boolean; italic: boolean; url: string }> = [];
  for (const match of css.matchAll(/@font-face\s*\{([^}]+)\}/gi)) {
    const block = match[1] ?? "";
    const source = cssValue(block, "src");
    const urls = Array.from(
      source?.matchAll(/url\(\s*(['"]?)([^'"\s)]+)\1\s*\)/gi) ?? [],
    );
    const fontUrl = urls.at(-1)?.[2];
    if (!fontUrl) continue;
    const weight = cssValue(block, "font-weight") ?? "400";
    const style = cssValue(block, "font-style") ?? "normal";
    result.push({
      bold: /(^|\s)([6-9]00|bold)(\s|$)/i.test(weight),
      italic: /italic|oblique/i.test(style),
      url: new URL(fontUrl, stylesheetUrl).href,
    });
  }
  return result;
}

function loadDecodedFontData(url: string): Promise<Uint8Array | null> {
  let load = fontDataLoads.get(url);
  if (!load) {
    load = (async (): Promise<Uint8Array | null> => {
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const source = new Uint8Array(await response.arrayBuffer());
        const decoded = await defaultFontDecoderRegistry.decode(source);
        SfntFontProgram.parse(decoded);
        return decoded;
      } catch {
        return null;
      }
    })();
    fontDataLoads.set(url, load);
  }
  return load;
}

async function cachePdfFaces(
  family: string,
  stylesheetUrl: string,
): Promise<void> {
  try {
    const response = await fetch(stylesheetUrl);
    if (!response.ok) return;
    const sources = parseRemoteFaceSources(
      await response.text(),
      stylesheetUrl,
    );
    const selected = new Map<string, (typeof sources)[number]>();
    for (const source of sources) {
      selected.set(faceKey(family, source.bold, source.italic), source);
    }
    for (const source of selected.values()) {
      const fontData = await loadDecodedFontData(source.url);
      if (!fontData) continue;
      const program = SfntFontProgram.parse(fontData);
      pdfFaces.set(faceKey(family, source.bold, source.italic), {
        family,
        bold: source.bold,
        italic: source.italic,
        fontData,
        postscriptName: program.metadata.postscriptName || undefined,
      });
    }
  } catch {
    // Browser rendering can still use the stylesheet when PDF byte access fails.
  }
}

function loadStylesheet(url: string): Promise<HTMLLinkElement | null> {
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.crossOrigin = "anonymous";
    link.onload = (): void => resolve(link);
    link.onerror = (): void => {
      link.remove();
      resolve(null);
    };
    document.head.append(link);
  });
}

async function tryProvider(family: string, url: string): Promise<boolean> {
  const link = await loadStylesheet(url);
  if (!link) return false;
  try {
    const escapedFamily = family.replace(/["\\]/g, "\\$&");
    const faces = await document.fonts.load(
      `400 16px "${escapedFamily}"`,
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789áéíóúç",
    );
    if (faces.length > 0) return true;
  } catch {
    // Try the next fixed provider below.
  }
  link.remove();
  return false;
}

async function loadFamily(family: string): Promise<boolean> {
  for (const url of providerUrls(family)) {
    if (await tryProvider(family, url)) {
      await cachePdfFaces(family, url);
      activeFamilies.add(family.toLowerCase());
      fontLogger.info("remote:loaded", { family, stylesheet: url });
      return true;
    }
  }
  fontLogger.info("remote:unavailable", { family });
  return false;
}

/**
 * Loads unbundled document fonts from fixed, HTTPS-only providers. Requests are
 * browser-only, lazy, and deduplicated for the page lifetime. A failed request
 * is non-fatal: the existing bundled metric substitute remains active.
 */
export async function loadRemoteWebFonts(
  families: Iterable<string | null | undefined>,
): Promise<boolean> {
  if (typeof document === "undefined" || !document.fonts || !document.head) {
    return false;
  }

  const loads: Promise<boolean>[] = [];
  for (const fontFamily of families) {
    const family = normalizeFamily(fontFamily);
    const key = family.toLowerCase();
    if (
      !family ||
      family === "Helvetica" ||
      isBundledMetricFontFamily(family) ||
      activeFamilies.has(key)
    ) {
      continue;
    }
    let load = familyLoads.get(key);
    if (!load) {
      load = loadFamily(family);
      familyLoads.set(key, load);
    }
    loads.push(load);
  }

  if (loads.length === 0) return false;
  const results = await Promise.all(loads);
  return results.some(Boolean);
}

/** Returns decoded SFNT data already requested by the browser font loader. */
export async function getRemotePdfFontFaces(
  families: Iterable<string | null | undefined>,
): Promise<RemotePdfFontFace[]> {
  const normalized = Array.from(families, normalizeFamily);
  await Promise.all(
    normalized.map(
      (family): Promise<boolean> =>
        familyLoads.get(family.toLowerCase()) ?? Promise.resolve(false),
    ),
  );

  const result: RemotePdfFontFace[] = [];
  for (const family of normalized) {
    const exact = [
      pdfFaces.get(faceKey(family, false, false)),
      pdfFaces.get(faceKey(family, true, false)),
      pdfFaces.get(faceKey(family, false, true)),
      pdfFaces.get(faceKey(family, true, true)),
    ];
    const regular = exact[0] ?? exact.find(Boolean);
    if (!regular) continue;
    for (let index = 0; index < exact.length; index += 1) {
      const face = exact[index] ?? regular;
      result.push({
        ...face,
        bold: index === 1 || index === 3,
        italic: index === 2 || index === 3,
      });
    }
  }
  return result;
}
