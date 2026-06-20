import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorParagraphListStyle } from "@/core/model.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";
import { twipsToPx } from "./units.js";

type ListFormat = NonNullable<EditorParagraphListStyle["format"]>;

interface NumberingLevel {
  kind?: EditorParagraphListStyle["kind"];
  format?: ListFormat;
  suffix?: EditorParagraphListStyle["suffix"];
  startAt?: number;
  levelText?: string;
  alignment?: EditorParagraphListStyle["alignment"];
  legal?: boolean;
  bulletGlyph?: string;
  bulletFont?: string;
  indent?: { left?: number; hanging?: number };
}

export interface NumberingMaps {
  abstractLevels: Map<string, NumberingLevel>;
  numOverrideLevels: Map<string, NumberingLevel>;
  numStartOverrides: Map<string, number>;
  numToAbstractId: Map<string, string>;
  seenInstances: Set<string>;
}

const FORMAT_MAP: Record<string, ListFormat> = {
  decimal: "decimal",
  lowerLetter: "lowerLetter",
  upperLetter: "upperLetter",
  lowerRoman: "lowerRoman",
  upperRoman: "upperRoman",
  bullet: "bullet",
};

function isXmlTrue(value: string | null | undefined): boolean {
  return value == null || value === "1" || value === "true" || value === "on";
}

function parseLevel(level: XmlElement): NumberingLevel {
  const result: NumberingLevel = {};
  const formatRaw = getAttributeValue(
    getFirstChildByTagNameNS(level, WORD_NS, "numFmt"),
    "val",
  );
  if (formatRaw) {
    result.kind = formatRaw === "bullet" ? "bullet" : "ordered";
    result.format = FORMAT_MAP[formatRaw];
  }
  const suffix = getAttributeValue(
    getFirstChildByTagNameNS(level, WORD_NS, "suff"),
    "val",
  );
  if (suffix === "tab" || suffix === "space" || suffix === "nothing") {
    result.suffix = suffix;
  }
  const startRaw = getAttributeValue(
    getFirstChildByTagNameNS(level, WORD_NS, "start"),
    "val",
  );
  if (startRaw != null) {
    const startAt = Number.parseInt(startRaw, 10);
    if (Number.isFinite(startAt)) result.startAt = startAt;
  }
  result.levelText =
    getAttributeValue(
      getFirstChildByTagNameNS(level, WORD_NS, "lvlText"),
      "val",
    ) ?? undefined;
  const alignment = getAttributeValue(
    getFirstChildByTagNameNS(level, WORD_NS, "lvlJc"),
    "val",
  );
  if (alignment === "left" || alignment === "center" || alignment === "right") {
    result.alignment = alignment;
  }
  const legal = getFirstChildByTagNameNS(level, WORD_NS, "isLgl");
  if (legal) result.legal = isXmlTrue(getAttributeValue(legal, "val"));

  if (result.kind === "bullet" && result.levelText) {
    result.bulletGlyph = result.levelText;
  }
  const rPr = getFirstChildByTagNameNS(level, WORD_NS, "rPr");
  const rFonts = getFirstChildByTagNameNS(rPr, WORD_NS, "rFonts");
  result.bulletFont =
    getAttributeValue(rFonts, "ascii") ??
    getAttributeValue(rFonts, "hAnsi") ??
    undefined;

  const pPr = getFirstChildByTagNameNS(level, WORD_NS, "pPr");
  const ind = getFirstChildByTagNameNS(pPr, WORD_NS, "ind");
  if (ind) {
    const leftRaw =
      getAttributeValue(ind, "left") ?? getAttributeValue(ind, "start");
    const hangingRaw = getAttributeValue(ind, "hanging");
    const left = leftRaw != null ? twipsToPx(leftRaw, 0) : undefined;
    const hanging = hangingRaw != null ? twipsToPx(hangingRaw, 0) : undefined;
    if (left !== undefined || hanging !== undefined)
      result.indent = { left, hanging };
  }
  return result;
}

export function parseNumbering(numberingXml: string | null): NumberingMaps {
  const maps: NumberingMaps = {
    abstractLevels: new Map(),
    numOverrideLevels: new Map(),
    numStartOverrides: new Map(),
    numToAbstractId: new Map(),
    seenInstances: new Set(),
  };
  if (!numberingXml) return maps;

  const document = new DOMParser().parseFromString(
    numberingXml,
    "application/xml",
  );
  const numbering = document.documentElement;
  if (!numbering) return maps;

  for (const abstractNum of Array.from(
    numbering.getElementsByTagNameNS(WORD_NS, "abstractNum"),
  )) {
    const abstractId = getAttributeValue(abstractNum, "abstractNumId");
    if (!abstractId) continue;
    for (const level of getChildrenByTagNameNS(abstractNum, WORD_NS, "lvl")) {
      const ilvl = getAttributeValue(level, "ilvl") ?? "0";
      maps.abstractLevels.set(`${abstractId}:${ilvl}`, parseLevel(level));
    }
  }

  for (const num of Array.from(
    numbering.getElementsByTagNameNS(WORD_NS, "num"),
  )) {
    const numId = getAttributeValue(num, "numId");
    const abstractId = getAttributeValue(
      getFirstChildByTagNameNS(num, WORD_NS, "abstractNumId"),
      "val",
    );
    if (!numId || !abstractId) continue;
    maps.numToAbstractId.set(numId, abstractId);
    for (const override of getChildrenByTagNameNS(
      num,
      WORD_NS,
      "lvlOverride",
    )) {
      const ilvl = getAttributeValue(override, "ilvl") ?? "0";
      const overrideLevel = getFirstChildByTagNameNS(override, WORD_NS, "lvl");
      if (overrideLevel) {
        maps.numOverrideLevels.set(
          `${numId}:${ilvl}`,
          parseLevel(overrideLevel),
        );
      }
      const startRaw = getAttributeValue(
        getFirstChildByTagNameNS(override, WORD_NS, "startOverride"),
        "val",
      );
      if (startRaw != null) {
        const startAt = Number.parseInt(startRaw, 10);
        if (Number.isFinite(startAt)) {
          maps.numStartOverrides.set(`${numId}:${ilvl}`, startAt);
        }
      }
    }
  }
  return maps;
}

function effectiveLevel(
  numberingMaps: NumberingMaps,
  numId: string,
  ilvl: number,
): NumberingLevel {
  const abstractId = numberingMaps.numToAbstractId.get(numId);
  const base = abstractId
    ? numberingMaps.abstractLevels.get(`${abstractId}:${ilvl}`)
    : undefined;
  const override = numberingMaps.numOverrideLevels.get(`${numId}:${ilvl}`);
  // A nested w:lvl is a complete replacement for the abstract level. Only a
  // lone w:startOverride inherits the remaining abstract-level properties.
  return override ?? base ?? {};
}

export function parseParagraphList(
  paragraphProperties: XmlElement | null,
  numberingMaps: NumberingMaps,
):
  | { list: EditorParagraphListStyle; indent?: NumberingLevel["indent"] }
  | undefined {
  if (!paragraphProperties) return undefined;
  const numPr = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "numPr");
  if (!numPr) return undefined;
  const numId = getAttributeValue(
    getFirstChildByTagNameNS(numPr, WORD_NS, "numId"),
    "val",
  );
  if (!numId) return undefined;
  const ilvlRaw =
    getAttributeValue(
      getFirstChildByTagNameNS(numPr, WORD_NS, "ilvl"),
      "val",
    ) ?? "0";
  const level = Number.parseInt(ilvlRaw, 10);
  const safeLevel = Number.isFinite(level) ? level : 0;
  const effective = effectiveLevel(numberingMaps, numId, safeLevel);
  const levelFormats: ListFormat[] = [];
  for (let index = 0; index <= safeLevel; index += 1) {
    levelFormats[index] =
      effectiveLevel(numberingMaps, numId, index).format ?? "decimal";
  }

  const instanceKey = `${numId}:${safeLevel}`;
  const isFirstInInstance = !numberingMaps.seenInstances.has(instanceKey);
  numberingMaps.seenInstances.add(instanceKey);
  const startAt = isFirstInInstance
    ? (numberingMaps.numStartOverrides.get(instanceKey) ?? effective.startAt)
    : undefined;

  return {
    list: {
      kind: effective.kind ?? "ordered",
      level: safeLevel,
      instanceId: numId,
      suffix: effective.suffix ?? "tab",
      ...(effective.format ? { format: effective.format } : {}),
      ...(levelFormats.length ? { levelFormats } : {}),
      ...(effective.levelText ? { levelText: effective.levelText } : {}),
      ...(effective.alignment ? { alignment: effective.alignment } : {}),
      ...(effective.legal !== undefined ? { legal: effective.legal } : {}),
      ...(startAt !== undefined && startAt !== 1 ? { startAt } : {}),
      ...(effective.bulletGlyph ? { bulletGlyph: effective.bulletGlyph } : {}),
      ...(effective.bulletFont ? { bulletFont: effective.bulletFont } : {}),
    },
    indent: effective.indent,
  };
}
