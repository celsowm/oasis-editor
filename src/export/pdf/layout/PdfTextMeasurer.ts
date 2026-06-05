export interface PdfTextMeasureOptions {
  text: string;
  fontFamily?: string | null;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
}

export interface PdfGlyphMeasurement {
  char: string;
  codePoint: number;
  x: number;
  width: number;
  advance: number;
}

export interface PdfTextMeasurement {
  width: number;
  glyphs: PdfGlyphMeasurement[];
}

const WIDTH_UNITS_PER_EM = 1000;

// Widths are PDF Type 1 Helvetica-compatible glyph widths in 1/1000 em units
// for the ASCII range the current writer can reliably encode. Unknown glyphs
// intentionally go through a deterministic fallback so layout stays O(n) and
// stable until embedded fonts / full shaping are introduced.
const HELVETICA_WIDTHS: Record<string, number> = {
  " ": 278,
  "!": 278,
  '"': 355,
  "#": 556,
  $: 556,
  "%": 889,
  "&": 667,
  "'": 191,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  "0": 556,
  "1": 556,
  "2": 556,
  "3": 556,
  "4": 556,
  "5": 556,
  "6": 556,
  "7": 556,
  "8": 556,
  "9": 556,
  ":": 278,
  ";": 278,
  "<": 584,
  "=": 584,
  ">": 584,
  "?": 556,
  "@": 1015,
  A: 667,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 500,
  K: 667,
  L: 556,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  "[": 278,
  "\\": 278,
  "]": 278,
  "^": 469,
  _: 556,
  "`": 333,
  a: 556,
  b: 556,
  c: 500,
  d: 556,
  e: 556,
  f: 278,
  g: 556,
  h: 556,
  i: 222,
  j: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  q: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 500,
  "{": 334,
  "|": 260,
  "}": 334,
  "~": 584,
};

const SYMBOL_WIDTHS: Record<string, number> = {
  "•": 350,
  "○": 600,
  "▪": 350,
};

function fallbackGlyphWidthUnits(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0;

  if (/\s/u.test(char)) {
    return 278;
  }
  if (codePoint >= 0x300 && codePoint <= 0x36f) {
    return 0;
  }
  if (codePoint >= 0x4e00 && codePoint <= 0x9fff) {
    return 1000;
  }
  if (codePoint > 0xffff) {
    return 1000;
  }
  return 556;
}

function glyphWidthUnits(char: string): number {
  return (
    HELVETICA_WIDTHS[char] ??
    SYMBOL_WIDTHS[char] ??
    fallbackGlyphWidthUnits(char)
  );
}

function cacheKey(options: PdfTextMeasureOptions): string {
  return [
    options.fontFamily ?? "Helvetica",
    options.fontSize,
    options.bold ? "1" : "0",
    options.italic ? "1" : "0",
    options.text,
  ].join("\u0000");
}

export class PdfTextMeasurer {
  private readonly cache = new Map<string, PdfTextMeasurement>();

  measureText(options: PdfTextMeasureOptions): PdfTextMeasurement {
    if (options.text.length === 0 || options.fontSize <= 0) {
      return { width: 0, glyphs: [] };
    }

    const key = cacheKey(options);
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    let x = 0;
    const glyphs: PdfGlyphMeasurement[] = [];
    for (const char of options.text) {
      const width =
        (glyphWidthUnits(char) / WIDTH_UNITS_PER_EM) * options.fontSize;
      const glyph: PdfGlyphMeasurement = {
        char,
        codePoint: char.codePointAt(0) ?? 0,
        x,
        width,
        advance: width,
      };
      glyphs.push(glyph);
      x += glyph.advance;
    }

    const measurement = { width: x, glyphs };
    this.cache.set(key, measurement);
    return measurement;
  }

  measureTextWidth(options: PdfTextMeasureOptions): number {
    return this.measureText(options).width;
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}
