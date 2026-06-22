import type { EditorNamedStyle, EditorTableNode } from "@/core/model.js";
import type { ITextMeasurer } from "@/core/engine.js";
import { domTextMeasurer } from "@/ui/textMeasurement.js";
import { resolveTableColumnWidthsPx } from "@/ui/tableGeometry.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import {
  estimateParagraphBlockHeight,
  shouldCollapseContextualSpacing,
} from "./paragraphPagination.js";
import { PX_PER_POINT as POINT_TO_PX } from "@/core/units.js";

const DEFAULT_FONT_SIZE = 14.6667; // 11pt
const DEFAULT_LINE_HEIGHT = 1.15;
const DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX = 14.4;
const MIN_TABLE_CELL_CONTENT_WIDTH_PX = 24;
const DEFAULT_TABLE_SEGMENT_VERTICAL_SPACING = 0;
const DEFAULT_TABLE_ROW_VERTICAL_SPACING = 0;

function getCellHorizontalChromePx(
  cell: EditorTableNode["rows"][number]["cells"][number],
): number {
  const padLeft =
    cell.style?.padding !== undefined
      ? cell.style.padding * POINT_TO_PX
      : cell.style?.paddingLeft !== undefined
        ? cell.style.paddingLeft * POINT_TO_PX
        : cell.style?.paddingStart !== undefined
          ? cell.style.paddingStart * POINT_TO_PX
          : DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX / 2;
  const padRight =
    cell.style?.padding !== undefined
      ? cell.style.padding * POINT_TO_PX
      : cell.style?.paddingRight !== undefined
        ? cell.style.paddingRight * POINT_TO_PX
        : cell.style?.paddingEnd !== undefined
          ? cell.style.paddingEnd * POINT_TO_PX
          : DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX / 2;
  const leftBorder = cell.style?.borderLeft ?? cell.style?.borderStart;
  const rightBorder = cell.style?.borderRight ?? cell.style?.borderEnd;
  const borderLeft = leftBorder
    ? Math.max(0, leftBorder.width * POINT_TO_PX)
    : 1;
  const borderRight = rightBorder
    ? Math.max(0, rightBorder.width * POINT_TO_PX)
    : 1;
  return Math.max(0, padLeft + padRight + borderLeft + borderRight);
}

function getCellVerticalChromePx(
  cell: EditorTableNode["rows"][number]["cells"][number],
): number {
  const padTop =
    cell.style?.padding !== undefined
      ? cell.style.padding * POINT_TO_PX
      : cell.style?.paddingTop !== undefined
        ? cell.style.paddingTop * POINT_TO_PX
        : 0;
  const padBottom =
    cell.style?.padding !== undefined
      ? cell.style.padding * POINT_TO_PX
      : cell.style?.paddingBottom !== undefined
        ? cell.style.paddingBottom * POINT_TO_PX
        : 0;
  const borderTop = cell.style?.borderTop
    ? Math.max(0, cell.style.borderTop.width * POINT_TO_PX)
    : 1;
  const borderBottom = cell.style?.borderBottom
    ? Math.max(0, cell.style.borderBottom.width * POINT_TO_PX)
    : 1;
  return Math.max(0, padTop + padBottom + borderTop + borderBottom);
}

function getTableCellContentWidth(
  cell: EditorTableNode["rows"][number]["cells"][number],
  fallbackContentWidth?: number,
  columnWidthPx?: number,
): number | undefined {
  if (
    typeof columnWidthPx === "number" &&
    Number.isFinite(columnWidthPx) &&
    columnWidthPx > 0
  ) {
    return Math.max(
      MIN_TABLE_CELL_CONTENT_WIDTH_PX,
      columnWidthPx - getCellHorizontalChromePx(cell),
    );
  }
  if (typeof cell.style?.width !== "number") {
    return fallbackContentWidth;
  }

  const widthPx = cell.style.width * POINT_TO_PX;
  const horizontalPaddingPx =
    cell.style.padding !== undefined
      ? cell.style.padding * POINT_TO_PX * 2
      : DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX;

  return Math.max(
    MIN_TABLE_CELL_CONTENT_WIDTH_PX,
    widthPx - horizontalPaddingPx,
  );
}

function parseTableRowHeightToPx(
  height: number | string | undefined,
): number | null {
  if (typeof height === "number" && Number.isFinite(height)) {
    return Math.max(0, height * POINT_TO_PX);
  }
  if (typeof height !== "string") {
    return null;
  }
  const trimmed = height.trim().toLowerCase();
  if (!trimmed || trimmed.includes("%")) {
    return null;
  }
  if (trimmed.endsWith("pt")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? Math.max(0, parsed * POINT_TO_PX) : null;
  }
  if (trimmed.endsWith("px")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? Math.max(0, parsed * POINT_TO_PX) : null;
}

interface TableColumnGeometry {
  columnWidths: number[];
  cellColumnWidth: Map<string, number>;
}

const tableColumnGeometryCache = new WeakMap<
  EditorTableNode,
  Map<number, TableColumnGeometry>
>();

function getCachedTableColumnGeometry(
  table: EditorTableNode,
  contentWidthPx: number,
): TableColumnGeometry {
  let perTable = tableColumnGeometryCache.get(table);
  if (!perTable) {
    perTable = new Map();
    tableColumnGeometryCache.set(table, perTable);
  }
  const key = Math.round(contentWidthPx);
  let geometry = perTable.get(key);
  if (geometry) return geometry;

  const columnWidths = resolveTableColumnWidthsPx(table, contentWidthPx);
  const entries = buildTableCellLayout(table);
  const cellColumnWidth = new Map<string, number>();
  for (const entry of entries) {
    let total = 0;
    for (
      let index = entry.visualColumnIndex;
      index <
      Math.min(entry.visualColumnIndex + entry.colSpan, columnWidths.length);
      index += 1
    ) {
      total += columnWidths[index] ?? 0;
    }
    cellColumnWidth.set(`${entry.rowIndex}:${entry.cellIndex}`, total);
  }

  geometry = { columnWidths, cellColumnWidth };
  perTable.set(key, geometry);
  return geometry;
}

export function estimateTableRowHeight(
  row: EditorTableNode["rows"][number],
  styles: Record<string, EditorNamedStyle> | undefined,
  measurer: ITextMeasurer,
  defaultTabStop: number | undefined,
  contentWidth?: number,
  table?: EditorTableNode,
  rowIndex?: number,
): number {
  if (row.style?.hidden) {
    return 0;
  }
  const geometry =
    table && typeof contentWidth === "number"
      ? getCachedTableColumnGeometry(table, contentWidth)
      : null;

  const cellHeights = row.cells.map((cell, cellIndex) => {
    if (cell.vMerge === "continue") return 0;
    let columnWidthPx: number | undefined;
    if (geometry && typeof rowIndex === "number") {
      const total = geometry.cellColumnWidth.get(`${rowIndex}:${cellIndex}`);
      if (total !== undefined && total > 0) columnWidthPx = total;
    }
    const cellContentWidth = getTableCellContentWidth(
      cell,
      contentWidth,
      columnWidthPx,
    );
    const paragraphContentWidth = cell.style?.noWrap
      ? 100000
      : cellContentWidth;
    let blockHeights = 0;
    for (let blockIndex = 0; blockIndex < cell.blocks.length; blockIndex += 1) {
      const paragraph = cell.blocks[blockIndex]!;
      const previousParagraph = cell.blocks[blockIndex - 1];
      const nextParagraph = cell.blocks[blockIndex + 1];
      blockHeights += estimateParagraphBlockHeight(
        paragraph,
        styles,
        paragraphContentWidth,
        measurer,
        {
          allowSpacingBefore: !shouldCollapseContextualSpacing(
            previousParagraph,
            paragraph,
            styles,
          ),
          allowSpacingAfter: !shouldCollapseContextualSpacing(
            paragraph,
            nextParagraph,
            styles,
          ),
        },
        defaultTabStop,
      );
    }
    let largestImageHeight = 0;
    for (const paragraph of cell.blocks) {
      for (const run of paragraph.runs) {
        if (run.kind === "image" && run.image.height > largestImageHeight) {
          const fitted =
            cellContentWidth !== undefined && run.image.width > cellContentWidth
              ? Math.floor(
                  run.image.height * (cellContentWidth / run.image.width),
                )
              : run.image.height;
          if (fitted > largestImageHeight) {
            largestImageHeight = fitted;
          }
        }
      }
    }
    return (
      Math.max(blockHeights, largestImageHeight) + getCellVerticalChromePx(cell)
    );
  });

  const contentHeight = Math.max(
    ...cellHeights,
    DEFAULT_FONT_SIZE * DEFAULT_LINE_HEIGHT,
  );
  const explicitHeight = parseTableRowHeightToPx(row.style?.height);
  return (
    Math.max(contentHeight, explicitHeight ?? 0) +
    DEFAULT_TABLE_ROW_VERTICAL_SPACING
  );
}

export function getTableHeaderRowCount(table: EditorTableNode): number {
  let count = 0;
  for (const row of table.rows) {
    if (!row.isHeader) {
      break;
    }
    count += 1;
  }
  return count;
}

function getTableRowGroupEndExclusive(
  table: EditorTableNode,
  rowIndex: number,
): number {
  const row = table.rows[rowIndex];
  if (!row) {
    return rowIndex + 1;
  }

  let endExclusive = rowIndex + 1;
  if (row.style?.cantSplit) {
    endExclusive = Math.max(endExclusive, rowIndex + 1);
  }
  for (const cell of row.cells) {
    const rowSpan = Math.max(
      1,
      cell.rowSpan ?? (cell.vMerge === "restart" ? 1 : 1),
    );
    endExclusive = Math.max(endExclusive, rowIndex + rowSpan);
  }

  return Math.min(table.rows.length, endExclusive);
}

export function getTableRowGroups(
  table: EditorTableNode,
): Array<{ startRowIndex: number; endRowIndexExclusive: number }> {
  const groups: Array<{ startRowIndex: number; endRowIndexExclusive: number }> =
    [];
  let groupStart = 0;
  let groupEndExclusive = 0;

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    if (rowIndex >= groupEndExclusive) {
      groupStart = rowIndex;
      groupEndExclusive = rowIndex + 1;
    }

    groupEndExclusive = Math.max(
      groupEndExclusive,
      getTableRowGroupEndExclusive(table, rowIndex),
    );
    if (rowIndex === groupEndExclusive - 1) {
      groups.push({
        startRowIndex: groupStart,
        endRowIndexExclusive: groupEndExclusive,
      });
    }
  }

  return groups;
}

export function getRepeatableHeaderRowCount(
  table: EditorTableNode,
  headerRowCount: number,
  rowGroups: Array<{ startRowIndex: number; endRowIndexExclusive: number }>,
): number {
  for (const group of rowGroups) {
    if (group.startRowIndex >= headerRowCount) {
      break;
    }
    if (group.endRowIndexExclusive > headerRowCount) {
      return 0;
    }
  }

  return headerRowCount;
}

export function getTableSegmentHeight(
  table: EditorTableNode,
  rowStartIndex: number,
  rowEndIndexExclusive: number,
  repeatedHeaderRowCount: number,
  styles: Record<string, EditorNamedStyle> | undefined,
  contentWidth?: number,
  measurer: ITextMeasurer = domTextMeasurer,
  defaultTabStop?: number,
): number {
  const headerHeight =
    repeatedHeaderRowCount > 0
      ? table.rows
          .slice(0, repeatedHeaderRowCount)
          .reduce(
            (sum, row, index) =>
              sum +
              estimateTableRowHeight(
                row,
                styles,
                measurer,
                defaultTabStop,
                contentWidth,
                table,
                index,
              ),
            0,
          )
      : 0;
  const bodyHeight = table.rows
    .slice(rowStartIndex, rowEndIndexExclusive)
    .reduce(
      (sum, row, indexOffset) =>
        sum +
        estimateTableRowHeight(
          row,
          styles,
          measurer,
          defaultTabStop,
          contentWidth,
          table,
          rowStartIndex + indexOffset,
        ),
      0,
    );
  return headerHeight + bodyHeight + DEFAULT_TABLE_SEGMENT_VERTICAL_SPACING;
}

export function estimateTableBlockHeight(
  table: EditorTableNode,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
  measurer: ITextMeasurer = domTextMeasurer,
  defaultTabStop?: number,
): number {
  return getTableSegmentHeight(
    table,
    0,
    table.rows.length,
    0,
    styles,
    contentWidth,
    measurer,
    defaultTabStop,
  );
}
