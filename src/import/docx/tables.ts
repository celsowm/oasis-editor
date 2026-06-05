import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorNamedStyle,
  EditorParagraphNode,
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
  parseOnOffProperty,
} from "./xmlHelpers.js";
import { parseDocxBoxBorders } from "./borders.js";
import { twipsToPoints, normalizeImportedHexColor } from "./units.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { type NumberingMaps } from "./numbering.js";
import { parseParagraphNode } from "./paragraphs.js";
import {
  parseAutospacingFlags,
  type ParagraphAutospacingFlags,
} from "./paragraphStyle.js";

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
    const top = twipsToPoints(
      getAttributeValue(getFirstChildByTagNameNS(tcMar, WORD_NS, "top"), "w"),
    );
    const bottom = twipsToPoints(
      getAttributeValue(
        getFirstChildByTagNameNS(tcMar, WORD_NS, "bottom"),
        "w",
      ),
    );
    const left = twipsToPoints(
      getAttributeValue(getFirstChildByTagNameNS(tcMar, WORD_NS, "left"), "w"),
    );
    const right = twipsToPoints(
      getAttributeValue(getFirstChildByTagNameNS(tcMar, WORD_NS, "right"), "w"),
    );

    if (top !== undefined) style.paddingTop = top;
    if (bottom !== undefined) style.paddingBottom = bottom;
    if (left !== undefined) style.paddingLeft = left;
    if (right !== undefined) style.paddingRight = right;
  }

  const verticalAlign = parseTableCellVerticalAlign(cellProperties);
  if (verticalAlign) {
    style.verticalAlign = verticalAlign;
  }

  for (const [key, border] of Object.entries(
    parseTableCellBorders(cellProperties),
  )) {
    if (border) {
      (style as Record<string, unknown>)[key] = border;
    }
  }

  return Object.keys(style).length > 0 ? style : undefined;
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

  const rows = [];
  for (const rowNode of getChildrenByTagNameNS(tableNode, WORD_NS, "tr")) {
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
      if (cellStyle) {
        cell.style = cellStyle;
      }
      if (vMerge === "continue") {
        cell.blocks = [];
      }
      cells.push(cell);
    }
    rows.push(
      createEditorTableRow(
        cells,
        isTableHeaderRow(rowNode) ? { isHeader: true } : undefined,
      ),
    );
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

  return createEditorTable(rows, gridCols.length > 0 ? gridCols : undefined);
}
