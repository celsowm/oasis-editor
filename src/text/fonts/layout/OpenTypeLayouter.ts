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
import { GposTable } from "@/text/fonts/opentype/GposTable.js";

/** Feature tags routed to GPOS positioning; everything else drives GSUB. */
const GPOS_FEATURE_TAGS = new Set(["kern"]);

/**
 * A {@link TextLayouter} that applies OpenType shaping for the editor's Latin font
 * features when the font carries the relevant tables and the caller requests them:
 *
 * - **GSUB** glyph substitution — ligatures, figure style, stylistic sets, and
 *   contextual alternates (changes glyph identity and count).
 * - **GPOS** glyph positioning — pair kerning (`kern`), which adjusts horizontal
 *   advances only.
 *
 * With no requested features — or a font without these tables — it falls straight
 * back to the same 1:1 codepoint→glyph mapping as `SimpleTextLayouter`, so ordinary
 * text is byte-for-byte unchanged. Substitution runs first, then kerning adjusts
 * the resulting glyphs' advances (`positions[].xAdvance`); GPOS placement, vertical
 * metrics, and mark attachment are out of scope.
 */
export class OpenTypeLayouter implements TextLayouter {
  private readonly gsub: GsubTable | null;
  private readonly gpos: GposTable | null;

  constructor(private readonly font: ParsedFontProgram) {
    const gsubRaw = font.getRawTableData("GSUB");
    this.gsub = gsubRaw ? GsubTable.parse(gsubRaw) : null;
    const gposRaw = font.getRawTableData("GPOS");
    this.gpos = gposRaw ? GposTable.parse(gposRaw) : null;
  }

  /** True when the font exposes a GSUB table the substitution shaper could use. */
  get hasGsub(): boolean {
    return this.gsub !== null;
  }

  /** True when the font exposes a GPOS table the kerning shaper could use. */
  get hasGpos(): boolean {
    return this.gpos !== null;
  }

  /** True when either shaping table is present (so this layouter adds value). */
  get hasShaping(): boolean {
    return this.gsub !== null || this.gpos !== null;
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

    const gsubTags =
      features?.filter((tag): boolean => !GPOS_FEATURE_TAGS.has(tag)) ?? [];
    const gposTags =
      features?.filter((tag): boolean => GPOS_FEATURE_TAGS.has(tag)) ?? [];

    if (this.gsub && gsubTags.length > 0) {
      this.gsub.shape(buffer, gsubTags);
    }

    const advances = buffer.map((glyph): number =>
      this.font.advanceWidthForGlyph(glyph.id),
    );
    if (this.gpos && gposTags.length > 0) {
      this.gpos.position(
        buffer.map((glyph): number => glyph.id),
        advances,
        gposTags,
      );
    }

    const glyphs: GlyphInfo[] = [];
    const positions: GlyphPosition[] = [];
    let advanceWidth = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const glyph = buffer[i]!;
      const nominalAdvance = this.font.advanceWidthForGlyph(glyph.id);
      const positionedAdvance = advances[i]!;
      glyphs.push({
        id: glyph.id,
        codePoints: glyph.codePoints,
        advanceWidth: nominalAdvance,
      });
      positions.push({ xAdvance: positionedAdvance });
      advanceWidth += positionedAdvance;
    }

    return { glyphs, positions, advanceWidth };
  }
}
