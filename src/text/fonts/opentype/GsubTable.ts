import { BinaryReader } from "@/text/truetype/BinaryReader.js";

/**
 * Minimal OpenType GSUB (glyph substitution) parser + apply engine, scoped to the
 * Latin font features the editor exposes: ligatures (liga/dlig/hlig), figure
 * style (lnum/onum/pnum/tnum), stylistic sets (ss01–ss20), and contextual
 * alternates (calt).
 *
 * It parses ScriptList/FeatureList/LookupList and the substitution lookup types
 * those features use — single (1), multiple (2), alternate (3), ligature (4),
 * chaining contextual (6), and extension (7). Positioning (GPOS), complex-script
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

/** Returns the coverage index of a glyph id, or -1 when not covered. */
type Coverage = (glyphId: number) => number;

/** Returns the class of a glyph id (0 when unlisted). */
type ClassLookup = (glyphId: number) => number;

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

function readTag(reader: BinaryReader): string {
  return reader.tag();
}

function parseCoverage(reader: BinaryReader, offset: number): Coverage {
  reader.seek(offset);
  const format = reader.u16();
  if (format === 1) {
    const count = reader.u16();
    const map = new Map<number, number>();
    for (let i = 0; i < count; i += 1) {
      map.set(reader.u16(), i);
    }
    return (glyphId) => map.get(glyphId) ?? -1;
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
    return (glyphId) => {
      for (const range of ranges) {
        if (glyphId >= range.start && glyphId <= range.end) {
          return range.startIndex + (glyphId - range.start);
        }
      }
      return -1;
    };
  }
  return () => -1;
}

function parseClassDef(reader: BinaryReader, offset: number): ClassLookup {
  reader.seek(offset);
  const format = reader.u16();
  if (format === 1) {
    const startGlyph = reader.u16();
    const glyphCount = reader.u16();
    const classes = new Array<number>(glyphCount);
    for (let i = 0; i < glyphCount; i += 1) {
      classes[i] = reader.u16();
    }
    return (glyphId) => {
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
    return (glyphId) => {
      for (const range of ranges) {
        if (glyphId >= range.start && glyphId <= range.end) {
          return range.classValue;
        }
      }
      return 0;
    };
  }
  return () => 0;
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
    const substitutes = new Array<number>(glyphCount);
    for (let i = 0; i < glyphCount; i += 1) {
      substitutes[i] = reader.u16();
    }
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

function parseMultipleSubst(
  reader: BinaryReader,
  offset: number,
): SubstSubtable | null {
  reader.seek(offset);
  const format = reader.u16();
  if (format !== 1) return null;
  const coverageOffset = offset + reader.u16();
  const sequenceCount = reader.u16();
  const sequenceOffsets = new Array<number>(sequenceCount);
  for (let i = 0; i < sequenceCount; i += 1) {
    sequenceOffsets[i] = offset + reader.u16();
  }
  const sequences = sequenceOffsets.map((seqOffset) => {
    reader.seek(seqOffset);
    const glyphCount = reader.u16();
    const ids = new Array<number>(glyphCount);
    for (let i = 0; i < glyphCount; i += 1) ids[i] = reader.u16();
    return ids;
  });
  const coverage = parseCoverage(reader, coverageOffset);
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
  reader.seek(offset);
  const format = reader.u16();
  if (format !== 1) return null;
  const coverageOffset = offset + reader.u16();
  const altSetCount = reader.u16();
  const altSetOffsets = new Array<number>(altSetCount);
  for (let i = 0; i < altSetCount; i += 1) {
    altSetOffsets[i] = offset + reader.u16();
  }
  const altSets = altSetOffsets.map((setOffset) => {
    reader.seek(setOffset);
    const glyphCount = reader.u16();
    const ids = new Array<number>(glyphCount);
    for (let i = 0; i < glyphCount; i += 1) ids[i] = reader.u16();
    return ids;
  });
  const coverage = parseCoverage(reader, coverageOffset);
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
  const ligSetOffsets = new Array<number>(ligSetCount);
  for (let i = 0; i < ligSetCount; i += 1) {
    ligSetOffsets[i] = offset + reader.u16();
  }
  const ligatureSets: Ligature[][] = ligSetOffsets.map((setOffset) => {
    reader.seek(setOffset);
    const ligCount = reader.u16();
    const ligOffsets = new Array<number>(ligCount);
    for (let i = 0; i < ligCount; i += 1) {
      ligOffsets[i] = setOffset + reader.u16();
    }
    return ligOffsets.map((ligOffset) => {
      reader.seek(ligOffset);
      const ligatureGlyph = reader.u16();
      const componentCount = reader.u16();
      const components = new Array<number>(Math.max(0, componentCount - 1));
      for (let i = 0; i < components.length; i += 1) {
        components[i] = reader.u16();
      }
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
    const backtrackCount = reader.u16();
    const backtrackCoverageOffsets = new Array<number>(backtrackCount);
    for (let i = 0; i < backtrackCount; i += 1) {
      backtrackCoverageOffsets[i] = offset + reader.u16();
    }
    const inputCount = reader.u16();
    const inputCoverageOffsets = new Array<number>(inputCount);
    for (let i = 0; i < inputCount; i += 1) {
      inputCoverageOffsets[i] = offset + reader.u16();
    }
    const lookaheadCount = reader.u16();
    const lookaheadCoverageOffsets = new Array<number>(lookaheadCount);
    for (let i = 0; i < lookaheadCount; i += 1) {
      lookaheadCoverageOffsets[i] = offset + reader.u16();
    }
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
    const ruleSetOffsets = new Array<number>(ruleSetCount);
    for (let i = 0; i < ruleSetCount; i += 1) {
      ruleSetOffsets[i] = offset + reader.u16();
    }
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
  const ruleOffsets = new Array<number>(ruleCount);
  for (let i = 0; i < ruleCount; i += 1) {
    ruleOffsets[i] = setOffset + reader.u16();
  }
  return ruleOffsets.map((ruleOffset) => {
    reader.seek(ruleOffset);
    const backtrackCount = reader.u16();
    const backtrack = new Array<number>(backtrackCount);
    for (let i = 0; i < backtrackCount; i += 1) backtrack[i] = reader.u16();
    const inputCount = reader.u16();
    const input = new Array<number>(Math.max(0, inputCount - 1));
    for (let i = 0; i < input.length; i += 1) input[i] = reader.u16();
    const lookaheadCount = reader.u16();
    const lookahead = new Array<number>(lookaheadCount);
    for (let i = 0; i < lookaheadCount; i += 1) lookahead[i] = reader.u16();
    const substCount = reader.u16();
    const records = readSubstLookupRecords(reader, substCount);
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
      reader.seek(0);
      reader.skip(2); // majorVersion
      reader.skip(2); // minorVersion
      const scriptListOffset = reader.u16();
      const featureListOffset = reader.u16();
      const lookupListOffset = reader.u16();

      const featureRecords = parseFeatureList(reader, featureListOffset);
      const activeFeatureIndices = parseScriptList(reader, scriptListOffset);
      const lookups = parseLookupList(reader, lookupListOffset);

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
    const indices = new Set<number>();
    for (const tag of tags) {
      for (const lookupIndex of this.featureToLookups.get(tag) ?? []) {
        indices.add(lookupIndex);
      }
    }
    return Array.from(indices).sort((a, b) => a - b);
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
    const tag = readTag(reader);
    const offset = featureListOffset + reader.u16();
    records.push({ tag, offset });
  }
  return records.map(({ tag, offset }) => {
    reader.seek(offset);
    reader.skip(2); // featureParamsOffset
    const lookupIndexCount = reader.u16();
    const lookupIndices = new Array<number>(lookupIndexCount);
    for (let i = 0; i < lookupIndexCount; i += 1) {
      lookupIndices[i] = reader.u16();
    }
    return { tag, lookupIndices };
  });
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
    const tag = readTag(reader);
    const offset = scriptListOffset + reader.u16();
    scripts.push({ tag, offset });
  }
  if (scripts.length === 0) return [];

  const chosen =
    scripts.find((s) => s.tag === "latn") ??
    scripts.find((s) => s.tag === "DFLT") ??
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

function parseLookupList(
  reader: BinaryReader,
  lookupListOffset: number,
): GsubLookup[] {
  reader.seek(lookupListOffset);
  const lookupCount = reader.u16();
  const lookupOffsets = new Array<number>(lookupCount);
  for (let i = 0; i < lookupCount; i += 1) {
    lookupOffsets[i] = lookupListOffset + reader.u16();
  }
  return lookupOffsets.map((lookupOffset) => {
    reader.seek(lookupOffset);
    const lookupType = reader.u16();
    reader.skip(2); // lookupFlag (glyph skipping ignored — no marks in scope)
    const subTableCount = reader.u16();
    const subtableOffsets = new Array<number>(subTableCount);
    for (let i = 0; i < subTableCount; i += 1) {
      subtableOffsets[i] = lookupOffset + reader.u16();
    }
    const subtables: SubstSubtable[] = [];
    for (const subtableOffset of subtableOffsets) {
      try {
        const subtable = parseSubtable(reader, subtableOffset, lookupType);
        if (subtable) subtables.push(subtable);
      } catch {
        // Skip malformed subtable; the feature degrades gracefully.
      }
    }
    return { lookupType, subtables };
  });
}
