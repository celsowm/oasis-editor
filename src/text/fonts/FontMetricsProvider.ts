import {
  faceStyleKey,
  loadFontAsset,
  OFFICE_COMPAT_FONT_FAMILIES,
  readOriginalFontAsset,
  ROBOTO_FONT_FILES,
  readFontAssetSync,
  resolveMetricCompatibleFamily,
  type FontFaceFiles,
} from "../../export/pdf/fonts/officeFontAssets.js";
import { createEditorLogger } from "../../utils/logger.js";
import { SfntFontProgram } from "./sfnt/SfntFontProgram.js";

/**
 * Synchronous source of glyph advance widths for the layout engine, backed by
 * the bundled metric-compatible fonts (Carlito≈Calibri, Arimo≈Arial,
 * Tinos≈Times New Roman, Roboto as the universal fallback).
 *
 * Because these fonts are metric-compatible with the Office fonts they stand in
 * for, advance widths match Microsoft Word — and, being parsed from the same
 * bytes everywhere, they are identical in Node and the browser, which makes
 * text layout deterministic across environments.
 */
export interface FontMetricsProvider {
  /**
   * Advance width in CSS pixels for a code point in the resolved face, or
   * `null` when no metric face can supply it (font bytes not yet available, or
   * the resolved face has no glyph for the code point — e.g. CJK/emoji). The
   * caller then falls back to a heuristic.
   */
  getAdvanceWidthPx(
    family: string | null | undefined,
    bold: boolean,
    italic: boolean,
    codePoint: number,
    fontSizePx: number,
  ): number | null;

  /**
   * The face's natural single-spacing line height in CSS pixels (`ascender −
   * descender + lineGap`), or `null` when no metric face is available. Used to
   * locate the top of rendered text within a spaced line box.
   */
  getNaturalLineHeightPx(
    family: string | null | undefined,
    bold: boolean,
    italic: boolean,
    fontSizePx: number,
  ): number | null;

  /**
   * Word/PDF text-top offset in CSS pixels for the resolved face, or `null`
   * when no metric face is available.
   */
  getWordTextTopOffsetPx(
    family: string | null | undefined,
    bold: boolean,
    italic: boolean,
    fontSizePx: number,
  ): number | null;
}

const familyFileCache = new Map<string, FontFaceFiles>();
const fontLogger = createEditorLogger("fonts");

/** Resolves an editor font family to the bundled face files, falling back to Roboto. */
function resolveFaceFiles(family: string | null | undefined): FontFaceFiles {
  const normalized = resolveMetricCompatibleFamily(family).toLowerCase();
  const cached = familyFileCache.get(normalized);
  if (cached) {
    return cached;
  }
  let files = ROBOTO_FONT_FILES;
  for (const definition of OFFICE_COMPAT_FONT_FAMILIES) {
    const names = [definition.family, ...definition.aliases].map((name) =>
      name.toLowerCase(),
    );
    if (names.includes(normalized)) {
      files = definition.files;
      break;
    }
  }
  familyFileCache.set(normalized, files);
  return files;
}

function registerBrowserFontFace(
  family: string,
  style: keyof FontFaceFiles,
  bytes: Uint8Array,
): Promise<{
  family: string;
  style: keyof FontFaceFiles;
  status: "loaded" | "unsupported" | "failed";
  error?: string;
}> {
  if (
    typeof document === "undefined" ||
    typeof FontFace === "undefined" ||
    !document.fonts
  ) {
    return Promise.resolve({ family, style, status: "unsupported" });
  }

  const source = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(source).set(bytes);
  const fontFace = new FontFace(family, source, {
    style: style === "italic" || style === "bolditalic" ? "italic" : "normal",
    weight: style === "bold" || style === "bolditalic" ? "700" : "400",
  });
  document.fonts.add(fontFace);
  return fontFace.load().then(
    () => ({ family, style, status: "loaded" }),
    (error: unknown) => ({
      family,
      style,
      status: "failed",
      error: String(error),
    }),
  );
}

class BundledFontMetricsProvider implements FontMetricsProvider {
  // null = load attempted and failed/unavailable (don't retry every call).
  private readonly parsedFonts = new Map<string, SfntFontProgram | null>();

  getAdvanceWidthPx(
    family: string | undefined,
    bold: boolean,
    italic: boolean,
    codePoint: number,
    fontSizePx: number,
  ): number | null {
    const fileName = resolveFaceFiles(family)[faceStyleKey(bold, italic)];
    const font = this.getFont(fileName);
    if (!font || !font.hasGlyphForCodePoint(codePoint)) {
      return null;
    }
    return (
      (font.advanceWidthForCodePoint(codePoint) / font.unitsPerEm) * fontSizePx
    );
  }

  getNaturalLineHeightPx(
    family: string | null | undefined,
    bold: boolean,
    italic: boolean,
    fontSizePx: number,
  ): number | null {
    const fileName = resolveFaceFiles(family)[faceStyleKey(bold, italic)];
    const font = this.getFont(fileName);
    return font ? font.naturalLineHeightPx(fontSizePx) : null;
  }

  getWordTextTopOffsetPx(
    family: string | null | undefined,
    bold: boolean,
    italic: boolean,
    fontSizePx: number,
  ): number | null {
    const fileName = resolveFaceFiles(family)[faceStyleKey(bold, italic)];
    const font = this.getFont(fileName);
    return font ? font.wordTextTopOffsetPx(fontSizePx) : null;
  }

  /** Parses and caches already-loaded bytes (used by the browser preloader). */
  ingest(fileName: string, bytes: Uint8Array): void {
    if (this.parsedFonts.has(fileName)) {
      return;
    }
    this.parsedFonts.set(fileName, tryParse(bytes));
  }

  private getFont(fileName: string): SfntFontProgram | null {
    const cached = this.parsedFonts.get(fileName);
    if (cached !== undefined) {
      return cached;
    }
    // Node: load synchronously on first use. Browser: returns null until the
    // preloader has called ingest() for this file.
    const bytes = readFontAssetSync(fileName);
    const parsed = bytes ? tryParse(bytes) : null;
    this.parsedFonts.set(fileName, parsed);
    return parsed;
  }
}

function tryParse(bytes: Uint8Array): SfntFontProgram | null {
  try {
    return SfntFontProgram.parse(bytes);
  } catch {
    return null;
  }
}

const sharedProvider = new BundledFontMetricsProvider();

export function getFontMetricsProvider(): FontMetricsProvider {
  return sharedProvider;
}

/**
 * Loads (and parses) the bundled faces for the given families so that
 * {@link FontMetricsProvider.getAdvanceWidthPx} resolves synchronously in the
 * browser. Call this before the first layout/mount. In Node it is unnecessary
 * (synchronous `fs` loading covers it) but harmless.
 */
export async function preloadLayoutFonts(
  families?: Iterable<string | null | undefined>,
): Promise<void> {
  const requestedFamilies = families ? Array.from(families) : null;
  const startedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const fontFaces = new Map<
    string,
    { fileName: string; familyNames: Set<string>; style: keyof FontFaceFiles }
  >();
  const collect = (familyNames: string[], files: FontFaceFiles): void => {
    for (const [style, fileName] of Object.entries(files) as Array<
      [keyof FontFaceFiles, string]
    >) {
      const entry = fontFaces.get(fileName) ?? {
        fileName,
        familyNames: new Set<string>(),
        style,
      };
      for (const familyName of familyNames) {
        entry.familyNames.add(familyName);
      }
      fontFaces.set(fileName, entry);
    }
  };

  if (requestedFamilies) {
    for (const family of requestedFamilies) {
      const resolved = resolveMetricCompatibleFamily(family ?? undefined);
      collect([resolved], resolveFaceFiles(resolved));
    }
  } else {
    for (const definition of OFFICE_COMPAT_FONT_FAMILIES) {
      collect([definition.family], definition.files);
    }
    collect(["Roboto"], ROBOTO_FONT_FILES);
  }

  fontLogger.info("preload:start", {
    requestedFamilies: requestedFamilies?.map((family) => family ?? null),
    faceCount: fontFaces.size,
    faces: Array.from(fontFaces.values()).map((entry) => ({
      fileName: entry.fileName,
      style: entry.style,
      familyNames: Array.from(entry.familyNames),
    })),
  });

  const results = await Promise.all(
    Array.from(fontFaces.values(), async (entry) => {
      const bytes = await loadFontAsset(entry.fileName);
      if (!bytes) {
        return {
          fileName: entry.fileName,
          style: entry.style,
          bytes: 0,
          registrations: Array.from(entry.familyNames).map((family) => ({
            family,
            style: entry.style,
            status: "failed" as const,
            error: "font asset returned no bytes",
          })),
        };
      }
      sharedProvider.ingest(entry.fileName, bytes);
      const originalBytes = readOriginalFontAsset(entry.fileName) ?? bytes;
      const registrations = await Promise.all(
        Array.from(entry.familyNames, (familyName) =>
          registerBrowserFontFace(familyName, entry.style, originalBytes),
        ),
      );
      return {
        fileName: entry.fileName,
        style: entry.style,
        bytes: bytes.byteLength,
        registrations,
      };
    }),
  );
  const finishedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  fontLogger.info("preload:done", {
    durationMs: Math.round((finishedAt - startedAt) * 100) / 100,
    results,
    documentFontsStatus:
      typeof document !== "undefined" && document.fonts
        ? document.fonts.status
        : "unavailable",
  });
}
