/**
 * Contract for a source of horizontal glyph advance widths.
 *
 * Implementations expose just enough of a font's metrics to drive text layout:
 * the design grid (`unitsPerEm`) and the advance width of any Unicode code
 * point. Consumers depend on this interface rather than a concrete parser, so
 * the layout engine stays decoupled from the TrueType binary format.
 */
export interface AdvanceWidthSource {
  /** Font design units per em (from the `head` table), e.g. 2048 or 1000. */
  readonly unitsPerEm: number;

  /**
   * Advance width, in font design units, for a Unicode code point. Returns the
   * `.notdef` (glyph 0) advance when the code point is not mapped by the font.
   */
  advanceWidthForCodePoint(codePoint: number): number;

  /** True when the font's `cmap` maps this code point to a non-zero glyph id. */
  hasGlyphForCodePoint(codePoint: number): boolean;
}
