import type { EditorTextStyle } from "@/core/model.js";
import { getFontMetricsProvider } from "@/text/fonts/FontMetricsProvider.js";
import { PX_PER_POINT } from "./constants.js";
import {
  buildCanvasFont,
  getMeasuredFontSize,
  getRenderedMeasureChar,
} from "./fontMetrics.js";

const TAB_SIZE = 4;

const textMeasureCache = new Map<string, number>();

/**
 * Clears the per-character width cache. Call this after font metrics become
 * available asynchronously (browser preload), so cached heuristic widths are
 * recomputed from the real TrueType metrics.
 */
export function clearTextMeasureCache(): void {
  textMeasureCache.clear();
}

/**
 * Last-ditch advance-width heuristic, used only when no bundled metric face can
 * supply a glyph (e.g. an unbundled family whose CJK/emoji/symbol glyphs even
 * the Roboto fallback lacks). The Calibri/Arial/Times corpus never reaches this
 * path — those go through real TrueType metrics in {@link measureBaseCharacterWidth}.
 */
function measureFallbackCharacterWidth(char: string, fontSize: number): number {
  if (char === " ") {
    return fontSize * 0.35;
  }
  if (char === "\t") {
    return fontSize * 0.35 * TAB_SIZE;
  }
  if (".,;:!'`|ilI".includes(char)) {
    return fontSize * 0.3;
  }
  if ("mwMW@#%&".includes(char)) {
    return fontSize * 0.92;
  }
  if ("0123456789".includes(char)) {
    return fontSize * 0.6;
  }
  if (/[A-Z]/.test(char)) {
    return fontSize * 0.72;
  }
  if (/[a-z]/.test(char)) {
    return fontSize * 0.62;
  }
  // Intentionally matches any non-Latin-1 character (control range included).
  // eslint-disable-next-line no-control-regex
  if (/[^\u0000-\u00ff]/.test(char)) {
    return fontSize;
  }
  return fontSize * 0.66;
}

/**
 * Resolves the raw advance width (px) of a single rendered character from the
 * bundled TrueType metrics, falling back to the heuristic only when no metric
 * face can supply the glyph.
 */
function measureBaseCharacterWidth(
  renderedChar: string,
  styles: EditorTextStyle | undefined,
  fontSize: number,
): number {
  const provider = getFontMetricsProvider();
  const bold = Boolean(styles?.bold);
  const italic = Boolean(styles?.italic);
  const fontFamily = styles?.fontFamily ?? "Calibri";

  if (renderedChar === "\t") {
    // A tab renders as TAB_SIZE spaces; measure one space and scale.
    const space = provider.getAdvanceWidthPx(
      fontFamily,
      bold,
      italic,
      0x20,
      fontSize,
    );
    return space !== null
      ? space * TAB_SIZE
      : measureFallbackCharacterWidth("\t", fontSize);
  }

  const codePoint = renderedChar.codePointAt(0);
  if (codePoint !== undefined) {
    const advance = provider.getAdvanceWidthPx(
      fontFamily,
      bold,
      italic,
      codePoint,
      fontSize,
    );
    if (advance !== null) {
      return advance;
    }
  }

  return measureFallbackCharacterWidth(renderedChar, fontSize);
}

export function measureCharacterWidth(
  char: string,
  styles: EditorTextStyle | undefined,
  fallbackFontSize: number,
): number {
  if (char === "\n") {
    return 0;
  }

  const fontSize = getMeasuredFontSize(styles, fallbackFontSize);
  const font = buildCanvasFont(styles, fallbackFontSize);
  const renderedChar = getRenderedMeasureChar(char, styles);
  const scale =
    styles?.characterScale && styles.characterScale > 0
      ? styles.characterScale / 100
      : 1;
  const spacing = (styles?.characterSpacing ?? 0) * PX_PER_POINT;
  const cacheKey = `${font}|${renderedChar}|${scale}|${spacing}`;
  const cached = textMeasureCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let width = measureBaseCharacterWidth(renderedChar, styles, fontSize);
  width = Math.max(0, width * scale + spacing);
  textMeasureCache.set(cacheKey, width);
  return width;
}
