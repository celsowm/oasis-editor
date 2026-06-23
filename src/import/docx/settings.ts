import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import {
  WORD_NS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";
import { twipsToPoints } from "./units.js";
import type {
  EditorFootnoteNumberFormat,
  EditorFootnoteRestart,
  EditorFootnoteSettings,
  EditorEndnoteSettings,
} from "@/core/model.js";

export interface DocxSettings {
  adjustLineHeightInTable: boolean;
  allowSpaceOfSameStyleInTable?: boolean;
  defaultTabStop?: number;
  footnoteSettings?: EditorFootnoteSettings;
  endnoteSettings?: EditorEndnoteSettings;
}

const NOTE_NUMBER_FORMATS: Record<string, EditorFootnoteNumberFormat> = {
  decimal: "decimal",
  lowerRoman: "lowerRoman",
  upperRoman: "upperRoman",
  lowerLetter: "lowerLetter",
  upperLetter: "upperLetter",
  symbol: "symbol",
};

const NOTE_RESTARTS: Record<string, EditorFootnoteRestart> = {
  continuous: "continuous",
  eachSect: "eachSection",
};

function parseNoteSettings(
  element: XmlElement | null,
): EditorFootnoteSettings | undefined {
  if (!element) return undefined;

  const settings: EditorFootnoteSettings = {};
  const numFmt = getAttributeValue(
    getFirstChildByTagNameNS(element, WORD_NS, "numFmt"),
    "val",
  );
  if (numFmt && NOTE_NUMBER_FORMATS[numFmt]) {
    settings.numberFormat = NOTE_NUMBER_FORMATS[numFmt];
  }

  const numStart = Number.parseInt(
    getAttributeValue(
      getFirstChildByTagNameNS(element, WORD_NS, "numStart"),
      "val",
    ) ?? "",
    10,
  );
  if (Number.isFinite(numStart) && numStart > 0) {
    settings.startAt = numStart;
  }

  const numRestart = getAttributeValue(
    getFirstChildByTagNameNS(element, WORD_NS, "numRestart"),
    "val",
  );
  if (numRestart && NOTE_RESTARTS[numRestart]) {
    settings.restart = NOTE_RESTARTS[numRestart];
  }

  return Object.keys(settings).length > 0 ? settings : undefined;
}

export function parseSettings(xml: string | null): DocxSettings {
  const settings: DocxSettings = {
    adjustLineHeightInTable: true, // Default to true for parity
  };
  if (!xml) {
    return settings;
  }

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const defaultTabStop = twipsToPoints(
    getAttributeValue(
      getFirstChildByTagNameNS(doc.documentElement, WORD_NS, "defaultTabStop"),
      "val",
    ),
  );
  if (defaultTabStop !== undefined) {
    settings.defaultTabStop = defaultTabStop;
  }
  settings.footnoteSettings = parseNoteSettings(
    getFirstChildByTagNameNS(doc.documentElement, WORD_NS, "footnotePr"),
  );
  settings.endnoteSettings = parseNoteSettings(
    getFirstChildByTagNameNS(doc.documentElement, WORD_NS, "endnotePr"),
  );
  const compat = getFirstChildByTagNameNS(
    doc.documentElement,
    WORD_NS,
    "compat",
  );
  if (compat) {
    const adjustLineHeightInTable = getFirstChildByTagNameNS(
      compat,
      WORD_NS,
      "adjustLineHeightInTable",
    );
    if (adjustLineHeightInTable) {
      const val = getAttributeValue(adjustLineHeightInTable, "val");
      settings.adjustLineHeightInTable = val !== "0" && val !== "false";
    }
    const allowSpace = getFirstChildByTagNameNS(
      compat,
      WORD_NS,
      "allowSpaceOfSameStyleInTable",
    );
    if (allowSpace) {
      const val = getAttributeValue(allowSpace, "val");
      settings.allowSpaceOfSameStyleInTable = val !== "0" && val !== "false";
    }
  }
  return settings;
}
