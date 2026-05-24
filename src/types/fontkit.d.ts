declare module "fontkit" {
  export interface FontkitGlyph {
    id: number;
    advanceWidth: number;
    codePoints: number[];
  }

  export interface FontkitPosition {
    xAdvance: number;
    yAdvance: number;
    xOffset: number;
    yOffset: number;
    advanceWidth?: number;
  }

  export interface FontkitGlyphRun {
    glyphs: FontkitGlyph[];
    positions: FontkitPosition[];
    advanceWidth: number;
  }

  export interface FontkitSubset {
    cff?: unknown;
    includeGlyph(glyph: number | FontkitGlyph): number;
    encode(): Uint8Array;
  }

  export interface FontkitFont {
    postscriptName?: string;
    unitsPerEm: number;
    ascent: number;
    descent: number;
    xHeight?: number;
    capHeight?: number;
    lineGap?: number;
    italicAngle?: number;
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
    post?: { isFixedPitch?: boolean };
    head?: { macStyle?: { italic?: boolean } };
    "OS/2"?: { sFamilyClass?: number };
    createSubset(): FontkitSubset;
    getGlyph(id: number): FontkitGlyph;
    layout(text: string, features?: string[] | Record<string, boolean>): FontkitGlyphRun;
    hasGlyphForCodePoint?(codePoint: number): boolean;
  }

  export function create(buffer: Uint8Array | ArrayBuffer, postscriptName?: string | null): FontkitFont;
}
