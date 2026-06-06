import type {
  GlyphInfo,
  GlyphPosition,
  GlyphRun,
  ParsedFontProgram,
  TextLayouter,
} from "../core/types.js";

export class SimpleTextLayouter implements TextLayouter {
  constructor(private readonly font: ParsedFontProgram) {}

  layout(text: string): GlyphRun {
    const glyphs: GlyphInfo[] = [];
    const positions: GlyphPosition[] = [];
    let advanceWidth = 0;

    for (const char of text) {
      const codePoint = char.codePointAt(0) ?? 0xfffd;
      const glyphId = this.font.glyphForCodePoint(codePoint);
      const glyphAdvance = this.font.advanceWidthForGlyph(glyphId);
      glyphs.push({
        id: glyphId,
        codePoints: glyphId === 0 ? [0xfffd] : [codePoint],
        advanceWidth: glyphAdvance,
      });
      positions.push({ xAdvance: glyphAdvance });
      advanceWidth += glyphAdvance;
    }

    return { glyphs, positions, advanceWidth };
  }
}
