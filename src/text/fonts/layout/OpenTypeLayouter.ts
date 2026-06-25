import type {
  GlyphInfo,
  GlyphPosition,
  GlyphRun,
  ParsedFontProgram,
  TextLayouter,
} from "@/text/fonts/core/types.js";
import {
  GsubTable,
  type ShapingGlyph,
} from "@/text/fonts/opentype/GsubTable.js";

/**
 * A {@link TextLayouter} that applies OpenType GSUB substitution for the editor's
 * Latin font features (ligatures, figure style, stylistic sets, contextual
 * alternates) when the font carries a GSUB table and the caller requests them.
 *
 * With no requested features — or a font without GSUB — it falls straight back to
 * the same 1:1 codepoint→glyph mapping as `SimpleTextLayouter`, so ordinary text
 * is byte-for-byte unchanged. GSUB only substitutes glyphs; advances come from
 * `hmtx` (GPOS positioning is out of scope), so `positions[].xAdvance` equals each
 * resulting glyph's advance width.
 */
export class OpenTypeLayouter implements TextLayouter {
  private readonly gsub: GsubTable | null;

  constructor(private readonly font: ParsedFontProgram) {
    const raw = font.getRawTableData("GSUB");
    this.gsub = raw ? GsubTable.parse(raw) : null;
  }

  /** True when the font exposes a GSUB table the shaper could use. */
  get hasGsub(): boolean {
    return this.gsub !== null;
  }

  layout(text: string, features?: readonly string[]): GlyphRun {
    const buffer: ShapingGlyph[] = [];
    for (const char of text) {
      const codePoint = char.codePointAt(0) ?? 0xfffd;
      const glyphId = this.font.glyphForCodePoint(codePoint);
      buffer.push({
        id: glyphId,
        codePoints: glyphId === 0 ? [0xfffd] : [codePoint],
      });
    }

    if (this.gsub && features && features.length > 0) {
      this.gsub.shape(buffer, features);
    }

    const glyphs: GlyphInfo[] = [];
    const positions: GlyphPosition[] = [];
    let advanceWidth = 0;
    for (const glyph of buffer) {
      const glyphAdvance = this.font.advanceWidthForGlyph(glyph.id);
      glyphs.push({
        id: glyph.id,
        codePoints: glyph.codePoints,
        advanceWidth: glyphAdvance,
      });
      positions.push({ xAdvance: glyphAdvance });
      advanceWidth += glyphAdvance;
    }

    return { glyphs, positions, advanceWidth };
  }
}
