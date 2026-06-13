import JSZip from "jszip";
import { XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorDocxWidthValue,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorTableCellStyle,
  EditorTableConditionalFormat,
  EditorTableLayout,
  EditorTableNode,
  EditorTableRowNode,
  EditorTableRowStyle,
  EditorTableStyle,
  EditorTextStyle,
} from "../../core/model.js";
import {
  createEditorParagraphFromRuns,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "../../core/editorState.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  isWordTrue,
  parseOnOffProperty,
  parseTextDirection,
} from "./xmlHelpers.js";
import {
  type EditorTableBorders,
  parseDocxBoxBorders,
  parseDocxTableBorders,
} from "./borders.js";
import { twipsToPoints } from "./units.js";
import { emptyOrUndefined, parseShdFill } from "./styleUtils.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { type NumberingMaps } from "./numbering.js";
import { parseParagraphNode } from "./paragraphs.js";
import {
  parseAutospacingFlags,
  type ParagraphAutospacingFlags,
} from "./paragraphStyle.js";

/**
 * Parses a DOCX width-like element (e.g. w:tblW, w:tblInd, w:tblCellSpacing,
 * w:wBefore, w:wAfter) into an editor width value:
 * - type="dxa" (or missing type) -> points (number)
 * - type="pct" -> "NN%" string
 * - type="auto" -> "auto"
 */
function parseDocxWidthValue(
  element: XmlElement | null,
): EditorDocxWidthValue | undefined {
  if (!element) {
    return undefined;
  }

  const type = getAttributeValue(element, "type");
  const raw = getAttributeValue(element, "w");

  if (type === "auto") {
    return "auto";
  }

  if (type === "pct") {
    if (!raw) {
      return undefined;
    }
    const pct = raw.trim().endsWith("%")
      ? Number.parseFloat(raw)
      : Number(raw) / 50;
    return Number.isFinite(pct)
      ? `${Math.round(pct * 10000) / 10000}%`
      : undefined;
  }

  // Missing or "dxa" type is treated as twips.
  return twipsToPoints(raw);
}

function parsePositiveIntegerProperty(
  parent: XmlElement | null,
  localName: string,
): number | undefined {
  const element = getFirstChildByTagNameNS(parent, WORD_NS, localName);
  const raw = getAttributeValue(element, "val");
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function serializeChildXml(
  parent: XmlElement | null,
  localNames: string[],
): string[] | undefined {
  if (!parent) {
    return undefined;
  }
  const names = new Set(localNames);
  const serializer = new XMLSerializer();
  const result: string[] = [];
  const children = parent.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (
      node?.nodeType === node.ELEMENT_NODE &&
      (node as XmlElement).namespaceURI === WORD_NS &&
      names.has((node as XmlElement).localName ?? "")
    ) {
      result.push(serializer.serializeToString(node as XmlElement));
    }
  }
  return result.length > 0 ? result : undefined;
}

function parseFloatingTableProperties(
  tblPr: XmlElement | null,
): Record<string, string> | undefined {
  const tblpPr = getFirstChildByTagNameNS(tblPr, WORD_NS, "tblpPr");
  if (!tblpPr || !tblpPr.attributes || tblpPr.attributes.length === 0) {
    return undefined;
  }
  const floating: Record<string, string> = {};
  for (let index = 0; index < tblpPr.attributes.length; index += 1) {
    const attr = tblpPr.attributes.item(index);
    if (attr?.namespaceURI === WORD_NS || attr?.prefix === "w") {
      floating[attr.localName || attr.name.replace(/^w:/, "")] = attr.value;
    }
  }
  return Object.keys(floating).length > 0 ? floating : undefined;
}

function parseCellMargins(
  container: XmlElement | null,
): EditorTableStyle["defaultCellMargins"] | undefined {
  if (!container) {
    return undefined;
  }
  const edgePt = (edge: string) =>
    twipsToPoints(
      getAttributeValue(
        getFirstChildByTagNameNS(container, WORD_NS, edge),
        "w",
      ),
    );
  const margins: NonNullable<EditorTableStyle["defaultCellMargins"]> = {};
  const top = edgePt("top");
  const right = edgePt("right");
  const bottom = edgePt("bottom");
  const left = edgePt("left");
  const start = edgePt("start");
  const end = edgePt("end");
  if (top !== undefined) margins.top = top;
  if (right !== undefined) margins.right = right;
  if (bottom !== undefined) margins.bottom = bottom;
  if (left !== undefined) margins.left = left;
  if (start !== undefined) margins.start = start;
  if (end !== undefined) margins.end = end;
  return Object.keys(margins).length > 0 ? margins : undefined;
}

function parseTableLayout(
  tblPr: XmlElement | null,
): EditorTableLayout | undefined {
  const value = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblLayout"),
    "type",
  );
  return value === "fixed" || value === "autofit" ? value : undefined;
}

function parseTableStyle(
  tblPr: XmlElement | null,
  tableStyleId?: string,
): EditorTableStyle | undefined {
  const style: EditorTableStyle = {};

  if (tableStyleId) {
    style.styleId = tableStyleId;
  }

  const altTitle = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblCaption"),
    "val",
  );
  if (altTitle) {
    style.altTitle = altTitle;
  }

  const altDescription = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblDescription"),
    "val",
  );
  if (altDescription) {
    style.altDescription = altDescription;
  }

  const width = parseDocxWidthValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblW"),
  );
  if (width !== undefined) {
    style.width = width;
  }

  const indentLeft = parseDocxWidthValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblInd"),
  );
  if (indentLeft !== undefined) {
    style.indentLeft = indentLeft;
  }

  const jc = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "jc"),
    "val",
  );
  if (jc === "left" || jc === "center" || jc === "right") {
    style.align = jc;
  }

  const layout = parseTableLayout(tblPr);
  if (layout) {
    style.layout = layout;
  }

  const cellSpacing = parseDocxWidthValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblCellSpacing"),
  );
  if (cellSpacing !== undefined) {
    style.cellSpacing = cellSpacing;
  }

  const defaultCellMargins = parseCellMargins(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblCellMar"),
  );
  if (defaultCellMargins) {
    style.defaultCellMargins = defaultCellMargins;
  }

  const bidiVisual = tblPr
    ? parseOnOffProperty(tblPr, "bidiVisual")
    : undefined;
  if (bidiVisual !== undefined) {
    style.bidiVisual = bidiVisual;
  }

  const tblOverlap = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblOverlap"),
    "val",
  );
  if (tblOverlap) {
    style.tblOverlap = tblOverlap;
  }

  const floating = parseFloatingTableProperties(tblPr);
  if (floating) {
    style.floating = floating;
  }

  const revisionXml = serializeChildXml(tblPr, ["tblPrChange"]);
  if (revisionXml) {
    style.revisionXml = revisionXml;
  }

  return emptyOrUndefined(style);
}

function parseTableRowStyle(
  rowProperties: XmlElement | null,
): EditorTableRowStyle | undefined {
  if (!rowProperties) {
    return undefined;
  }

  const style: EditorTableRowStyle = {};

  const gridBefore = parsePositiveIntegerProperty(rowProperties, "gridBefore");
  if (gridBefore !== undefined) {
    style.gridBefore = gridBefore;
  }

  const gridAfter = parsePositiveIntegerProperty(rowProperties, "gridAfter");
  if (gridAfter !== undefined) {
    style.gridAfter = gridAfter;
  }

  const widthBefore = parseDocxWidthValue(
    getFirstChildByTagNameNS(rowProperties, WORD_NS, "wBefore"),
  );
  if (widthBefore !== undefined) {
    style.widthBefore = widthBefore;
  }

  const widthAfter = parseDocxWidthValue(
    getFirstChildByTagNameNS(rowProperties, WORD_NS, "wAfter"),
  );
  if (widthAfter !== undefined) {
    style.widthAfter = widthAfter;
  }

  const trHeight = getFirstChildByTagNameNS(rowProperties, WORD_NS, "trHeight");
  const height = twipsToPoints(getAttributeValue(trHeight, "val"));
  if (height !== undefined) {
    style.height = height;
  }
  const hRule = getAttributeValue(trHeight, "hRule");
  if (hRule === "auto" || hRule === "exact" || hRule === "atLeast") {
    style.heightRule = hRule;
  }

  const cellSpacing = parseDocxWidthValue(
    getFirstChildByTagNameNS(rowProperties, WORD_NS, "tblCellSpacing"),
  );
  if (cellSpacing !== undefined) {
    style.cellSpacing = cellSpacing;
  }

  const cantSplit = parseOnOffProperty(rowProperties, "cantSplit");
  if (cantSplit !== undefined) {
    style.cantSplit = cantSplit;
  }
  const hidden = parseOnOffProperty(rowProperties, "hidden");
  if (hidden !== undefined) {
    style.hidden = hidden;
  }

  const revisionXml = serializeChildXml(rowProperties, [
    "trPrChange",
    "ins",
    "del",
  ]);
  if (revisionXml) {
    style.revisionXml = revisionXml;
  }

  return emptyOrUndefined(style);
}

function getTableCellColSpan(cellProperties: XmlElement | null): number {
  if (!cellProperties) {
    return 1;
  }

  const gridSpan = getFirstChildByTagNameNS(
    cellProperties,
    WORD_NS,
    "gridSpan",
  );
  const value = getAttributeValue(gridSpan, "val");
  const parsed = value ? Number(value) : 1;
  return Number.isFinite(parsed) && parsed > 1 ? Math.floor(parsed) : 1;
}

function getTableCellVMerge(
  cellProperties: XmlElement | null,
): "restart" | "continue" | undefined {
  if (!cellProperties) {
    return undefined;
  }

  const vMerge = getFirstChildByTagNameNS(cellProperties, WORD_NS, "vMerge");
  if (!vMerge) {
    return undefined;
  }

  const value = getAttributeValue(vMerge, "val");
  return value === "restart" ? "restart" : "continue";
}

function parseTableCellVerticalAlign(
  cellProperties: XmlElement | null,
): EditorTableCellStyle["verticalAlign"] | undefined {
  if (!cellProperties) {
    return undefined;
  }

  const vAlign = getFirstChildByTagNameNS(cellProperties, WORD_NS, "vAlign");
  const value = getAttributeValue(vAlign, "val");
  if (value === "top" || value === "bottom") {
    return value;
  }
  if (value === "center") {
    return "middle";
  }
  return undefined;
}

function parseTableCellBorders(
  cellProperties: XmlElement | null,
): Partial<EditorTableCellStyle> {
  if (!cellProperties) {
    return {};
  }

  return parseDocxBoxBorders(
    getFirstChildByTagNameNS(cellProperties, WORD_NS, "tcBorders"),
  );
}

function parseTableCellStyle(
  cellProperties: XmlElement | null,
  tableDefaultMargins?: EditorTableStyle["defaultCellMargins"],
): EditorTableCellStyle | undefined {
  if (!cellProperties) {
    if (!tableDefaultMargins) {
      return undefined;
    }
    return emptyOrUndefined({
      paddingTop: tableDefaultMargins.top,
      paddingRight: tableDefaultMargins.right,
      paddingBottom: tableDefaultMargins.bottom,
      paddingLeft: tableDefaultMargins.left,
      paddingStart: tableDefaultMargins.start,
      paddingEnd: tableDefaultMargins.end,
    });
  }

  const style: EditorTableCellStyle = {
    ...(tableDefaultMargins?.top !== undefined
      ? { paddingTop: tableDefaultMargins.top }
      : {}),
    ...(tableDefaultMargins?.right !== undefined
      ? { paddingRight: tableDefaultMargins.right }
      : {}),
    ...(tableDefaultMargins?.bottom !== undefined
      ? { paddingBottom: tableDefaultMargins.bottom }
      : {}),
    ...(tableDefaultMargins?.left !== undefined
      ? { paddingLeft: tableDefaultMargins.left }
      : {}),
    ...(tableDefaultMargins?.start !== undefined
      ? { paddingStart: tableDefaultMargins.start }
      : {}),
    ...(tableDefaultMargins?.end !== undefined
      ? { paddingEnd: tableDefaultMargins.end }
      : {}),
  };
  const shading = getFirstChildByTagNameNS(cellProperties, WORD_NS, "shd");
  const fill = parseShdFill(shading);
  if (fill) {
    style.shading = fill;
  }

  const cellWidth = getFirstChildByTagNameNS(cellProperties, WORD_NS, "tcW");
  const cellWidthType = getAttributeValue(cellWidth, "type");
  const cellWidthValue = getAttributeValue(cellWidth, "w");
  if (cellWidthType === "dxa") {
    const width = twipsToPoints(cellWidthValue);
    if (width !== undefined) {
      style.width = width;
    }
  } else if (cellWidthType === "pct" && cellWidthValue) {
    const pct = Number(cellWidthValue);
    if (Number.isFinite(pct)) {
      style.width = `${Math.round((pct / 50) * 10000) / 10000}%`;
    }
  }

  const tcMar = parseCellMargins(
    getFirstChildByTagNameNS(cellProperties, WORD_NS, "tcMar"),
  );
  if (tcMar) {
    if (tcMar.top !== undefined) style.paddingTop = tcMar.top;
    if (tcMar.bottom !== undefined) style.paddingBottom = tcMar.bottom;
    if (tcMar.left !== undefined) style.paddingLeft = tcMar.left;
    if (tcMar.right !== undefined) style.paddingRight = tcMar.right;
    if (tcMar.start !== undefined) style.paddingStart = tcMar.start;
    if (tcMar.end !== undefined) style.paddingEnd = tcMar.end;
  }

  const verticalAlign = parseTableCellVerticalAlign(cellProperties);
  if (verticalAlign) {
    style.verticalAlign = verticalAlign;
  }

  const textDirection = parseTextDirection(
    getAttributeValue(
      getFirstChildByTagNameNS(cellProperties, WORD_NS, "textDirection"),
      "val",
    ),
  );
  if (textDirection) {
    style.textDirection = textDirection;
  }

  const noWrap = parseOnOffProperty(cellProperties, "noWrap");
  if (noWrap !== undefined) {
    style.noWrap = noWrap;
  }
  const fitText = parseOnOffProperty(cellProperties, "tcFitText");
  if (fitText !== undefined) {
    style.fitText = fitText;
  }
  const hideMark = parseOnOffProperty(cellProperties, "hideMark");
  if (hideMark !== undefined) {
    style.hideMark = hideMark;
  }
  const headers = getAttributeValue(
    getFirstChildByTagNameNS(cellProperties, WORD_NS, "headers"),
    "val",
  );
  if (headers) {
    style.headers = headers;
  }
  const revisionXml = serializeChildXml(cellProperties, [
    "tcPrChange",
    "cellIns",
    "cellDel",
    "cellMerge",
  ]);
  if (revisionXml) {
    style.revisionXml = revisionXml;
  }

  for (const [key, border] of Object.entries(
    parseTableCellBorders(cellProperties),
  )) {
    if (border) {
      (style as Record<string, unknown>)[key] = border;
    }
  }

  return emptyOrUndefined(style);
}

function isTableHeaderRow(rowNode: XmlElement): boolean {
  const rowProperties = getFirstChildByTagNameNS(rowNode, WORD_NS, "trPr");
  return rowProperties
    ? parseOnOffProperty(rowProperties, "tblHeader") === true
    : false;
}

/**
 * Reproduces Word's HTML-style margin collapsing for paragraphs that use "auto
 * spacing" (`w:beforeAutospacing` / `w:afterAutospacing`) inside a table cell.
 * Word ignores the literal before/after values for these margins and collapses
 * them: the first paragraph's auto before-space and the last paragraph's auto
 * after-space collapse to 0 against the cell edge, and two adjacent auto margins
 * collapse to their max instead of summing. Without this, oasis renders cells
 * taller than Word because every paragraph's spacing is summed in full.
 *
 * The flags array is parallel to `paragraphs` (one entry per `<w:p>` in the cell).
 */
function collapseCellAutospacing(
  paragraphs: EditorParagraphNode[],
  flags: ParagraphAutospacingFlags[],
): void {
  const styleOf = (paragraph: EditorParagraphNode) => (paragraph.style ??= {});

  const lastIndex = paragraphs.length - 1;
  for (let index = 0; index < paragraphs.length; index += 1) {
    const flag = flags[index];
    if (!flag) {
      continue;
    }
    if (index === 0 && flag.before) {
      styleOf(paragraphs[index]!).spacingBefore = 0;
    }
    if (index === lastIndex && flag.after) {
      styleOf(paragraphs[index]!).spacingAfter = 0;
    }
  }

  for (let index = 0; index < lastIndex; index += 1) {
    if (!flags[index]?.after || !flags[index + 1]?.before) {
      continue;
    }
    const prev = styleOf(paragraphs[index]!);
    const next = styleOf(paragraphs[index + 1]!);
    // Collapse the adjacent auto margins into a single gap = max(after, before).
    if ((prev.spacingAfter ?? 0) >= (next.spacingBefore ?? 0)) {
      next.spacingBefore = 0;
    } else {
      prev.spacingAfter = 0;
    }
  }
}

function applyTableBordersToRows(
  rows: EditorTableRowNode[],
  tblBorders: EditorTableBorders,
): void {
  if (Object.keys(tblBorders).length === 0) {
    return;
  }

  const lastRowIndex = rows.length - 1;
  for (let rowIndex = 0; rowIndex <= lastRowIndex; rowIndex += 1) {
    const row = rows[rowIndex]!;
    const lastColIndex = row.cells.length - 1;
    for (let colIndex = 0; colIndex <= lastColIndex; colIndex += 1) {
      const cell = row.cells[colIndex]!;
      const style: EditorTableCellStyle = cell.style ?? {};

      if (
        rowIndex === 0 &&
        style.borderTop === undefined &&
        tblBorders.borderTop
      ) {
        style.borderTop = tblBorders.borderTop;
      }
      if (
        rowIndex === lastRowIndex &&
        style.borderBottom === undefined &&
        tblBorders.borderBottom
      ) {
        style.borderBottom = tblBorders.borderBottom;
      }
      if (
        colIndex === 0 &&
        style.borderLeft === undefined &&
        tblBorders.borderLeft
      ) {
        style.borderLeft = tblBorders.borderLeft;
      }
      if (
        colIndex === lastColIndex &&
        style.borderRight === undefined &&
        tblBorders.borderRight
      ) {
        style.borderRight = tblBorders.borderRight;
      }
      if (
        rowIndex < lastRowIndex &&
        style.borderBottom === undefined &&
        tblBorders.borderInsideH
      ) {
        style.borderBottom = tblBorders.borderInsideH;
      }
      if (
        colIndex < lastColIndex &&
        style.borderRight === undefined &&
        tblBorders.borderInsideV
      ) {
        style.borderRight = tblBorders.borderInsideV;
      }

      if (Object.keys(style).length > 0 && cell.style !== style) {
        cell.style = style;
      }
    }
  }
}

interface TableLook {
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
function parseTableLook(tblPr: XmlElement | null): TableLook {
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
function resolveCellConditionalKeys(
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
function mergeConditionalFormats(
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
  }
  return merged;
}

/**
 * Applies a conditional run text style (bold/color from the table style)
 * beneath each run's own style, so explicit run formatting still wins.
 */
function applyConditionalTextStyle(
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

export async function parseTableNode(
  tableNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  styles?: Record<string, EditorNamedStyle>,
): Promise<EditorTableNode> {
  const gridCols: number[] = [];
  const tblGrid = getFirstChildByTagNameNS(tableNode, WORD_NS, "tblGrid");
  if (tblGrid) {
    for (const gridCol of getChildrenByTagNameNS(tblGrid, WORD_NS, "gridCol")) {
      const w = getAttributeValue(gridCol, "w");
      const pt = twipsToPoints(w);
      if (pt !== undefined) {
        gridCols.push(pt);
      }
    }
  }
  const tblGridChangeXml = getFirstChildByTagNameNS(
    tblGrid,
    WORD_NS,
    "tblGridChange",
  );

  const tblPr = getFirstChildByTagNameNS(tableNode, WORD_NS, "tblPr");
  const tableStyleId = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblStyle"),
    "val",
  );
  const inheritedParagraphStyle =
    tableStyleId && styles?.[tableStyleId]?.paragraphStyle
      ? styles[tableStyleId]!.paragraphStyle
      : undefined;
  const tblBorders = parseDocxTableBorders(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblBorders"),
  );

  const tableStyleDef = tableStyleId
    ? styles?.[tableStyleId]?.tableStyle
    : undefined;
  const directTableStyle = parseTableStyle(tblPr, tableStyleId ?? undefined);
  const tableDefaultMargins = directTableStyle?.defaultCellMargins;
  const tblConditionals = tableStyleDef?.conditionalFormats ?? undefined;
  const look = parseTableLook(tblPr);
  const rowBandSize = tableStyleDef?.rowBandSize ?? 1;
  const colBandSize = tableStyleDef?.colBandSize ?? 1;

  const rowNodes = getChildrenByTagNameNS(tableNode, WORD_NS, "tr");
  const rowCount = rowNodes.length;
  const colCount =
    gridCols.length > 0
      ? gridCols.length
      : rowNodes.reduce(
          (max, node) =>
            Math.max(max, getChildrenByTagNameNS(node, WORD_NS, "tc").length),
          0,
        );

  const rows = [];
  for (let rowIndex = 0; rowIndex < rowNodes.length; rowIndex += 1) {
    const rowNode = rowNodes[rowIndex]!;
    const rowProperties = getFirstChildByTagNameNS(rowNode, WORD_NS, "trPr");

    // Explicit per-row `w:cnfStyle` markers act as the highest-precedence
    // conditional source (rare; most styled tables rely on position alone).
    const cnfStyle = getFirstChildByTagNameNS(
      rowProperties,
      WORD_NS,
      "cnfStyle",
    );
    const explicitRowKeys: string[] = [];
    if (getAttributeValue(cnfStyle, "firstRow") === "1") {
      explicitRowKeys.push("firstRow");
    }
    if (getAttributeValue(cnfStyle, "lastRow") === "1") {
      explicitRowKeys.push("lastRow");
    }

    const cellNodes = getChildrenByTagNameNS(rowNode, WORD_NS, "tc");
    const cells = [];
    for (let colIndex = 0; colIndex < cellNodes.length; colIndex += 1) {
      const cellNode = cellNodes[colIndex]!;
      const paragraphs = [];
      const autospacingFlags: ParagraphAutospacingFlags[] = [];
      const cellProperties = getFirstChildByTagNameNS(
        cellNode,
        WORD_NS,
        "tcPr",
      );
      for (const paragraphNode of getChildrenByTagNameNS(
        cellNode,
        WORD_NS,
        "p",
      )) {
        paragraphs.push(
          await parseParagraphNode(
            paragraphNode,
            numberingMaps,
            zip,
            relsMap,
            assets,
            theme,
            inheritedParagraphStyle,
          ),
        );
        autospacingFlags.push(
          parseAutospacingFlags(
            getFirstChildByTagNameNS(paragraphNode, WORD_NS, "pPr"),
          ),
        );
      }
      collapseCellAutospacing(paragraphs, autospacingFlags);
      const colSpan = getTableCellColSpan(cellProperties);
      const vMerge = getTableCellVMerge(cellProperties);
      const cellStyle = parseTableCellStyle(
        cellProperties,
        tableDefaultMargins,
      );

      // Resolve table-style conditional formatting from cell position + tblLook.
      const conditional = mergeConditionalFormats(
        [
          ...resolveCellConditionalKeys(
            rowIndex,
            colIndex,
            rowCount,
            colCount,
            look,
            rowBandSize,
            colBandSize,
          ),
          ...explicitRowKeys,
        ],
        tblConditionals,
      );

      // Conditional run text (bold/header color) sits beneath each run's own
      // style so explicit run formatting still wins.
      applyConditionalTextStyle(paragraphs, conditional.textStyle);

      const cell = createEditorTableCell(
        paragraphs.length > 0
          ? paragraphs
          : [createEditorParagraphFromRuns([{ text: "" }])],
        colSpan,
        vMerge === "restart"
          ? { rowSpan: 1, vMerge }
          : vMerge
            ? { vMerge }
            : undefined,
      );

      // Merge styling, lowest→highest precedence: conditional < explicit cell.
      const mergedStyle: EditorTableCellStyle = { ...(cellStyle ?? {}) };
      // Shading: explicit cell wins, else conditional.
      const resolvedShading = cellStyle?.shading ?? conditional.shading;
      if (resolvedShading) {
        mergedStyle.shading = resolvedShading;
      }
      // Borders: fill each edge from the conditional only where the cell has no
      // explicit border (table-level fallback runs later, lowest precedence).
      if (conditional.borders) {
        for (const edge of [
          "borderTop",
          "borderRight",
          "borderBottom",
          "borderLeft",
        ] as const) {
          const border = conditional.borders[edge];
          if (mergedStyle[edge] === undefined && border) {
            mergedStyle[edge] = border;
          }
        }
      }
      if (Object.keys(mergedStyle).length > 0) {
        cell.style = mergedStyle;
      }
      if (vMerge === "continue") {
        cell.blocks = [];
      }
      cells.push(cell);
    }
    const row = createEditorTableRow(
      cells,
      isTableHeaderRow(rowNode) ? { isHeader: true } : undefined,
    );
    const rowStyle = parseTableRowStyle(rowProperties);
    if (rowStyle) {
      row.style = rowStyle;
    }
    const tblPrEx = getFirstChildByTagNameNS(rowNode, WORD_NS, "tblPrEx");
    if (tblPrEx) {
      row.tblPrExXml = new XMLSerializer().serializeToString(tblPrEx);
    }
    rows.push(row);
  }

  applyTableBordersToRows(rows, tblBorders);

  // Infer rowSpan from restart/continue sequences.
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]!;
    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      const cell = row.cells[cellIndex];
      if (cell.vMerge !== "restart") {
        continue;
      }

      let span = 1;
      for (
        let nextRowIndex = rowIndex + 1;
        nextRowIndex < rows.length;
        nextRowIndex += 1
      ) {
        const nextCell = rows[nextRowIndex]!.cells[cellIndex];
        if (!nextCell || nextCell.vMerge !== "continue") {
          break;
        }
        span += 1;
      }
      if (span > 1) {
        cell.rowSpan = span;
      }
    }
  }

  const table = createEditorTable(
    rows,
    gridCols.length > 0 ? gridCols : undefined,
  );
  if (directTableStyle) {
    table.style = directTableStyle;
  }
  if (tblGridChangeXml) {
    table.tblGridChangeXml = new XMLSerializer().serializeToString(
      tblGridChangeXml,
    );
  }
  return table;
}
