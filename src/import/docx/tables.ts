import JSZip from "jszip";
import { XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorNamedStyle,
  EditorTableCellStyle,
  EditorTableNode,
} from "@/core/model.js";
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
} from "./xmlHelpers.js";
import { parseDocxTableBorders } from "./borders.js";
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
import {
  parseTableLook,
  resolveCellConditionalKeys,
  mergeConditionalFormats,
  applyConditionalTextStyle,
  tableStyleParagraphInheritance,
} from "./tableConditionalFormatting.js";
import {
  parseTableStyle,
  parseTableRowStyle,
  getTableCellColSpan,
  getTableCellVMerge,
  parseTableCellStyle,
  isTableHeaderRow,
  collapseCellAutospacing,
  applyTableBordersToRows,
} from "./tableProperties.js";

export async function parseTableNode(
  tableNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  parseNestedBlocks: ParseNestedBlocks,
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
        // The table style's paragraph properties are the lowest layer above
        // docDefaults; the paragraph's own style outranks them. Strip the keys
        // its style defines so e.g. Normal's after-spacing isn't lost to the
        // table style's `after="0"` (which would collapse cell row height).
        const paragraphStyleId =
          getAttributeValue(
            getFirstChildByTagNameNS(
              getFirstChildByTagNameNS(paragraphNode, WORD_NS, "pPr"),
              WORD_NS,
              "pStyle",
            ),
            "val",
          ) ?? undefined;
        const cellInheritedStyle = tableStyleParagraphInheritance(
          inheritedParagraphStyle,
          paragraphStyleId,
          styles,
        );
        paragraphs.push(
          await parseParagraphNode(
            paragraphNode,
            numberingMaps,
            zip,
            relsMap,
            assets,
            theme,
            parseNestedBlocks,
            cellInheritedStyle,
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
      const cellStyle = parseTableCellStyle(cellProperties, tableDefaultMargins);

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

      // Conditional paragraph properties sit beneath each paragraph's own style.
      if (conditional.paragraphStyle) {
        const condPStyle = conditional.paragraphStyle;
        for (const paragraph of paragraphs) {
          paragraph.style = { ...condPStyle, ...paragraph.style };
        }
      }

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

    // Merge conditional row style (firstRow/lastRow/band) beneath explicit style.
    if (tblConditionals) {
      const rowKeys = resolveCellConditionalKeys(
        rowIndex, 0, rowCount, Math.max(1, colCount), look, rowBandSize, colBandSize,
      ).filter((k) =>
        k === "firstRow" || k === "lastRow" || k === "band1Horz" || k === "band2Horz",
      );
      const mergedRowConditional = mergeConditionalFormats(
        [...explicitRowKeys, ...rowKeys],
        tblConditionals,
      );
      if (mergedRowConditional.rowStyle) {
        row.style = { ...mergedRowConditional.rowStyle, ...row.style };
      }
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
  // Store tblLook on the table style for round-trip export.
  if (table.style) {
    table.style.tblLook = look;
  } else if (tableStyleId) {
    table.style = { tblLook: look };
  }
  if (tblGridChangeXml) {
    table.tblGridChangeXml = new XMLSerializer().serializeToString(
      tblGridChangeXml,
    );
  }
  return table;
}
