import { BinaryReader } from "./BinaryReader.js";
import { TrueTypeParseError } from "./TrueTypeParseError.js";

/** Maps Unicode code points to glyph ids. Returns 0 (.notdef) when unmapped. */
export interface CmapSubtable {
  glyphForCodePoint(codePoint: number): number;
}

interface EncodingRecord {
  platformId: number;
  encodingId: number;
  subtableOffset: number; // absolute, from the start of the font
}

/**
 * Parses the `cmap` table and selects the best Unicode subtable.
 *
 * Preference order favours the Windows platform with the widest coverage:
 *   (3,10) format 12 full Unicode → (3,1) format 4 BMP → (0,*) Unicode → first.
 * Only formats 4 and 12 are supported; they cover essentially all modern
 * TrueType/OpenType text fonts.
 */
export function parseCmap(
  reader: BinaryReader,
  cmapOffset: number,
): CmapSubtable {
  reader.seek(cmapOffset);
  reader.skip(2); // version
  const numTables = reader.u16();

  const records: EncodingRecord[] = [];
  for (let index = 0; index < numTables; index += 1) {
    const platformId = reader.u16();
    const encodingId = reader.u16();
    const offset = reader.u32();
    records.push({
      platformId,
      encodingId,
      subtableOffset: cmapOffset + offset,
    });
  }

  const chosen = selectEncodingRecord(records);
  if (!chosen) {
    throw new TrueTypeParseError("cmap has no encoding records");
  }

  const format = reader.u16At(chosen.subtableOffset);
  if (format === 12) {
    return parseFormat12(reader, chosen.subtableOffset);
  }
  if (format === 4) {
    return parseFormat4(reader, chosen.subtableOffset);
  }

  // Fall back to scanning for any supported subtable if the preferred one is an
  // unsupported format (rare, but keeps us robust).
  for (const record of records) {
    const recordFormat = reader.u16At(record.subtableOffset);
    if (recordFormat === 12) {
      return parseFormat12(reader, record.subtableOffset);
    }
    if (recordFormat === 4) {
      return parseFormat4(reader, record.subtableOffset);
    }
  }

  throw new TrueTypeParseError(
    `cmap has no format 4 or 12 subtable (preferred format ${format})`,
  );
}

function selectEncodingRecord(
  records: EncodingRecord[],
): EncodingRecord | undefined {
  const score = (record: EncodingRecord): number => {
    if (record.platformId === 3 && record.encodingId === 10) return 4; // Windows UCS-4
    if (record.platformId === 3 && record.encodingId === 1) return 3; // Windows BMP
    if (record.platformId === 0) return 2; // Unicode
    if (record.platformId === 3 && record.encodingId === 0) return 1; // Windows Symbol
    return 0;
  };
  let best: EncodingRecord | undefined;
  let bestScore = -1;
  for (const record of records) {
    const recordScore = score(record);
    if (recordScore > bestScore) {
      bestScore = recordScore;
      best = record;
    }
  }
  return best;
}

/** Segment-mapping (BMP, code points ≤ 0xFFFF). */
function parseFormat4(reader: BinaryReader, offset: number): CmapSubtable {
  reader.seek(offset);
  reader.skip(2); // format
  reader.skip(2); // length
  reader.skip(2); // language
  const segCountX2 = reader.u16();
  const segCount = segCountX2 / 2;
  reader.skip(6); // searchRange + entrySelector + rangeShift

  const endCode = new Uint16Array(segCount);
  for (let index = 0; index < segCount; index += 1)
    endCode[index] = reader.u16();
  reader.skip(2); // reservedPad
  const startCode = new Uint16Array(segCount);
  for (let index = 0; index < segCount; index += 1)
    startCode[index] = reader.u16();
  const idDelta = new Int16Array(segCount);
  for (let index = 0; index < segCount; index += 1)
    idDelta[index] = reader.i16();

  // idRangeOffset values are relative to their own position, so capture the
  // absolute address of the idRangeOffset array to resolve the glyph array.
  const idRangeOffsetBase = reader.tell();
  const idRangeOffset = new Uint16Array(segCount);
  for (let index = 0; index < segCount; index += 1) {
    idRangeOffset[index] = reader.u16();
  }

  return {
    glyphForCodePoint(codePoint: number): number {
      if (codePoint > 0xffff) return 0;
      for (let index = 0; index < segCount; index += 1) {
        if (codePoint > endCode[index]!) continue;
        if (codePoint < startCode[index]!) return 0;
        const range = idRangeOffset[index]!;
        if (range === 0) {
          return (codePoint + idDelta[index]!) & 0xffff;
        }
        // Address into glyphIdArray, per the OpenType spec formula.
        const glyphAddress =
          idRangeOffsetBase +
          index * 2 +
          range +
          (codePoint - startCode[index]!) * 2;
        const glyphId = reader.u16At(glyphAddress);
        if (glyphId === 0) return 0;
        return (glyphId + idDelta[index]!) & 0xffff;
      }
      return 0;
    },
  };
}

/** Segmented coverage (full Unicode, supports astral code points). */
function parseFormat12(reader: BinaryReader, offset: number): CmapSubtable {
  reader.seek(offset);
  reader.skip(2); // format
  reader.skip(2); // reserved
  reader.skip(4); // length
  reader.skip(4); // language
  const numGroups = reader.u32();

  const startChar = new Uint32Array(numGroups);
  const endChar = new Uint32Array(numGroups);
  const startGlyph = new Uint32Array(numGroups);
  for (let index = 0; index < numGroups; index += 1) {
    startChar[index] = reader.u32();
    endChar[index] = reader.u32();
    startGlyph[index] = reader.u32();
  }

  return {
    glyphForCodePoint(codePoint: number): number {
      let low = 0;
      let high = numGroups - 1;
      while (low <= high) {
        const mid = (low + high) >>> 1;
        if (codePoint < startChar[mid]!) {
          high = mid - 1;
        } else if (codePoint > endChar[mid]!) {
          low = mid + 1;
        } else {
          return startGlyph[mid]! + (codePoint - startChar[mid]!);
        }
      }
      return 0;
    },
  };
}
