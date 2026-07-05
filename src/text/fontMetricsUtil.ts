import type {
  Os2VerticalMetrics,
  VerticalMetrics,
} from "@/text/truetype/tableParsers.js";

/**
 * The font's natural (single-spacing) line height in px — `ascender −
 * descender + lineGap` scaled to the font size. This is the em box Word lays
 * a line of text into before any line-spacing multiple is applied.
 */
export function computeNaturalLineHeightPx(
  verticalMetrics: VerticalMetrics,
  unitsPerEm: number,
  fontSizePx: number,
): number {
  const { ascent, descent, lineGap } = verticalMetrics;
  return ((ascent - descent + lineGap) / unitsPerEm) * fontSizePx;
}

/**
 * Distance from the line-box top to the top of the rendered text in Word's
 * PDF output. Word places the baseline at `usWinAscent`; the parity PDF
 * extractor reports the typographic text top from the font descriptor
 * ascender, so the delta is stable regardless of paragraph line spacing or
 * docGrid snapping.
 */
export function computeWordTextTopOffsetPx(
  os2VerticalMetrics: Os2VerticalMetrics | null,
  unitsPerEm: number,
  fontSizePx: number,
): number {
  if (!os2VerticalMetrics) {
    return 0;
  }
  const { winAscent, typoAscender } = os2VerticalMetrics;
  return (Math.max(0, winAscent - typoAscender) / unitsPerEm) * fontSizePx;
}
