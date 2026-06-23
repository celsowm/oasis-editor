import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getDocumentPageSettings,
  getDocumentSections,
  getPageContentWidth,
  type EditorDocument,
  type EditorState,
  type EditorTableCellNode,
  type EditorTableNode,
} from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import { PX_PER_POINT as POINT_TO_PX } from "@/core/units.js";
const MIN_TABLE_CELL_CONTENT_WIDTH_PX = 24;
const DEFAULT_CELL_PADDING_LEFT_RIGHT_PX = 7.2;

function toPx(valuePt: number): number {
  return valuePt * POINT_TO_PX;
}

function resolveTableWidthPx(
  table: EditorTableNode,
  pageContentWidthPx: number,
): number {
  const raw = table.style?.width;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(24, toPx(raw));
  }
  if (typeof raw === "string" && raw.trim().endsWith("%")) {
    const value = Number.parseFloat(raw.trim().slice(0, -1));
    if (Number.isFinite(value)) {
      return Math.max(24, pageContentWidthPx * (value / 100));
    }
  }
  return pageContentWidthPx;
}

function resolveHorizontalCellPaddingPx(cell: EditorTableCellNode): number {
  if (
    typeof cell.style?.padding === "number" &&
    Number.isFinite(cell.style.padding)
  ) {
    return Math.max(0, toPx(cell.style.padding)) * 2;
  }
  const left =
    cell.style?.paddingLeft !== undefined
      ? toPx(cell.style.paddingLeft)
      : cell.style?.paddingStart !== undefined
        ? toPx(cell.style.paddingStart)
        : DEFAULT_CELL_PADDING_LEFT_RIGHT_PX;
  const right =
    cell.style?.paddingRight !== undefined
      ? toPx(cell.style.paddingRight)
      : cell.style?.paddingEnd !== undefined
        ? toPx(cell.style.paddingEnd)
        : DEFAULT_CELL_PADDING_LEFT_RIGHT_PX;
  return Math.max(0, left + right);
}

function resolveHorizontalCellBordersPx(cell: EditorTableCellNode): number {
  const left = cell.style?.borderLeft ?? cell.style?.borderStart;
  const right = cell.style?.borderRight ?? cell.style?.borderEnd;
  const leftPx = left ? Math.max(0, toPx(left.width)) : 1;
  const rightPx = right ? Math.max(0, toPx(right.width)) : 1;
  return leftPx + rightPx;
}

/**
 * Computes the visual column widths (in CSS pixels) for a table, taking
 * into account `table.gridCols`, the resolved table width, and the number
 * of visual columns derived from colSpan.
 */
export function resolveTableColumnWidthsPx(
  table: EditorTableNode,
  pageContentWidthPx: number,
): number[] {
  const tableWidth = resolveTableWidthPx(table, pageContentWidthPx);
  const cellEntries = buildTableCellLayout(table);
  const visualColumnCount = Math.max(
    1,
    ...cellEntries.map(
      (entry) => entry.visualColumnIndex + Math.max(1, entry.colSpan),
    ),
  );

  if (table.gridCols && table.gridCols.length >= visualColumnCount) {
    const gridTotal = table.gridCols.reduce((a, b) => a + b, 0);
    const scale = gridTotal > 0 ? tableWidth / gridTotal : 1;
    return table.gridCols.map((w) => w * scale);
  }
  const baseCellWidth = tableWidth / visualColumnCount;
  return Array(visualColumnCount).fill(baseCellWidth);
}

/**
 * Returns the inner content width (in CSS pixels) of the cell that contains the
 * paragraph with the given id, or null if the paragraph is not inside a table
 * in the active section. The returned width is what's actually available for
 * inline content (subtracts borders and horizontal padding).
 */
export function getTableCellContentWidthForParagraph(
  document: EditorDocument,
  paragraphId: string,
  activeSectionIndex: number,
): number | null {
  const tableLocation = findParagraphTableLocation(
    document,
    paragraphId,
    activeSectionIndex,
  );
  if (!tableLocation) return null;

  const sections = getDocumentSections(document);
  const sectionIndex = Math.max(
    0,
    Math.min(activeSectionIndex, sections.length - 1),
  );
  const section = sections[sectionIndex];
  if (!section) return null;

  const zoneBlocks =
    tableLocation.zone === "header"
      ? (section.header ?? [])
      : tableLocation.zone === "footer"
        ? (section.footer ?? [])
        : section.blocks;
  const table = zoneBlocks[tableLocation.blockIndex];
  if (!table || table.type !== "table") return null;

  const row = table.rows[tableLocation.rowIndex];
  if (!row) return null;
  const cell = row.cells[tableLocation.cellIndex];
  if (!cell) return null;
  if (cell.style?.noWrap) return 100000;

  const pageContentWidthPx = getPageContentWidth(
    getDocumentPageSettings(document),
  );
  const columnWidths = resolveTableColumnWidthsPx(table, pageContentWidthPx);

  const entries = buildTableCellLayout(table);
  const matched = entries.find(
    (entry) =>
      entry.rowIndex === tableLocation.rowIndex &&
      entry.cellIndex === tableLocation.cellIndex,
  );
  const visualCol = matched?.visualColumnIndex ?? 0;
  const colSpan = Math.max(1, matched?.colSpan ?? cell.colSpan ?? 1);

  let cellWidth = 0;
  for (
    let i = visualCol;
    i < Math.min(visualCol + colSpan, columnWidths.length);
    i += 1
  ) {
    cellWidth += columnWidths[i] ?? 0;
  }
  if (cellWidth <= 0) return null;

  const horizontalChrome =
    resolveHorizontalCellBordersPx(cell) + resolveHorizontalCellPaddingPx(cell);

  return Math.max(
    MIN_TABLE_CELL_CONTENT_WIDTH_PX,
    cellWidth - horizontalChrome,
  );
}

export function getTableCellContentWidthForParagraphInState(
  state: EditorState,
  paragraphId: string,
): number | null {
  return getTableCellContentWidthForParagraph(
    state.document,
    paragraphId,
    getActiveSectionIndex(state),
  );
}
