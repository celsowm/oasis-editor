import type { BinaryReader } from "./BinaryReader.js";
import { TrueTypeParseError } from "./TrueTypeParseError.js";

/** Reads `unitsPerEm` from the `head` table (located at byte offset 18). */
export function parseHeadUnitsPerEm(
  reader: BinaryReader,
  offset: number,
): number {
  reader.seek(offset + 18);
  const unitsPerEm = reader.u16();
  if (unitsPerEm === 0) {
    throw new TrueTypeParseError("head.unitsPerEm is zero");
  }
  return unitsPerEm;
}

/**
 * Reads `numberOfHMetrics` (the count of long horizontal metrics) from the
 * `hhea` table (located at byte offset 34).
 */
export function parseHheaNumberOfHMetrics(
  reader: BinaryReader,
  offset: number,
): number {
  reader.seek(offset + 34);
  return reader.u16();
}

/** The font's vertical metrics, in font design units. */
export interface VerticalMetrics {
  /** Distance from the baseline to the top of the em box (`hhea.ascender`). */
  ascent: number;
  /** Distance from the baseline to the bottom (`hhea.descender`, negative). */
  descent: number;
  /** Recommended extra spacing between lines (`hhea.lineGap`). */
  lineGap: number;
}

/** OS/2 metrics Word uses to position text within a line box. */
export interface Os2VerticalMetrics {
  /** Typographic ascender (`OS/2.sTypoAscender`). */
  typoAscender: number;
  /** Windows ascender (`OS/2.usWinAscent`). */
  winAscent: number;
}

/**
 * Reads the vertical metrics from the `hhea` table: `ascender` (offset 4),
 * `descender` (offset 6) and `lineGap` (offset 8), all signed font units.
 */
export function parseHheaVerticalMetrics(
  reader: BinaryReader,
  offset: number,
): VerticalMetrics {
  reader.seek(offset + 4);
  const ascent = reader.i16();
  const descent = reader.i16();
  const lineGap = reader.i16();
  return { ascent, descent, lineGap };
}

/**
 * Reads the OS/2 vertical metrics needed to locate the rendered text top.
 * Returns `null` for very old/incomplete fonts that do not expose these fields.
 */
export function parseOs2VerticalMetrics(
  reader: BinaryReader,
  offset: number,
  length: number,
): Os2VerticalMetrics | null {
  if (length < 78) {
    return null;
  }
  reader.seek(offset + 68);
  const typoAscender = reader.i16();
  reader.skip(4); // sTypoDescender (i16) + sTypoLineGap (i16)
  const winAscent = reader.u16();
  return { typoAscender, winAscent };
}

/** Reads `numGlyphs` from the `maxp` table (located at byte offset 4). */
export function parseMaxpNumGlyphs(
  reader: BinaryReader,
  offset: number,
): number {
  reader.seek(offset + 4);
  return reader.u16();
}

/**
 * Builds a glyph-id → advance-width lookup from the `hmtx` table.
 *
 * `hmtx` stores `numberOfHMetrics` `longHorMetric` records (advanceWidth:u16,
 * lsb:i16). Glyph ids at or beyond that count reuse the *last* record's advance
 * — the trailing-run convention used by fonts with a monospaced glyph tail.
 */
export function parseHmtxAdvances(
  reader: BinaryReader,
  offset: number,
  numberOfHMetrics: number,
): (glyphId: number) => number {
  if (numberOfHMetrics <= 0) {
    throw new TrueTypeParseError("hhea.numberOfHMetrics must be positive");
  }
  const advances = new Uint16Array(numberOfHMetrics);
  reader.seek(offset);
  for (let index = 0; index < numberOfHMetrics; index += 1) {
    advances[index] = reader.u16(); // advanceWidth
    reader.skip(2); // lsb (i16) — unused for advance widths
  }
  const lastIndex = numberOfHMetrics - 1;
  return (glyphId: number): number => {
    const clamped = glyphId < lastIndex ? glyphId : lastIndex;
    return advances[clamped < 0 ? 0 : clamped]!;
  };
}
