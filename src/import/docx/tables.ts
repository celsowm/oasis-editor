import JSZip from "jszip";
import { XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorDocxWidthValue,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorTableCellStyle,
  EditorTableLayout,
  EditorTableNode,
  EditorTableRowNode,
  EditorTableRowStyle,
  EditorTableStyle,
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
): EditorTableCellStyle | undefined {
  if (!cellProperties) {
    return undefined;
  }

  const style: EditorTableCellStyle = {};
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

  const tcMar = getFirstChildByTagNameNS(cellProperties, WORD_NS, "tcMar");
  if (tcMar) {
    const edgePt = (edge: string) =>
      twipsToPoints(getAttributeValue(getFirstChildByTagNameNS(tcMar, WORD_NS, edge), "w"));
    const top = edgePt("top");
    const bottom = edgePt("bottom");
    const left = edgePt("left");
    const right = edgePt("right");
    if (top !== undefined) style.paddingTop = top;
    if (bottom !== undefined) style.paddingBottom = bottom;
    if (left !== undefined) style.paddingLeft = left;
    if (right !== undefined) style.paddingRight = right;
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

  const tblConditionals =
    tableStyleId && styles?.[tableStyleId]?.tableStyle?.conditionalFormats;

  const rows = [];
  for (const rowNode of getChildrenByTagNameNS(tableNode, WORD_NS, "tr")) {
    const rowProperties = getFirstChildByTagNameNS(rowNode, WORD_NS, "trPr");

    // Determine which conditional format type applies to this row.
    const cnfStyle = getFirstChildByTagNameNS(rowProperties, WORD_NS, "cnfStyle");
    const rowCondType =
      getAttributeValue(cnfStyle, "firstRow") === "1"
        ? "firstRow"
        : getAttributeValue(cnfStyle, "lastRow") === "1"
          ? "lastRow"
          : null;
    const rowCondShading =
      rowCondType && tblConditionals
        ? tblConditionals[rowCondType]?.shading
        : undefined;

    const cells = [];
    for (const cellNode of getChildrenByTagNameNS(rowNode, WORD_NS, "tc")) {
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
      const cellStyle = parseTableCellStyle(cellProperties);
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
      // Explicit cell shading takes priority; fall back to row conditional format.
      const resolvedShading = cellStyle?.shading ?? rowCondShading;
      if (cellStyle || resolvedShading) {
        cell.style = { ...(cellStyle ?? {}), ...(resolvedShading ? { shading: resolvedShading } : {}) };
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
  const tableStyle = parseTableStyle(tblPr, tableStyleId ?? undefined);
  if (tableStyle) {
    table.style = tableStyle;
  }
  return table;
}
