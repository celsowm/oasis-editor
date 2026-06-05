import {
  faceStyleKey,
  loadFontAsset,
  normalizeFamily,
  OFFICE_COMPAT_FONT_FAMILIES,
  ROBOTO_FONT_FILES,
  readFontAssetSync,
  type FontFaceFiles,
} from "../../export/pdf/fonts/officeFontAssets.js";
import { TrueTypeFont } from "../truetype/TrueTypeFont.js";

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

/** Resolves an editor font family to the bundled face files, falling back to Roboto. */
function resolveFaceFiles(family: string | null | undefined): FontFaceFiles {
  const normalized = normalizeFamily(family).toLowerCase();
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

class BundledFontMetricsProvider implements FontMetricsProvider {
  // null = load attempted and failed/unavailable (don't retry every call).
  private readonly parsedFonts = new Map<string, TrueTypeFont | null>();

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

  private getFont(fileName: string): TrueTypeFont | null {
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

function tryParse(bytes: Uint8Array): TrueTypeFont | null {
  try {
    return TrueTypeFont.parse(bytes);
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
  const fileNames = new Set<string>();
  const collect = (files: FontFaceFiles): void => {
    for (const file of Object.values(files)) {
      fileNames.add(file);
    }
  };

  if (families) {
    for (const family of families) {
      collect(resolveFaceFiles(family ?? undefined));
    }
  } else {
    for (const definition of OFFICE_COMPAT_FONT_FAMILIES) {
      collect(definition.files);
    }
    collect(ROBOTO_FONT_FILES);
  }

  await Promise.all(
    Array.from(fileNames, async (fileName) => {
      const bytes = await loadFontAsset(fileName);
      if (bytes) {
        sharedProvider.ingest(fileName, bytes);
      }
    }),
  );
}
