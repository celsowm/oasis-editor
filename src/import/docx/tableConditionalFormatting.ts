import { type Element as XmlElement } from "@xmldom/xmldom";
import {
  WORD_NS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  isWordTrue,
} from "./xmlHelpers.js";

// Parses `w:tblLook`, the table-style mask that gates which conditional formats
// (banding / first-last row-col / corner cells) apply. The actual per-cell
// resolution and merge lives in `core/tableStyleResolver.ts`, driven by cell
// position + this mask. See the `table-style-conditional-formatting` note.

export interface TableLook {
  firstRow: boolean;
  lastRow: boolean;
  firstCol: boolean;
  lastCol: boolean;
  noHBand: boolean;
  noVBand: boolean;
}

/**
 * Parses `w:tblLook`, which gates which table-style conditional formats apply.
 * Supports both the modern individual attributes (`firstRow`, `firstColumn`,
 * `noVBand`, ...) and the legacy hex bitmask in `@w:val`. When the element is
 * absent we default to Word's common case: first row + first column on, banding
 * on.
 */
export function parseTableLook(tblPr: XmlElement | null): TableLook {
  const element = getFirstChildByTagNameNS(tblPr, WORD_NS, "tblLook");
  const attr = (name: string): boolean | undefined => {
    const value = getAttributeValue(element, name);
    return value === null || value === "" ? undefined : isWordTrue(value);
  };
  const rawVal = getAttributeValue(element, "val");
  const mask = rawVal ? Number.parseInt(rawVal, 16) : Number.NaN;
  const bit = (flag: number): boolean | undefined =>
    Number.isFinite(mask) ? (mask & flag) !== 0 : undefined;

  return {
    firstRow: attr("firstRow") ?? bit(0x0020) ?? true,
    lastRow: attr("lastRow") ?? bit(0x0040) ?? false,
    firstCol: attr("firstColumn") ?? bit(0x0080) ?? true,
    lastCol: attr("lastColumn") ?? bit(0x0100) ?? false,
    noHBand: attr("noHBand") ?? bit(0x0200) ?? false,
    noVBand: attr("noVBand") ?? bit(0x0400) ?? false,
  };
}
