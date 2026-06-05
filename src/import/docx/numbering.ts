import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorParagraphListStyle } from "../../core/model.js";
import {
  WORD_NS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";

export interface NumberingMaps {
  abstractKinds: Map<string, EditorParagraphListStyle["kind"]>;
  numKinds: Map<string, EditorParagraphListStyle["kind"]>;
}

export function parseNumbering(numberingXml: string | null): NumberingMaps {
  const abstractKinds = new Map<string, EditorParagraphListStyle["kind"]>();
  const numKinds = new Map<string, EditorParagraphListStyle["kind"]>();

  if (!numberingXml) {
    return { abstractKinds, numKinds };
  }

  const document = new DOMParser().parseFromString(
    numberingXml,
    "application/xml",
  );
  const numbering = document.documentElement;
  if (!numbering) {
    return { abstractKinds, numKinds };
  }

  const abstractNums = numbering.getElementsByTagNameNS(WORD_NS, "abstractNum");
  for (let index = 0; index < abstractNums.length; index += 1) {
    const abstractNum = abstractNums[index]!;
    const abstractId = getAttributeValue(abstractNum, "abstractNumId");
    const level = getFirstChildByTagNameNS(abstractNum, WORD_NS, "lvl");
    const numFmt = getFirstChildByTagNameNS(
      level ?? abstractNum,
      WORD_NS,
      "numFmt",
    );
    const format = getAttributeValue(numFmt, "val");
    if (!abstractId || !format) {
      continue;
    }

    abstractKinds.set(abstractId, format === "bullet" ? "bullet" : "ordered");
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

    numKinds.set(numId, abstractKinds.get(abstractNumId) ?? "ordered");
  }

  return { abstractKinds, numKinds };
}

export function parseParagraphList(
  paragraphProperties: XmlElement | null,
  numberingMaps: NumberingMaps,
): EditorParagraphListStyle | undefined {
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

  const ilvlValue = getAttributeValue(
    getFirstChildByTagNameNS(numPr, WORD_NS, "ilvl"),
    "val",
  );
  const level = ilvlValue ? Number(ilvlValue) : 0;

  return {
    kind: numberingMaps.numKinds.get(numId) ?? "ordered",
    level: Number.isFinite(level) ? level : 0,
  };
}
