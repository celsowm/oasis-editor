import type { AdvanceWidthSource } from "./AdvanceWidthSource.js";
import { BinaryReader } from "./BinaryReader.js";
import { type CmapSubtable, parseCmap } from "./CmapParser.js";
import { SfntTableDirectory } from "./SfntTableDirectory.js";
import {
  parseHeadUnitsPerEm,
  parseHheaNumberOfHMetrics,
  parseHheaVerticalMetrics,
  parseHmtxAdvances,
  parseMaxpNumGlyphs,
  parseOs2VerticalMetrics,
  type Os2VerticalMetrics,
  type VerticalMetrics,
} from "./tableParsers.js";

/**
 * A minimal TrueType/OpenType font parser that exposes horizontal advance
 * widths. It reads only the tables needed for text measurement
 * (`head`, `hhea`, `maxp`, `hmtx`, `cmap`) — no glyph outlines, no kerning.
 *
 * Construct via {@link TrueTypeFont.parse}; it throws {@link TrueTypeParseError}
 * on malformed or unsupported fonts so callers can fall back gracefully.
 */
export class TrueTypeFont implements AdvanceWidthSource {
  private constructor(
    readonly unitsPerEm: number,
    readonly verticalMetrics: VerticalMetrics,
    private readonly os2VerticalMetrics: Os2VerticalMetrics | null,
    private readonly cmap: CmapSubtable,
    private readonly advanceForGlyph: (glyphId: number) => number,
  ) {}

  static parse(bytes: Uint8Array): TrueTypeFont {
    const reader = new BinaryReader(bytes);
    const directory = SfntTableDirectory.parse(reader);

    const unitsPerEm = parseHeadUnitsPerEm(
      reader,
      directory.requireTable("head").offset,
    );
    const hheaOffset = directory.requireTable("hhea").offset;
    const numberOfHMetrics = parseHheaNumberOfHMetrics(reader, hheaOffset);
    const verticalMetrics = parseHheaVerticalMetrics(reader, hheaOffset);
    const os2Table = directory.getTable("OS/2");
    const os2VerticalMetrics = os2Table
      ? parseOs2VerticalMetrics(reader, os2Table.offset, os2Table.length)
      : null;
    parseMaxpNumGlyphs(reader, directory.requireTable("maxp").offset);
    const advanceForGlyph = parseHmtxAdvances(
      reader,
      directory.requireTable("hmtx").offset,
      numberOfHMetrics,
    );
    const cmap = parseCmap(reader, directory.requireTable("cmap").offset);

    return new TrueTypeFont(
      unitsPerEm,
      verticalMetrics,
      os2VerticalMetrics,
      cmap,
      advanceForGlyph,
    );
  }

  /**
   * The font's natural (single-spacing) line height in px — `ascender −
   * descender + lineGap` scaled to the font size. This is the em box Word lays
   * a line of text into before any line-spacing multiple is applied.
   */
  naturalLineHeightPx(fontSizePx: number): number {
    const { ascent, descent, lineGap } = this.verticalMetrics;
    return ((ascent - descent + lineGap) / this.unitsPerEm) * fontSizePx;
  }

  /**
   * Distance from the line-box top to the top of the rendered text in Word's
   * PDF output. Word places the baseline at `usWinAscent`; the parity PDF
   * extractor reports the typographic text top from the font descriptor
   * ascender, so the delta is stable regardless of paragraph line spacing or
   * docGrid snapping.
   */
  wordTextTopOffsetPx(fontSizePx: number): number {
    if (!this.os2VerticalMetrics) {
      return 0;
    }
    const { winAscent, typoAscender } = this.os2VerticalMetrics;
    return (
      (Math.max(0, winAscent - typoAscender) / this.unitsPerEm) * fontSizePx
    );
  }

  advanceWidthForCodePoint(codePoint: number): number {
    return this.advanceForGlyph(this.cmap.glyphForCodePoint(codePoint));
  }

  hasGlyphForCodePoint(codePoint: number): boolean {
    return this.cmap.glyphForCodePoint(codePoint) !== 0;
  }
}
