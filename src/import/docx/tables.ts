import JSZip from "jszip";
import { type Element as XmlElement, XMLSerializer } from "@xmldom/xmldom";
import type { EditorNamedStyle, EditorTableNode } from "@/core/model.js";
import {
  createEditorParagraphFromRuns,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  collectExtAttributes,
} from "./xmlHelpers.js";
import { twipsToPoints } from "./units.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { type NumberingMaps } from "./numbering.js";
import { parseParagraphNode } from "./paragraphs.js";
import type { ParseNestedBlocks } from "./runs/types.js";
import {
  parseAutospacingFlags,
  type ParagraphAutospacingFlags,
} from "./paragraphStyle.js";
import { parseTableLook } from "./tableConditionalFormatting.js";
import {
  parseTableStyle,
  parseTableRowStyle,
  getTableCellColSpan,
  getTableCellHMerge,
  getTableCellVMerge,
  parseTableCellStyle,
  isTableHeaderRow,
  collapseCellAutospacing,
  parseTableConditionalFlags,
} from "./tableProperties.js";

export async function parseTableNode(
  tableNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  parseNestedBlocks: ParseNestedBlocks,
  _styles?: Record<string, EditorNamedStyle>,
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

  const directTableStyle = parseTableStyle(tblPr, tableStyleId ?? undefined);
  const look = parseTableLook(tblPr);

  const rowNodes = getChildrenByTagNameNS(tableNode, WORD_NS, "tr");

  const rows = [];
  for (let rowIndex = 0; rowIndex < rowNodes.length; rowIndex += 1) {
    const rowNode = rowNodes[rowIndex]!;
    const rowProperties = getFirstChildByTagNameNS(rowNode, WORD_NS, "trPr");

    // Explicit per-row `w:cnfStyle` markers act as the highest-precedence
    // conditional source (rare; most styled tables rely on position alone).
    const rowConditionalStyle = parseTableConditionalFlags(rowProperties);

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
        // The table style's paragraph properties are the lowest layer above
        // docDefaults; the paragraph's own style outranks them. Strip the keys
        // its style defines so e.g. Normal's after-spacing isn't lost to the
        // table style's `after="0"` (which would collapse cell row height).
        paragraphs.push(
          await parseParagraphNode(
            paragraphNode,
            numberingMaps,
            zip,
            relsMap,
            assets,
            theme,
            parseNestedBlocks,
            undefined,
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
      const hMerge = getTableCellHMerge(cellProperties);
      // Legacy horizontal merge: a `continue` cell is absorbed into the
      // preceding anchor cell's colspan (modern `w:gridSpan` equivalent) and
      // is not emitted as its own cell.
      if (hMerge === "continue" && cells.length > 0) {
        const anchor = cells[cells.length - 1]!;
        anchor.colSpan = (anchor.colSpan ?? 1) + colSpan;
        continue;
      }
      const vMerge = getTableCellVMerge(cellProperties);
      const cellStyle = parseTableCellStyle(
        cellProperties,
        undefined,
        theme.colors,
      );

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

      if (cellStyle) cell.style = cellStyle;
      cell.conditionalStyle = parseTableConditionalFlags(cellProperties);
      const cellExtAttrs = collectExtAttributes(cellNode);
      if (cellExtAttrs) cell.extAttributes = cellExtAttrs;
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
    row.conditionalStyle = rowConditionalStyle;
    const rowExtAttrs = collectExtAttributes(rowNode);
    if (rowExtAttrs) row.extAttributes = rowExtAttrs;
    const tblPrEx = getFirstChildByTagNameNS(rowNode, WORD_NS, "tblPrEx");
    if (tblPrEx) {
      const exceptions = parseTableStyle(tblPrEx);
      if (exceptions) {
        row.propertyExceptions = exceptions;
      }
      const changeEl = getFirstChildByTagNameNS(
        tblPrEx,
        WORD_NS,
        "tblPrExChange",
      );
      if (changeEl) {
        row.tblPrExChangeXml = new XMLSerializer().serializeToString(changeEl);
      }
    }
    rows.push(row);
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
  // Store tblLook on the table style for round-trip export.
  if (table.style) {
    table.style.tblLook = look;
  } else if (tableStyleId) {
    table.style = { tblLook: look };
  }
  if (tblGridChangeXml) {
    const previousGrid = getFirstChildByTagNameNS(
      tblGridChangeXml,
      WORD_NS,
      "tblGrid",
    );
    const previous = previousGrid
      ? getChildrenByTagNameNS(previousGrid, WORD_NS, "gridCol")
          .map((gridCol): number | undefined =>
            twipsToPoints(getAttributeValue(gridCol, "w")),
          )
          .filter((width): width is number => width !== undefined)
      : [];
    const rawDate = getAttributeValue(tblGridChangeXml, "date");
    const parsedDate = rawDate ? Date.parse(rawDate) : Number.NaN;
    table.gridRevision = {
      id: getAttributeValue(tblGridChangeXml, "id") ?? "revision:grid",
      author: getAttributeValue(tblGridChangeXml, "author") ?? "Unknown",
      date: Number.isFinite(parsedDate) ? parsedDate : 0,
      type: "grid",
      previous,
    };
  }
  return table;
}
