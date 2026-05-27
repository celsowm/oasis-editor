import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorNamedStyle,
  EditorTableCellStyle,
  EditorTableNode,
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
  parseBooleanProperty,
} from "./xmlHelpers.js";
import { twipsToPoints, normalizeImportedHexColor } from "./units.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type ThemeFontMap } from "./themeFonts.js";
import { type NumberingMaps } from "./numbering.js";
import { parseParagraphNode } from "./paragraphs.js";

function getTableCellColSpan(cellProperties: XmlElement | null): number {
  if (!cellProperties) {
    return 1;
  }

  const gridSpan = getFirstChildByTagNameNS(cellProperties, WORD_NS, "gridSpan");
  const value = getAttributeValue(gridSpan, "val");
  const parsed = value ? Number(value) : 1;
  return Number.isFinite(parsed) && parsed > 1 ? Math.floor(parsed) : 1;
}

function getTableCellVMerge(cellProperties: XmlElement | null): "restart" | "continue" | undefined {
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

function parseTableCellStyle(cellProperties: XmlElement | null): EditorTableCellStyle | undefined {
  if (!cellProperties) {
    return undefined;
  }

  const style: EditorTableCellStyle = {};
  const shading = getFirstChildByTagNameNS(cellProperties, WORD_NS, "shd");
  const fill = normalizeImportedHexColor(getAttributeValue(shading, "fill"));
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
    const top = twipsToPoints(getAttributeValue(getFirstChildByTagNameNS(tcMar, WORD_NS, "top"), "w"));
    const bottom = twipsToPoints(getAttributeValue(getFirstChildByTagNameNS(tcMar, WORD_NS, "bottom"), "w"));
    const left = twipsToPoints(getAttributeValue(getFirstChildByTagNameNS(tcMar, WORD_NS, "left"), "w"));
    const right = twipsToPoints(getAttributeValue(getFirstChildByTagNameNS(tcMar, WORD_NS, "right"), "w"));

    if (top !== undefined) style.paddingTop = top;
    if (bottom !== undefined) style.paddingBottom = bottom;
    if (left !== undefined) style.paddingLeft = left;
    if (right !== undefined) style.paddingRight = right;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function isTableHeaderRow(rowNode: XmlElement): boolean {
  const rowProperties = getFirstChildByTagNameNS(rowNode, WORD_NS, "trPr");
  return rowProperties ? parseBooleanProperty(rowProperties, "tblHeader") : false;
}

export async function parseTableNode(
  tableNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  themeFonts: ThemeFontMap,
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
  const tableStyleId = getAttributeValue(getFirstChildByTagNameNS(tblPr, WORD_NS, "tblStyle"), "val");
  const inheritedParagraphStyle =
    tableStyleId && styles?.[tableStyleId]?.paragraphStyle
      ? styles[tableStyleId]!.paragraphStyle
      : undefined;

  const rows = [];
  for (const rowNode of getChildrenByTagNameNS(tableNode, WORD_NS, "tr")) {
    const cells = [];
    for (const cellNode of getChildrenByTagNameNS(rowNode, WORD_NS, "tc")) {
      const paragraphs = [];
      const cellProperties = getFirstChildByTagNameNS(cellNode, WORD_NS, "tcPr");
      for (const paragraphNode of getChildrenByTagNameNS(cellNode, WORD_NS, "p")) {
        paragraphs.push(
          await parseParagraphNode(
            paragraphNode,
            numberingMaps,
            zip,
            relsMap,
            assets,
            themeFonts,
            inheritedParagraphStyle,
          ),
        );
      }
      const colSpan = getTableCellColSpan(cellProperties);
      const vMerge = getTableCellVMerge(cellProperties);
      const cellStyle = parseTableCellStyle(cellProperties);
      const cell = createEditorTableCell(
        paragraphs.length > 0 ? paragraphs : [createEditorParagraphFromRuns([{ text: "" }])],
        colSpan,
        vMerge === "restart" ? { rowSpan: 1, vMerge } : vMerge ? { vMerge } : undefined,
      );
      if (cellStyle) {
        cell.style = cellStyle;
      }
      if (vMerge === "continue") {
        cell.blocks = [];
      }
      cells.push(cell);
    }
    rows.push(createEditorTableRow(cells, isTableHeaderRow(rowNode) ? { isHeader: true } : undefined));
  }

  // Infer rowSpan from restart/continue sequences.
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]!;
    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      const cell = row.cells[cellIndex];
      if (cell.vMerge !== "restart") {
        continue;
      }

      let span = 1;
      for (let nextRowIndex = rowIndex + 1; nextRowIndex < rows.length; nextRowIndex += 1) {
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

  return createEditorTable(rows, gridCols.length > 0 ? gridCols : undefined);
}
