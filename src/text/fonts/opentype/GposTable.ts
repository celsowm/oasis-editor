import { BinaryReader } from "@/text/truetype/BinaryReader.js";
import {
  collectLookupIndices,
  parseClassDef,
  parseCoverage,
  parseLayoutTableHeader,
  parseLookupList,
  readU16OffsetArray,
  type ClassLookup,
} from "@/text/fonts/opentype/otLayoutCommon.js";

/**
 * Minimal OpenType GPOS (glyph positioning) parser + apply engine, scoped to the
 * one Latin positioning feature the editor exposes: pair kerning (`kern`).
 *
 * It parses the shared GSUB/GPOS header (via {@link otLayoutCommon}) and the
 * positioning lookups kerning uses — single adjustment (1), pair adjustment (2),
 * and extension (9). Mark attachment (4/5/6), cursive (3), contextual (7/8),
 * device tables, vertical metrics, and complex-script shaping are intentionally
 * out of scope: only horizontal advance (`xAdvance`) adjustments are applied.
 *
 * Positioning never changes glyph identity, so unlike GSUB it operates on a flat
 * advances array (font design units) keyed by glyph position; it adds each pair's
 * adjustment to the relevant advance. Parsing is defensive — any malformed offset
 * or unsupported construct is skipped — so a broken GPOS can never break export.
 * All offsets are relative to the start of the GPOS table bytes passed to
 * {@link GposTable.parse}.
 */

// ValueRecord format flags (OpenType GPOS).
const X_PLACEMENT = 0x0001;
const Y_PLACEMENT = 0x0002;
const X_ADVANCE = 0x0004;
const Y_ADVANCE = 0x0008;
const X_PLACEMENT_DEVICE = 0x0010;
const Y_PLACEMENT_DEVICE = 0x0020;
const X_ADVANCE_DEVICE = 0x0040;
const Y_ADVANCE_DEVICE = 0x0080;

/**
 * Reads a ValueRecord at the cursor per `valueFormat`, returning only its
 * xAdvance (the editor positions horizontally; placement and vertical fields are
 * read past but ignored, and device-table offsets are skipped).
 */
function readValueRecordXAdvance(
  reader: BinaryReader,
  valueFormat: number,
): number {
  let xAdvance = 0;
  if (valueFormat & X_PLACEMENT) reader.i16();
  if (valueFormat & Y_PLACEMENT) reader.i16();
  if (valueFormat & X_ADVANCE) xAdvance = reader.i16();
  if (valueFormat & Y_ADVANCE) reader.i16();
  if (valueFormat & X_PLACEMENT_DEVICE) reader.u16();
  if (valueFormat & Y_PLACEMENT_DEVICE) reader.u16();
  if (valueFormat & X_ADVANCE_DEVICE) reader.u16();
  if (valueFormat & Y_ADVANCE_DEVICE) reader.u16();
  return xAdvance;
}

/** Byte size of a ValueRecord with the given format (every set flag = 2 bytes). */
function valueRecordSize(valueFormat: number): number {
  let count = 0;
  for (let bit = 0; bit < 8; bit += 1) {
    if (valueFormat & (1 << bit)) count += 1;
  }
  return count * 2;
}

/**
 * One positioning subtable. Attempts to apply at `pos`, mutating `advances`;
 * returns the number of glyphs to advance past on success (1 or 2), or `null`
 * when it does not match.
 */
interface PosSubtable {
  apply(glyphIds: number[], advances: number[], pos: number): number | null;
}

interface GposLookup {
  lookupType: number;
  subtables: PosSubtable[];
}

// --- Lookup subtable parsers -------------------------------------------------

function parseSinglePos(
  reader: BinaryReader,
  offset: number,
): PosSubtable | null {
  reader.seek(offset);
  const format = reader.u16();
  const coverageOffset = offset + reader.u16();
  if (format === 1) {
    const valueFormat = reader.u16();
    const xAdvance = readValueRecordXAdvance(reader, valueFormat);
    const coverage = parseCoverage(reader, coverageOffset);
    if (xAdvance === 0) return null;
    return {
      apply(glyphIds, advances, pos) {
        if (coverage(glyphIds[pos]!) < 0) return null;
        advances[pos]! += xAdvance;
        return 1;
      },
    };
  }
  if (format === 2) {
    const valueFormat = reader.u16();
    const valueCount = reader.u16();
    const recordSize = valueRecordSize(valueFormat);
    const recordsStart = reader.tell();
    const xAdvances = new Array<number>(valueCount);
    for (let i = 0; i < valueCount; i += 1) {
      reader.seek(recordsStart + i * recordSize);
      xAdvances[i] = readValueRecordXAdvance(reader, valueFormat);
    }
    const coverage = parseCoverage(reader, coverageOffset);
    return {
      apply(glyphIds, advances, pos) {
        const index = coverage(glyphIds[pos]!);
        if (index < 0 || index >= valueCount) return null;
        const delta = xAdvances[index]!;
        if (delta === 0) return null;
        advances[pos]! += delta;
        return 1;
      },
    };
  }
  return null;
}

interface PairValue {
  secondGlyph: number;
  value1XAdvance: number;
  value2XAdvance: number;
}

function parsePairPos(
  reader: BinaryReader,
  offset: number,
): PosSubtable | null {
  reader.seek(offset);
  const format = reader.u16();
  const coverageOffset = offset + reader.u16();
  const valueFormat1 = reader.u16();
  const valueFormat2 = reader.u16();
  const hasSecondAdjustment = (valueFormat2 & X_ADVANCE) !== 0;

  if (format === 1) {
    const pairSetCount = reader.u16();
    const pairSetOffsets = readU16OffsetArray(reader, pairSetCount, offset);
    const pairSets: Map<number, PairValue>[] = pairSetOffsets.map(
      (setOffset) => {
        reader.seek(setOffset);
        const pairValueCount = reader.u16();
        const pairs = new Map<number, PairValue>();
        for (let i = 0; i < pairValueCount; i += 1) {
          const secondGlyph = reader.u16();
          const value1XAdvance = readValueRecordXAdvance(reader, valueFormat1);
          const value2XAdvance = readValueRecordXAdvance(reader, valueFormat2);
          pairs.set(secondGlyph, {
            secondGlyph,
            value1XAdvance,
            value2XAdvance,
          });
        }
        return pairs;
      },
    );
    const coverage = parseCoverage(reader, coverageOffset);
    return {
      apply(glyphIds, advances, pos) {
        const second = glyphIds[pos + 1];
        if (second === undefined) return null;
        const setIndex = coverage(glyphIds[pos]!);
        if (setIndex < 0 || setIndex >= pairSets.length) return null;
        const pair = pairSets[setIndex]!.get(second);
        if (!pair) return null;
        advances[pos]! += pair.value1XAdvance;
        advances[pos + 1]! += pair.value2XAdvance;
        return hasSecondAdjustment ? 2 : 1;
      },
    };
  }

  if (format === 2) {
    const classDef1Offset = offset + reader.u16();
    const classDef2Offset = offset + reader.u16();
    const class1Count = reader.u16();
    const class2Count = reader.u16();
    const value1Size = valueRecordSize(valueFormat1);
    const value2Size = valueRecordSize(valueFormat2);
    const cellSize = value1Size + value2Size;
    const matrixStart = reader.tell();
    // Class1Record[class1Count] × Class2Record[class2Count]; each cell holds
    // value1 then value2. We pull just the xAdvance pair from every cell.
    const value1 = new Array<number>(class1Count * class2Count);
    const value2 = new Array<number>(class1Count * class2Count);
    for (let c1 = 0; c1 < class1Count; c1 += 1) {
      for (let c2 = 0; c2 < class2Count; c2 += 1) {
        const cell = (c1 * class2Count + c2) * cellSize;
        reader.seek(matrixStart + cell);
        value1[c1 * class2Count + c2] = readValueRecordXAdvance(
          reader,
          valueFormat1,
        );
        reader.seek(matrixStart + cell + value1Size);
        value2[c1 * class2Count + c2] = readValueRecordXAdvance(
          reader,
          valueFormat2,
        );
      }
    }
    const coverage = parseCoverage(reader, coverageOffset);
    const classDef1: ClassLookup = parseClassDef(reader, classDef1Offset);
    const classDef2: ClassLookup = parseClassDef(reader, classDef2Offset);
    return {
      apply(glyphIds, advances, pos) {
        const first = glyphIds[pos]!;
        const second = glyphIds[pos + 1];
        if (second === undefined) return null;
        if (coverage(first) < 0) return null;
        const c1 = classDef1(first);
        const c2 = classDef2(second);
        if (c1 >= class1Count || c2 >= class2Count) return null;
        const cellIndex = c1 * class2Count + c2;
        const v1 = value1[cellIndex]!;
        const v2 = value2[cellIndex]!;
        if (v1 === 0 && v2 === 0) return null;
        advances[pos]! += v1;
        advances[pos + 1]! += v2;
        return hasSecondAdjustment ? 2 : 1;
      },
    };
  }

  return null;
}

function parseSubtable(
  reader: BinaryReader,
  offset: number,
  lookupType: number,
): PosSubtable | null {
  switch (lookupType) {
    case 1:
      return parseSinglePos(reader, offset);
    case 2:
      return parsePairPos(reader, offset);
    case 9: {
      // Extension positioning: unwrap to the real subtable.
      reader.seek(offset);
      const format = reader.u16();
      if (format !== 1) return null;
      const extensionType = reader.u16();
      const extensionOffset = offset + reader.u32();
      return parseSubtable(reader, extensionOffset, extensionType);
    }
    default:
      return null;
  }
}

export class GposTable {
  private constructor(
    private readonly lookups: GposLookup[],
    private readonly featureToLookups: Map<string, number[]>,
  ) {}

  /** Parses GPOS bytes (table-relative). Returns null on any structural failure. */
  static parse(bytes: Uint8Array): GposTable | null {
    try {
      const reader = new BinaryReader(bytes);
      const { featureToLookups, lookupListOffset } =
        parseLayoutTableHeader(reader);
      const lookups = parseLookupList(reader, lookupListOffset, parseSubtable);
      return new GposTable(lookups, featureToLookups);
    } catch {
      return null;
    }
  }

  /** True when at least one of the requested feature tags exists in this font. */
  hasAnyFeature(tags: readonly string[]): boolean {
    return tags.some((tag) => this.featureToLookups.has(tag));
  }

  /**
   * Applies the positioning lookups for the given features across `advances`
   * (font design units), mutating it in place. `glyphIds[i]` is the glyph at
   * advance slot `i`; the arrays are parallel and equal length.
   */
  position(
    glyphIds: number[],
    advances: number[],
    tags: readonly string[],
  ): void {
    const lookupIndices = collectLookupIndices(this.featureToLookups, tags);
    for (const lookupIndex of lookupIndices) {
      const lookup = this.lookups[lookupIndex];
      if (!lookup) continue;
      let pos = 0;
      while (pos < glyphIds.length) {
        let advance: number | null = null;
        for (const subtable of lookup.subtables) {
          advance = subtable.apply(glyphIds, advances, pos);
          if (advance !== null) break;
        }
        pos += advance && advance > 0 ? advance : 1;
      }
    }
  }
}
