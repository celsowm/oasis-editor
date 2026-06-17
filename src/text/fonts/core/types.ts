import type {
  Os2VerticalMetrics,
  VerticalMetrics,
} from "@/text/truetype/tableParsers.js";

export type FontFormat = "ttf" | "woff2";

export interface FontDecoder {
  readonly format: FontFormat;
  canDecode(bytes: Uint8Array): boolean;
  decode(bytes: Uint8Array): Promise<Uint8Array>;
  decodeSync?(bytes: Uint8Array): Uint8Array;
}

export interface GlyphInfo {
  readonly id: number;
  readonly codePoints: number[];
  readonly advanceWidth: number;
}

export interface GlyphPosition {
  readonly xAdvance: number;
}

export interface GlyphRun {
  readonly glyphs: GlyphInfo[];
  readonly positions: GlyphPosition[];
  readonly advanceWidth: number;
}

export interface FontMetadata {
  readonly postscriptName: string;
  readonly bbox: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
  readonly ascent: number;
  readonly descent: number;
  readonly capHeight: number;
  readonly xHeight: number;
  readonly italicAngle: number;
  readonly isFixedPitch: boolean;
  readonly macStyleBold: boolean;
  readonly macStyleItalic: boolean;
  readonly familyClass: number;
}

export interface ParsedFontProgram {
  readonly sfntBytes: Uint8Array;
  readonly unitsPerEm: number;
  readonly verticalMetrics: VerticalMetrics;
  readonly os2VerticalMetrics: Os2VerticalMetrics | null;
  readonly metadata: FontMetadata;
  readonly glyphCount: number;
  glyphForCodePoint(codePoint: number): number;
  hasGlyphForCodePoint(codePoint: number): boolean;
  advanceWidthForGlyph(glyphId: number): number;
  getRawTableData(tag: string): Uint8Array | null;
}

export interface TextLayouter {
  layout(text: string): GlyphRun;
}

export interface FontSubset {
  readonly fontFile: Uint8Array;
  readonly widths: number[];
  readonly unicode: number[][];
  encodeGlyph(glyphId: number): number;
}

export interface FontSubsetter {
  createSubset(
    font: ParsedFontProgram,
    glyphs: Iterable<GlyphInfo>,
  ): FontSubset;
}

export interface PdfEmbeddableFont {
  readonly program: ParsedFontProgram;
  readonly layouter: TextLayouter;
  readonly subsetter: FontSubsetter;
}
