import { BinaryReader } from "@/text/truetype/BinaryReader.js";
import {
  collectLookupIndices,
  parseClassDef,
  parseCoverage,
  parseLayoutTableHeader,
  parseLookupList,
  readU16Array,
  readU16OffsetArray,
  type ClassLookup,
} from "@/text/fonts/opentype/otLayoutCommon.js";

/**
 * Minimal OpenType GSUB (glyph substitution) parser + apply engine, scoped to the
 * Latin font features the editor exposes: ligatures (liga/dlig/hlig), figure
 * style (lnum/onum/pnum/tnum), stylistic sets (ss01–ss20), and contextual
 * alternates (calt).
 *
 * It parses ScriptList/FeatureList/LookupList (the first two via the shared
 * {@link otLayoutCommon}) and the substitution lookup types those features use —
 * single (1), multiple (2), alternate (3), ligature (4), chaining contextual (6),
 * and extension (7). Positioning (GPOS — see {@link ./GposTable}), complex-script
 * shaping, and lookup-flag glyph skipping are intentionally out of scope.
 *
 * Parsing is defensive: any malformed offset or unsupported construct is skipped
 * (the feature simply doesn't apply) rather than throwing, so a broken GSUB can
 * never break PDF export. All offsets are relative to the start of the GSUB table
 * bytes passed to {@link GsubTable.parse}.
 */

/** A glyph in the shaping buffer, carrying the source code points for ToUnicode. */
export interface ShapingGlyph {
  id: number;
  codePoints: number[];
}

/**
 * One substitution subtable. Attempts to apply at `pos`; returns the number of
 * output glyphs to advance past on success, or `null` when it does not match.
 */
interface SubstSubtable {
  apply(glyphs: ShapingGlyph[], pos: number, engine: GsubTable): number | null;
}

interface GsubLookup {
  lookupType: number;
  subtables: SubstSubtable[];
}

// --- Lookup subtable parsers -------------------------------------------------

function parseSingleSubst(
  reader: BinaryReader,
  offset: number,
): SubstSubtable | null {
  reader.seek(offset);
  const format = reader.u16();
  const coverageOffset = offset + reader.u16();
  if (format === 1) {
    const delta = reader.i16();
    const coverage = parseCoverage(reader, coverageOffset);
    return {
      apply(glyphs, pos) {
        const glyph = glyphs[pos];
        if (!glyph || coverage(glyph.id) < 0) return null;
        glyph.id = (glyph.id + delta) & 0xffff;
        return 1;
      },
    };
  }
  if (format === 2) {
    const glyphCount = reader.u16();
    const substitutes = readU16Array(reader, glyphCount);
    const coverage = parseCoverage(reader, coverageOffset);
    return {
      apply(glyphs, pos) {
        const glyph = glyphs[pos];
        if (!glyph) return null;
        const index = coverage(glyph.id);
        if (index < 0 || index >= glyphCount) return null;
        glyph.id = substitutes[index]!;
        return 1;
      },
    };
  }
  return null;
}

function parseGlyphSetArray(
  reader: BinaryReader,
  offset: number,
): { coverage: (id: number) => number; sets: number[][] } | null {
  reader.seek(offset);
  if (reader.u16() !== 1) return null;
  const coverageOffset = offset + reader.u16();
  const count = reader.u16();
  const setOffsets = readU16OffsetArray(reader, count, offset);
  const sets = setOffsets.map((setOffset) => {
    reader.seek(setOffset);
    return readU16Array(reader, reader.u16());
  });
  return { coverage: parseCoverage(reader, coverageOffset), sets };
}

function parseMultipleSubst(
  reader: BinaryReader,
  offset: number,
): SubstSubtable | null {
  const parsed = parseGlyphSetArray(reader, offset);
  if (!parsed) return null;
  const { coverage, sets: sequences } = parsed;
  return {
    apply(glyphs, pos) {
      const glyph = glyphs[pos];
      if (!glyph) return null;
      const index = coverage(glyph.id);
      if (index < 0 || index >= sequences.length) return null;
      const ids = sequences[index]!;
      if (ids.length === 0) return null;
      const codePoints = glyph.codePoints;
      const replacement: ShapingGlyph[] = ids.map((id, i) => ({
        id,
        codePoints: i === 0 ? codePoints : [],
      }));
      glyphs.splice(pos, 1, ...replacement);
      return ids.length;
    },
  };
}

function parseAlternateSubst(
  reader: BinaryReader,
  offset: number,
): SubstSubtable | null {
  const parsed = parseGlyphSetArray(reader, offset);
  if (!parsed) return null;
  const { coverage, sets: altSets } = parsed;
  return {
    apply(glyphs, pos) {
      const glyph = glyphs[pos];
      if (!glyph) return null;
      const index = coverage(glyph.id);
      if (index < 0 || index >= altSets.length) return null;
      const alts = altSets[index]!;
      if (alts.length === 0) return null;
      // Apply the first alternate (Word/CSS select the default alternate).
      glyph.id = alts[0]!;
      return 1;
    },
  };
}

interface Ligature {
  ligatureGlyph: number;
  components: number[]; // components after the first (coverage) glyph
}

function parseLigatureSubst(
  reader: BinaryReader,
  offset: number,
): SubstSubtable | null {
  reader.seek(offset);
  const format = reader.u16();
  if (format !== 1) return null;
  const coverageOffset = offset + reader.u16();
  const ligSetCount = reader.u16();
  const ligSetOffsets = readU16OffsetArray(reader, ligSetCount, offset);
  const ligatureSets: Ligature[][] = ligSetOffsets.map((setOffset) => {
    reader.seek(setOffset);
    const ligOffsets = readU16OffsetArray(reader, reader.u16(), setOffset);
    return ligOffsets.map((ligOffset) => {
      reader.seek(ligOffset);
      const ligatureGlyph = reader.u16();
      const componentCount = reader.u16();
      const components = readU16Array(reader, Math.max(0, componentCount - 1));
      return { ligatureGlyph, components };
    });
  });
  const coverage = parseCoverage(reader, coverageOffset);
  return {
    apply(glyphs, pos) {
      const first = glyphs[pos];
      if (!first) return null;
      const setIndex = coverage(first.id);
      if (setIndex < 0 || setIndex >= ligatureSets.length) return null;
      for (const ligature of ligatureSets[setIndex]!) {
        const { components } = ligature;
        // Need glyphs at pos+1 .. pos+components.length to all exist.
        if (pos + components.length > glyphs.length - 1) continue;
        let matched = true;
        for (let i = 0; i < components.length; i += 1) {
          if (glyphs[pos + 1 + i]!.id !== components[i]) {
            matched = false;
            break;
          }
        }
        if (!matched) continue;
        const total = components.length + 1;
        const mergedCodePoints: number[] = [];
        for (let i = 0; i < total; i += 1) {
          mergedCodePoints.push(...glyphs[pos + i]!.codePoints);
        }
        glyphs.splice(pos, total, {
          id: ligature.ligatureGlyph,
          codePoints: mergedCodePoints,
        });
        return 1;
      }
      return null;
    },
  };
}

interface SubstLookupRecord {
  sequenceIndex: number;
  lookupListIndex: number;
}

function readSubstLookupRecords(
  reader: BinaryReader,
  count: number,
): SubstLookupRecord[] {
  const records = new Array<SubstLookupRecord>(count);
  for (let i = 0; i < count; i += 1) {
    const sequenceIndex = reader.u16();
    const lookupListIndex = reader.u16();
    records[i] = { sequenceIndex, lookupListIndex };
  }
  return records;
}

function applySubstRecords(
  glyphs: ShapingGlyph[],
  pos: number,
  records: SubstLookupRecord[],
  engine: GsubTable,
): void {
  for (const record of records) {
    engine.applyLookupIndexAt(
      record.lookupListIndex,
      glyphs,
      pos + record.sequenceIndex,
    );
  }
}

function parseChainContextSubst(
  reader: BinaryReader,
  offset: number,
): SubstSubtable | null {
  reader.seek(offset);
  const format = reader.u16();
  if (format === 3) {
    const backtrackCoverageOffsets = readU16OffsetArray(
      reader,
      reader.u16(),
      offset,
    );
    const inputCoverageOffsets = readU16OffsetArray(
      reader,
      reader.u16(),
      offset,
    );
    const lookaheadCoverageOffsets = readU16OffsetArray(
      reader,
      reader.u16(),
      offset,
    );
    const substCount = reader.u16();
    const records = readSubstLookupRecords(reader, substCount);
    const backtrack = backtrackCoverageOffsets.map((o) =>
      parseCoverage(reader, o),
    );
    const input = inputCoverageOffsets.map((o) => parseCoverage(reader, o));
    const lookahead = lookaheadCoverageOffsets.map((o) =>
      parseCoverage(reader, o),
    );
    return {
      apply(glyphs, pos, engine) {
        if (input.length === 0) return null;
        if (pos + input.length > glyphs.length) return null;
        for (let i = 0; i < input.length; i += 1) {
          if (input[i]!(glyphs[pos + i]!.id) < 0) return null;
        }
        // Backtrack reads leftwards from pos.
        for (let i = 0; i < backtrack.length; i += 1) {
          const g = glyphs[pos - 1 - i];
          if (!g || backtrack[i]!(g.id) < 0) return null;
        }
        for (let i = 0; i < lookahead.length; i += 1) {
          const g = glyphs[pos + input.length + i];
          if (!g || lookahead[i]!(g.id) < 0) return null;
        }
        applySubstRecords(glyphs, pos, records, engine);
        return input.length;
      },
    };
  }
  // Formats 1 (glyph) and 2 (class) are rarer for calt; supported below.
  if (format === 1) {
    const coverageOffset = offset + reader.u16();
    const ruleSetCount = reader.u16();
    const ruleSetOffsets = readU16OffsetArray(reader, ruleSetCount, offset);
    const coverage = parseCoverage(reader, coverageOffset);
    const ruleSets = ruleSetOffsets.map((setOffset) =>
      parseChainRuleSet(reader, setOffset),
    );
    return {
      apply(glyphs, pos, engine) {
        const glyph = glyphs[pos];
        if (!glyph) return null;
        const index = coverage(glyph.id);
        if (index < 0 || index >= ruleSets.length) return null;
        return applyChainRules(ruleSets[index]!, glyphs, pos, engine, null);
      },
    };
  }
  if (format === 2) {
    const coverageOffset = offset + reader.u16();
    const backtrackClassOffset = offset + reader.u16();
    const inputClassOffset = offset + reader.u16();
    const lookaheadClassOffset = offset + reader.u16();
    const classSetCount = reader.u16();
    const classSetOffsets = new Array<number>(classSetCount);
    for (let i = 0; i < classSetCount; i += 1) {
      const raw = reader.u16();
      classSetOffsets[i] = raw === 0 ? 0 : offset + raw;
    }
    const coverage = parseCoverage(reader, coverageOffset);
    const backtrackClass = parseClassDef(reader, backtrackClassOffset);
    const inputClass = parseClassDef(reader, inputClassOffset);
    const lookaheadClass = parseClassDef(reader, lookaheadClassOffset);
    const classSets = classSetOffsets.map((setOffset) =>
      setOffset === 0 ? [] : parseChainRuleSet(reader, setOffset),
    );
    return {
      apply(glyphs, pos, engine) {
        const glyph = glyphs[pos];
        if (!glyph) return null;
        if (coverage(glyph.id) < 0) return null;
        const classIndex = inputClass(glyph.id);
        const ruleSet = classSets[classIndex];
        if (!ruleSet) return null;
        return applyChainRules(ruleSet, glyphs, pos, engine, {
          backtrack: backtrackClass,
          input: inputClass,
          lookahead: lookaheadClass,
        });
      },
    };
  }
  return null;
}

interface ChainRule {
  backtrack: number[];
  input: number[]; // input glyphs/classes after the first
  lookahead: number[];
  records: SubstLookupRecord[];
}

function parseChainRuleSet(
  reader: BinaryReader,
  setOffset: number,
): ChainRule[] {
  reader.seek(setOffset);
  const ruleCount = reader.u16();
  const ruleOffsets = readU16OffsetArray(reader, ruleCount, setOffset);
  return ruleOffsets.map((ruleOffset) => {
    reader.seek(ruleOffset);
    const backtrack = readU16Array(reader, reader.u16());
    const input = readU16Array(reader, Math.max(0, reader.u16() - 1));
    const lookahead = readU16Array(reader, reader.u16());
    const records = readSubstLookupRecords(reader, reader.u16());
    return { backtrack, input, lookahead, records };
  });
}

// null → glyph-format rule (compare glyph ids); object → class-format rule.
type ClassResolver = {
  backtrack: ClassLookup;
  input: ClassLookup;
  lookahead: ClassLookup;
} | null;

function applyChainRules(
  rules: ChainRule[],
  glyphs: ShapingGlyph[],
  pos: number,
  engine: GsubTable,
  resolver: ClassResolver,
): number | null {
  const valueAt = (index: number, kind: "b" | "i" | "l"): number | null => {
    const g = glyphs[index];
    if (!g) return null;
    if (!resolver) return g.id;
    if (kind === "b") return resolver.backtrack(g.id);
    if (kind === "l") return resolver.lookahead(g.id);
    return resolver.input(g.id);
  };
  for (const rule of rules) {
    const inputLen = rule.input.length + 1;
    if (pos + inputLen > glyphs.length) continue;
    let matched = true;
    for (let i = 0; i < rule.input.length; i += 1) {
      if (valueAt(pos + 1 + i, "i") !== rule.input[i]) {
        matched = false;
        break;
      }
    }
    if (!matched) continue;
    for (let i = 0; i < rule.backtrack.length; i += 1) {
      if (valueAt(pos - 1 - i, "b") !== rule.backtrack[i]) {
        matched = false;
        break;
      }
    }
    if (!matched) continue;
    for (let i = 0; i < rule.lookahead.length; i += 1) {
      if (valueAt(pos + inputLen + i, "l") !== rule.lookahead[i]) {
        matched = false;
        break;
      }
    }
    if (!matched) continue;
    applySubstRecords(glyphs, pos, rule.records, engine);
    return inputLen;
  }
  return null;
}

function parseSubtable(
  reader: BinaryReader,
  offset: number,
  lookupType: number,
): SubstSubtable | null {
  switch (lookupType) {
    case 1:
      return parseSingleSubst(reader, offset);
    case 2:
      return parseMultipleSubst(reader, offset);
    case 3:
      return parseAlternateSubst(reader, offset);
    case 4:
      return parseLigatureSubst(reader, offset);
    case 6:
      return parseChainContextSubst(reader, offset);
    case 7: {
      // Extension substitution: unwrap to the real subtable.
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

export class GsubTable {
  private constructor(
    private readonly lookups: GsubLookup[],
    private readonly featureToLookups: Map<string, number[]>,
  ) {}

  /** Parses GSUB bytes (table-relative). Returns null on any structural failure. */
  static parse(bytes: Uint8Array): GsubTable | null {
    try {
      const reader = new BinaryReader(bytes);
      const { featureToLookups, lookupListOffset } =
        parseLayoutTableHeader(reader);
      const lookups = parseLookupList(reader, lookupListOffset, parseSubtable);
      return new GsubTable(lookups, featureToLookups);
    } catch {
      return null;
    }
  }

  /** True when at least one of the requested feature tags exists in this font. */
  hasAnyFeature(tags: readonly string[]): boolean {
    return tags.some((tag) => this.featureToLookups.has(tag));
  }

  /** Ordered (ascending) unique lookup indices referenced by the given tags. */
  collectLookupIndices(tags: readonly string[]): number[] {
    return collectLookupIndices(this.featureToLookups, tags);
  }

  /**
   * Applies one lookup (by index) at a single position. Tries each subtable in
   * order; the first that matches wins. Returns the advance (output glyph count)
   * or null when nothing matched. Used both by the shaping walk and by nested
   * chaining-contextual substitution records.
   */
  applyLookupIndexAt(
    lookupIndex: number,
    glyphs: ShapingGlyph[],
    pos: number,
  ): number | null {
    const lookup = this.lookups[lookupIndex];
    if (!lookup || pos < 0 || pos >= glyphs.length) return null;
    for (const subtable of lookup.subtables) {
      const advance = subtable.apply(glyphs, pos, this);
      if (advance !== null) return advance;
    }
    return null;
  }

  /** Applies the lookups for the given features across the whole buffer. */
  shape(glyphs: ShapingGlyph[], tags: readonly string[]): void {
    const lookupIndices = this.collectLookupIndices(tags);
    for (const lookupIndex of lookupIndices) {
      let pos = 0;
      while (pos < glyphs.length) {
        const advance = this.applyLookupIndexAt(lookupIndex, glyphs, pos);
        pos += advance && advance > 0 ? advance : 1;
      }
    }
  }
}
