import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorParagraphListStyle } from "@/core/model.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";
import { twipsToPx } from "./units.js";

export interface NumberingMaps {
  abstractKinds: Map<string, EditorParagraphListStyle["kind"]>;
  numKinds: Map<string, EditorParagraphListStyle["kind"]>;
  /** Indent per level, keyed by "abstractNumId:ilvl". Values in points. */
  abstractIndents: Map<string, { left?: number; hanging?: number }>;
  /** Suffix (`w:suff`) per level, keyed by "abstractNumId:ilvl". */
  abstractSuffixes: Map<string, EditorParagraphListStyle["suffix"]>;
  /** numFmt mapped to editor format, keyed by "abstractNumId:ilvl". */
  abstractFormats: Map<string, NonNullable<EditorParagraphListStyle["format"]>>;
  /** Starting number from `w:start`, keyed by "abstractNumId:ilvl". OOXML default is 1. */
  abstractStarts: Map<string, number>;
  /** Literal bullet glyph from `w:lvlText`, keyed by "abstractNumId:ilvl". */
  abstractBulletGlyphs: Map<string, string>;
  /** Font name from `w:lvl/w:rPr/w:rFonts`, keyed by "abstractNumId:ilvl". */
  abstractBulletFonts: Map<string, string>;
  /** `w:startOverride` values from `w:num/w:lvlOverride`, keyed by "numId:ilvl". */
  numStartOverrides: Map<string, number>;
  /** numId → abstractNumId */
  numToAbstractId: Map<string, string>;
  /**
   * Tracks which "numId:ilvl" pairs have been seen during paragraph parsing.
   * The first paragraph for each pair carries the level's `startAt` value;
   * subsequent paragraphs in the same list instance do not, so the counter
   * continues from the previous ordinal instead of resetting.
   */
  seenInstances: Set<string>;
}

const FORMAT_MAP: Record<string, NonNullable<EditorParagraphListStyle["format"]>> = {
  decimal: "decimal",
  lowerLetter: "lowerLetter",
  upperLetter: "upperLetter",
  lowerRoman: "lowerRoman",
  upperRoman: "upperRoman",
  bullet: "bullet",
};

export function parseNumbering(numberingXml: string | null): NumberingMaps {
  const abstractKinds = new Map<string, EditorParagraphListStyle["kind"]>();
  const numKinds = new Map<string, EditorParagraphListStyle["kind"]>();
  const abstractIndents = new Map<
    string,
    { left?: number; hanging?: number }
  >();
  const abstractSuffixes = new Map<
    string,
    EditorParagraphListStyle["suffix"]
  >();
  const abstractFormats = new Map<
    string,
    NonNullable<EditorParagraphListStyle["format"]>
  >();
  const abstractStarts = new Map<string, number>();
  const abstractBulletGlyphs = new Map<string, string>();
  const abstractBulletFonts = new Map<string, string>();
  const numStartOverrides = new Map<string, number>();
  const numToAbstractId = new Map<string, string>();
  const seenInstances = new Set<string>();

  const emptyResult = (): NumberingMaps => ({
    abstractKinds,
    numKinds,
    abstractIndents,
    abstractSuffixes,
    abstractFormats,
    abstractStarts,
    abstractBulletGlyphs,
    abstractBulletFonts,
    numStartOverrides,
    numToAbstractId,
    seenInstances,
  });

  if (!numberingXml) return emptyResult();

  const document = new DOMParser().parseFromString(
    numberingXml,
    "application/xml",
  );
  const numbering = document.documentElement;
  if (!numbering) return emptyResult();

  const abstractNums = numbering.getElementsByTagNameNS(WORD_NS, "abstractNum");
  for (let index = 0; index < abstractNums.length; index += 1) {
    const abstractNum = abstractNums[index]!;
    const abstractId = getAttributeValue(abstractNum, "abstractNumId");
    if (!abstractId) continue;

    for (const level of getChildrenByTagNameNS(abstractNum, WORD_NS, "lvl")) {
      const ilvl = getAttributeValue(level, "ilvl") ?? "0";
      const levelKey = `${abstractId}:${ilvl}`;

      const numFmt = getFirstChildByTagNameNS(level, WORD_NS, "numFmt");
      const format = getAttributeValue(numFmt, "val");
      if (format) {
        abstractKinds.set(
          levelKey,
          format === "bullet" ? "bullet" : "ordered",
        );
        // Keep a level-0 fallback keyed by just abstractId for backward compat.
        if (ilvl === "0") {
          abstractKinds.set(
            abstractId,
            format === "bullet" ? "bullet" : "ordered",
          );
        }
        const editorFormat = FORMAT_MAP[format];
        if (editorFormat) abstractFormats.set(levelKey, editorFormat);
      }

      const suffRaw = getAttributeValue(
        getFirstChildByTagNameNS(level, WORD_NS, "suff"),
        "val",
      );
      if (suffRaw === "space" || suffRaw === "nothing" || suffRaw === "tab") {
        abstractSuffixes.set(levelKey, suffRaw);
      }

      const startRaw = getAttributeValue(
        getFirstChildByTagNameNS(level, WORD_NS, "start"),
        "val",
      );
      if (startRaw != null) {
        const n = parseInt(startRaw, 10);
        if (!isNaN(n)) abstractStarts.set(levelKey, n);
      }

      // Bullet glyph from w:lvlText (only meaningful when numFmt is "bullet").
      if (format === "bullet") {
        const lvlTextEl = getFirstChildByTagNameNS(level, WORD_NS, "lvlText");
        const glyph = getAttributeValue(lvlTextEl, "val");
        if (glyph) abstractBulletGlyphs.set(levelKey, glyph);
      }

      // Font used to render the bullet glyph (w:lvl/w:rPr/w:rFonts).
      const rPr = getFirstChildByTagNameNS(level, WORD_NS, "rPr");
      const rFonts = getFirstChildByTagNameNS(rPr, WORD_NS, "rFonts");
      const fontName =
        getAttributeValue(rFonts, "ascii") ??
        getAttributeValue(rFonts, "hAnsi");
      if (fontName) abstractBulletFonts.set(levelKey, fontName);

      const pPr = getFirstChildByTagNameNS(level, WORD_NS, "pPr");
      const ind = getFirstChildByTagNameNS(pPr, WORD_NS, "ind");
      if (ind) {
        const leftRaw =
          getAttributeValue(ind, "left") ?? getAttributeValue(ind, "start");
        const hangingRaw = getAttributeValue(ind, "hanging");
        const left = leftRaw != null ? twipsToPx(leftRaw, 0) : undefined;
        const hanging =
          hangingRaw != null ? twipsToPx(hangingRaw, 0) : undefined;
        if (left !== undefined || hanging !== undefined) {
          abstractIndents.set(levelKey, { left, hanging });
        }
      }
    }
  }

  const nums = numbering.getElementsByTagNameNS(WORD_NS, "num");
  for (let index = 0; index < nums.length; index += 1) {
    const num = nums[index]!;
    const numId = getAttributeValue(num, "numId");
    const abstractNumIdElement = getFirstChildByTagNameNS(
      num,
      WORD_NS,
      "abstractNumId",
    );
    const abstractNumId = getAttributeValue(abstractNumIdElement, "val");
    if (!numId || !abstractNumId) {
      continue;
    }

    numToAbstractId.set(numId, abstractNumId);
    numKinds.set(numId, abstractKinds.get(abstractNumId) ?? "ordered");

    // Parse w:lvlOverride/w:startOverride for per-instance starting number.
    for (const override of getChildrenByTagNameNS(num, WORD_NS, "lvlOverride")) {
      const overrideIlvl = getAttributeValue(override, "ilvl");
      if (!overrideIlvl) continue;
      const startOverrideEl = getFirstChildByTagNameNS(
        override,
        WORD_NS,
        "startOverride",
      );
      const startOverrideRaw = getAttributeValue(startOverrideEl, "val");
      if (startOverrideRaw != null) {
        const n = parseInt(startOverrideRaw, 10);
        if (!isNaN(n)) numStartOverrides.set(`${numId}:${overrideIlvl}`, n);
      }
    }
  }

  return {
    abstractKinds,
    numKinds,
    abstractIndents,
    abstractSuffixes,
    abstractFormats,
    abstractStarts,
    abstractBulletGlyphs,
    abstractBulletFonts,
    numStartOverrides,
    numToAbstractId,
    seenInstances,
  };
}

export function parseParagraphList(
  paragraphProperties: XmlElement | null,
  numberingMaps: NumberingMaps,
):
  | {
      list: EditorParagraphListStyle;
      indent?: { left?: number; hanging?: number };
    }
  | undefined {
  if (!paragraphProperties) {
    return undefined;
  }

  const numPr = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "numPr");
  if (!numPr) {
    return undefined;
  }

  const numId = getAttributeValue(
    getFirstChildByTagNameNS(numPr, WORD_NS, "numId"),
    "val",
  );
  if (!numId) {
    return undefined;
  }

  const ilvlValue =
    getAttributeValue(
      getFirstChildByTagNameNS(numPr, WORD_NS, "ilvl"),
      "val",
    ) ?? "0";
  const level = Number(ilvlValue);

  const abstractId = numberingMaps.numToAbstractId.get(numId);
  const levelKey = abstractId ? `${abstractId}:${ilvlValue}` : undefined;

  const indent = levelKey
    ? numberingMaps.abstractIndents.get(levelKey)
    : undefined;

  // OOXML default suffix is "tab" when w:suff is absent.
  const suffix =
    (levelKey
      ? numberingMaps.abstractSuffixes.get(levelKey)
      : undefined) ?? "tab";

  const format = levelKey
    ? numberingMaps.abstractFormats.get(levelKey)
    : undefined;

  const bulletGlyph = levelKey
    ? numberingMaps.abstractBulletGlyphs.get(levelKey)
    : undefined;

  const bulletFont = levelKey
    ? numberingMaps.abstractBulletFonts.get(levelKey)
    : undefined;

  // Determine effective startAt: w:startOverride takes precedence over w:start.
  // Only include it on the FIRST paragraph of each numId+ilvl group so that
  // subsequent paragraphs in the same list instance keep incrementing instead
  // of resetting.
  const instanceKey = `${numId}:${ilvlValue}`;
  const isFirstInInstance = !numberingMaps.seenInstances.has(instanceKey);
  numberingMaps.seenInstances.add(instanceKey);

  let startAt: number | undefined;
  if (isFirstInInstance) {
    const override = numberingMaps.numStartOverrides.get(instanceKey);
    const abstractStart = levelKey
      ? numberingMaps.abstractStarts.get(levelKey)
      : undefined;
    const effectiveStart = override ?? abstractStart ?? 1;
    // Only store it when it differs from the OOXML default (1) to keep the
    // model lean for the common case.
    if (effectiveStart !== 1) startAt = effectiveStart;
  }

  return {
    list: {
      kind: numberingMaps.numKinds.get(numId) ?? "ordered",
      level: Number.isFinite(level) ? level : 0,
      suffix,
      ...(format !== undefined && { format }),
      ...(startAt !== undefined && { startAt }),
      ...(bulletGlyph !== undefined && { bulletGlyph }),
      ...(bulletFont !== undefined && { bulletFont }),
    },
    indent,
  };
}
