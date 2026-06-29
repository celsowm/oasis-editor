import { BinaryReader } from "@/text/truetype/BinaryReader.js";

/**
 * Shared scaffolding for the OpenType "Layout" tables (GSUB and GPOS). Both share
 * an identical header (ScriptList / FeatureList / LookupList offsets), the same
 * Coverage and ClassDef formats, and the same script/feature resolution; only the
 * lookup subtables differ (substitution vs. positioning). This module owns the
 * common pieces so {@link ../opentype/GsubTable} and {@link ../opentype/GposTable}
 * stay a single source of truth for that machinery.
 *
 * All offsets are relative to the start of the table bytes passed to the parser.
 * Parsing is defensive: callers wrap these in try/catch and degrade gracefully, so
 * a malformed table never breaks export.
 */

/** Returns the coverage index of a glyph id, or -1 when not covered. */
export type Coverage = (glyphId: number) => number;

/** Returns the class of a glyph id (0 when unlisted). */
export type ClassLookup = (glyphId: number) => number;

export function readU16Array(reader: BinaryReader, count: number): number[] {
  const array = new Array<number>(count);
  for (let i = 0; i < count; i += 1) array[i] = reader.u16();
  return array;
}

export function readU16OffsetArray(
  reader: BinaryReader,
  count: number,
  baseOffset: number,
): number[] {
  const array = new Array<number>(count);
  for (let i = 0; i < count; i += 1) array[i] = baseOffset + reader.u16();
  return array;
}

export function parseCoverage(reader: BinaryReader, offset: number): Coverage {
  reader.seek(offset);
  const format = reader.u16();
  if (format === 1) {
    const count = reader.u16();
    const map = new Map<number, number>();
    for (let i = 0; i < count; i += 1) {
      map.set(reader.u16(), i);
    }
    return (glyphId): number => map.get(glyphId) ?? -1;
  }
  if (format === 2) {
    const rangeCount = reader.u16();
    const ranges: Array<{ start: number; end: number; startIndex: number }> =
      [];
    for (let i = 0; i < rangeCount; i += 1) {
      const start = reader.u16();
      const end = reader.u16();
      const startIndex = reader.u16();
      ranges.push({ start, end, startIndex });
    }
    return (glyphId): number => {
      for (const range of ranges) {
        if (glyphId >= range.start && glyphId <= range.end) {
          return range.startIndex + (glyphId - range.start);
        }
      }
      return -1;
    };
  }
  return (): -1 => -1;
}

export function parseClassDef(
  reader: BinaryReader,
  offset: number,
): ClassLookup {
  reader.seek(offset);
  const format = reader.u16();
  if (format === 1) {
    const startGlyph = reader.u16();
    const glyphCount = reader.u16();
    const classes = readU16Array(reader, glyphCount);
    return (glyphId): number => {
      const index = glyphId - startGlyph;
      return index >= 0 && index < glyphCount ? classes[index]! : 0;
    };
  }
  if (format === 2) {
    const rangeCount = reader.u16();
    const ranges: Array<{ start: number; end: number; classValue: number }> =
      [];
    for (let i = 0; i < rangeCount; i += 1) {
      const start = reader.u16();
      const end = reader.u16();
      const classValue = reader.u16();
      ranges.push({ start, end, classValue });
    }
    return (glyphId): number => {
      for (const range of ranges) {
        if (glyphId >= range.start && glyphId <= range.end) {
          return range.classValue;
        }
      }
      return 0;
    };
  }
  return (): 0 => 0;
}

interface FeatureRecord {
  tag: string;
  lookupIndices: number[];
}

function parseFeatureList(
  reader: BinaryReader,
  featureListOffset: number,
): FeatureRecord[] {
  reader.seek(featureListOffset);
  const featureCount = reader.u16();
  const records: Array<{ tag: string; offset: number }> = [];
  for (let i = 0; i < featureCount; i += 1) {
    const tag = reader.tag();
    const offset = featureListOffset + reader.u16();
    records.push({ tag, offset });
  }
  return records.map(
    ({ tag, offset }): { tag: string; lookupIndices: number[] } => {
      reader.seek(offset);
      reader.skip(2); // featureParamsOffset
      const lookupIndexCount = reader.u16();
      const lookupIndices = readU16Array(reader, lookupIndexCount);
      return { tag, lookupIndices };
    },
  );
}

/**
 * Resolves the set of feature indices offered by the Latin script's default
 * language system, falling back to DFLT, then to the first available script.
 */
function parseScriptList(
  reader: BinaryReader,
  scriptListOffset: number,
): number[] {
  reader.seek(scriptListOffset);
  const scriptCount = reader.u16();
  const scripts: Array<{ tag: string; offset: number }> = [];
  for (let i = 0; i < scriptCount; i += 1) {
    const tag = reader.tag();
    const offset = scriptListOffset + reader.u16();
    scripts.push({ tag, offset });
  }
  if (scripts.length === 0) return [];

  const chosen =
    scripts.find((s): boolean => s.tag === "latn") ??
    scripts.find((s): boolean => s.tag === "DFLT") ??
    scripts[0]!;

  reader.seek(chosen.offset);
  const defaultLangSysOffset = reader.u16();
  // langSysCount + records ignored: we use the default language system, which is
  // what Word body text and the CSS path use for Latin.
  if (defaultLangSysOffset === 0) return [];

  reader.seek(chosen.offset + defaultLangSysOffset);
  reader.skip(2); // lookupOrderOffset (reserved)
  const requiredFeatureIndex = reader.u16();
  const featureIndexCount = reader.u16();
  const featureIndices: number[] = [];
  if (requiredFeatureIndex !== 0xffff) {
    featureIndices.push(requiredFeatureIndex);
  }
  for (let i = 0; i < featureIndexCount; i += 1) {
    featureIndices.push(reader.u16());
  }
  return featureIndices;
}

/** The common header of a Layout table: feature→lookup map + lookup-list offset. */
export interface LayoutTableHeader {
  /**
   * Maps each feature tag offered by the resolved Latin/DFLT language system to
   * its ordered lookup indices.
   */
  featureToLookups: Map<string, number[]>;
  /** Table-relative offset of the LookupList, parsed by the owning table. */
  lookupListOffset: number;
}

/**
 * Parses the shared GSUB/GPOS header: version, the three list offsets, the
 * feature list, and the active feature set from the script list. The caller
 * parses the LookupList itself (its subtables are table-specific).
 */
export function parseLayoutTableHeader(
  reader: BinaryReader,
): LayoutTableHeader {
  reader.seek(0);
  reader.skip(2); // majorVersion
  reader.skip(2); // minorVersion
  const scriptListOffset = reader.u16();
  const featureListOffset = reader.u16();
  const lookupListOffset = reader.u16();

  const featureRecords = parseFeatureList(reader, featureListOffset);
  const activeFeatureIndices = parseScriptList(reader, scriptListOffset);

  // Map feature tag → ordered lookup indices, restricted to the features the
  // resolved Latin/DFLT language system actually offers.
  const featureToLookups = new Map<string, number[]>();
  for (const featureIndex of activeFeatureIndices) {
    const record = featureRecords[featureIndex];
    if (!record) continue;
    const existing = featureToLookups.get(record.tag) ?? [];
    for (const lookupIndex of record.lookupIndices) {
      if (!existing.includes(lookupIndex)) existing.push(lookupIndex);
    }
    featureToLookups.set(record.tag, existing);
  }

  return { featureToLookups, lookupListOffset };
}

export function parseLookupList<TSubtable>(
  reader: BinaryReader,
  lookupListOffset: number,
  parseSubtable: (
    reader: BinaryReader,
    offset: number,
    lookupType: number,
  ) => TSubtable | null,
): Array<{ lookupType: number; subtables: TSubtable[] }> {
  reader.seek(lookupListOffset);
  const lookupCount = reader.u16();
  const lookupOffsets = readU16OffsetArray(
    reader,
    lookupCount,
    lookupListOffset,
  );
  return lookupOffsets.map(
    (lookupOffset): { lookupType: number; subtables: TSubtable[] } => {
      reader.seek(lookupOffset);
      const lookupType = reader.u16();
      reader.skip(2); // lookupFlag (glyph skipping ignored — no marks in scope)
      const subtableOffsets = readU16OffsetArray(
        reader,
        reader.u16(),
        lookupOffset,
      );
      const subtables: TSubtable[] = [];
      for (const subtableOffset of subtableOffsets) {
        try {
          const subtable = parseSubtable(reader, subtableOffset, lookupType);
          if (subtable) subtables.push(subtable);
        } catch {
          // Skip malformed subtable; the feature degrades gracefully.
        }
      }
      return { lookupType, subtables };
    },
  );
}

/** Ordered (ascending) unique lookup indices referenced by the given tags. */
export function collectLookupIndices(
  featureToLookups: Map<string, number[]>,
  tags: readonly string[],
): number[] {
  const indices = new Set<number>();
  for (const tag of tags) {
    for (const lookupIndex of featureToLookups.get(tag) ?? []) {
      indices.add(lookupIndex);
    }
  }
  return Array.from(indices).sort((a, b): number => a - b);
}
