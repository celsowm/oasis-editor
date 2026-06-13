import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorParagraphListStyle } from "../../core/model.js";
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
  /** numId → abstractNumId */
  numToAbstractId: Map<string, string>;
}

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
  const numToAbstractId = new Map<string, string>();

  if (!numberingXml) {
    return {
      abstractKinds,
      numKinds,
      abstractIndents,
      abstractSuffixes,
      numToAbstractId,
    };
  }

  const document = new DOMParser().parseFromString(
    numberingXml,
    "application/xml",
  );
  const numbering = document.documentElement;
  if (!numbering) {
    return {
      abstractKinds,
      numKinds,
      abstractIndents,
      abstractSuffixes,
      numToAbstractId,
    };
  }

  const abstractNums = numbering.getElementsByTagNameNS(WORD_NS, "abstractNum");
  for (let index = 0; index < abstractNums.length; index += 1) {
    const abstractNum = abstractNums[index]!;
    const abstractId = getAttributeValue(abstractNum, "abstractNumId");
    if (!abstractId) continue;

    for (const level of getChildrenByTagNameNS(abstractNum, WORD_NS, "lvl")) {
      const ilvl = getAttributeValue(level, "ilvl") ?? "0";
      const numFmt = getFirstChildByTagNameNS(level, WORD_NS, "numFmt");
      const format = getAttributeValue(numFmt, "val");
      if (format) {
        abstractKinds.set(
          `${abstractId}:${ilvl}`,
          format === "bullet" ? "bullet" : "ordered",
        );
        // Keep a level-0 fallback keyed by just abstractId for backward compat.
        if (ilvl === "0") {
          abstractKinds.set(
            abstractId,
            format === "bullet" ? "bullet" : "ordered",
          );
        }
      }

      const suffRaw = getAttributeValue(
        getFirstChildByTagNameNS(level, WORD_NS, "suff"),
        "val",
      );
      if (suffRaw === "space" || suffRaw === "nothing" || suffRaw === "tab") {
        abstractSuffixes.set(`${abstractId}:${ilvl}`, suffRaw);
      }

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
          abstractIndents.set(`${abstractId}:${ilvl}`, { left, hanging });
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
  }

  return {
    abstractKinds,
    numKinds,
    abstractIndents,
    abstractSuffixes,
    numToAbstractId,
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
  const indent = abstractId
    ? numberingMaps.abstractIndents.get(`${abstractId}:${ilvlValue}`)
    : undefined;
  // OOXML default suffix is "tab" when w:suff is absent.
  const suffix =
    (abstractId
      ? numberingMaps.abstractSuffixes.get(`${abstractId}:${ilvlValue}`)
      : undefined) ?? "tab";

  return {
    list: {
      kind: numberingMaps.numKinds.get(numId) ?? "ordered",
      level: Number.isFinite(level) ? level : 0,
      suffix,
    },
    indent,
  };
}
