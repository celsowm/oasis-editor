import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTableConditionalFormat,
  EditorTextStyle,
} from "@/core/model.js";
import {
  resolveDefaultParagraphStyleId,
  resolveNamedParagraphStyle,
} from "@/core/model.js";
import {
  WORD_NS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  isWordTrue,
} from "./xmlHelpers.js";
import { emptyOrUndefined } from "./styleUtils.js";

// Table-style conditional formatting (banding / first-last row-col / corner
// cells) and table-style paragraph inheritance. Resolved from cell position +
// `w:tblLook` rather than `w:cnfStyle`. Extracted from tables.ts (S2). See the
// `table-style-conditional-formatting` note.

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

/**
 * Returns the table-style conditional-format keys that apply to a cell at the
 * given position, ordered low→high precedence (later entries override earlier
 * ones). Mirrors Word's resolution order: whole table < bands < first/last col
 * < first/last row < corner cells. Banding and first/last row/col are gated by
 * `tblLook`; banding parity is computed over the "body" rows/cols that remain
 * after excluding the special first/last row/col.
 */
export function resolveCellConditionalKeys(
  rowIndex: number,
  colIndex: number,
  rowCount: number,
  colCount: number,
  look: TableLook,
  rowBandSize: number,
  colBandSize: number,
): string[] {
  const isFirstRow = look.firstRow && rowIndex === 0;
  const isLastRow = look.lastRow && rowIndex === rowCount - 1 && rowIndex !== 0;
  const isFirstCol = look.firstCol && colIndex === 0;
  const isLastCol = look.lastCol && colIndex === colCount - 1 && colIndex !== 0;

  const keys: string[] = [];

  // Horizontal banding over body rows (those that are not the special first/last
  // row). Word's first body row is band1.
  if (!look.noHBand && !isFirstRow && !isLastRow) {
    const bodyRow = rowIndex - (look.firstRow ? 1 : 0);
    const band = Math.floor(bodyRow / Math.max(1, rowBandSize)) % 2;
    keys.push(band === 0 ? "band1Horz" : "band2Horz");
  }
  // Vertical banding over body columns.
  if (!look.noVBand && !isFirstCol && !isLastCol) {
    const bodyCol = colIndex - (look.firstCol ? 1 : 0);
    const band = Math.floor(bodyCol / Math.max(1, colBandSize)) % 2;
    keys.push(band === 0 ? "band1Vert" : "band2Vert");
  }

  if (isLastCol) keys.push("lastCol");
  if (isFirstCol) keys.push("firstCol");
  if (isLastRow) keys.push("lastRow");
  if (isFirstRow) keys.push("firstRow");

  // Corner cells have the highest precedence.
  if (isFirstRow && isFirstCol) keys.push("nwCell");
  if (isFirstRow && isLastCol) keys.push("neCell");
  if (isLastRow && isFirstCol) keys.push("swCell");
  if (isLastRow && isLastCol) keys.push("seCell");

  return keys;
}

/** Merges resolved conditional formats (low→high precedence) into one. */
export function mergeConditionalFormats(
  keys: string[],
  conditionals: Record<string, EditorTableConditionalFormat> | undefined,
): EditorTableConditionalFormat {
  const merged: EditorTableConditionalFormat = {};
  if (!conditionals) {
    return merged;
  }
  for (const key of keys) {
    const cond = conditionals[key];
    if (!cond) continue;
    if (cond.shading) merged.shading = cond.shading;
    if (cond.textStyle) {
      merged.textStyle = { ...merged.textStyle, ...cond.textStyle };
    }
    if (cond.borders) {
      merged.borders = { ...merged.borders, ...cond.borders };
    }
    if (cond.paragraphStyle) {
      merged.paragraphStyle = {
        ...merged.paragraphStyle,
        ...cond.paragraphStyle,
      };
    }
    if (cond.rowStyle) {
      merged.rowStyle = { ...merged.rowStyle, ...cond.rowStyle };
    }
  }
  return merged;
}

/**
 * Applies a conditional run text style (bold/color from the table style)
 * beneath each run's own style, so explicit run formatting still wins.
 */
export function applyConditionalTextStyle(
  paragraphs: EditorParagraphNode[],
  textStyle: EditorTextStyle | undefined,
): void {
  if (!textStyle || Object.keys(textStyle).length === 0) {
    return;
  }
  for (const paragraph of paragraphs) {
    for (const run of paragraph.runs) {
      run.styles = { ...textStyle, ...run.styles };
    }
  }
}

/**
 * Filter a table style's paragraph properties (its `<w:pPr>`) so they sit at the
 * correct OOXML precedence for a given cell paragraph.
 *
 * Per ECMA-376 §17.7.2 the order (low → high) is:
 *   docDefaults < table style < paragraph style < direct formatting.
 * So any property the paragraph's own (named) style explicitly defines must win
 * over the table style. We strip those keys from the inherited table-style pPr;
 * what remains only fills gaps the paragraph style leaves open. Without this, a
 * table style like `TableGrid` (which sets `spacing after="0"`) would wrongly
 * override Normal's `after="120"` and collapse cell row height vs Word.
 */
export function tableStyleParagraphInheritance(
  tableStylePPr: EditorParagraphStyle | undefined,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): EditorParagraphStyle | undefined {
  if (!tableStylePPr) {
    return undefined;
  }
  const effectiveStyleId =
    paragraphStyleId ?? resolveDefaultParagraphStyleId(styles);
  const paragraphStyleDelta = resolveNamedParagraphStyle(
    effectiveStyleId,
    styles,
  );
  const definedByParagraphStyle = new Set(Object.keys(paragraphStyleDelta));
  const filtered: EditorParagraphStyle = {};
  for (const [key, value] of Object.entries(tableStylePPr)) {
    if (!definedByParagraphStyle.has(key)) {
      (filtered as Record<string, unknown>)[key] = value;
    }
  }
  return emptyOrUndefined(filtered);
}
