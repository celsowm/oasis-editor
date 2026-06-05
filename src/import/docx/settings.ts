import { DOMParser } from "@xmldom/xmldom";
import {
  WORD_NS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";
import { twipsToPoints } from "./units.js";

export interface DocxSettings {
  adjustLineHeightInTable: boolean;
  defaultTabStop?: number;
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
  }
  return settings;
}
