import type { EditorTableNode, EditorState } from "@/core/model.js";
import {
  buildTableCellLayout,
  type TableCellLayoutEntry,
} from "@/core/tableLayout.js";
import { measureParagraphMinContentWidthPx } from "@/ui/textMeasurement.js";
import {
  ptToPx,
  pxToPt,
  MIN_TABLE_SIZE_PT,
  parseSizeToPt,
} from "./tableResizeUnits.js";
import type { TableGeometry } from "./tableResizeTypes.js";

const CONTENT_MIN_WIDTH_GUARD_PX = 12;
const CONTENT_MIN_HEIGHT_GUARD_PX = 4;
const DEFAULT_CELL_PADDING_LEFT_RIGHT_PX = 7.2;

export function resolveHorizontalCellChromePx(
  cell: EditorTableNode["rows"][number]["cells"][number],
): number {
  const padding =
    typeof cell.style?.padding === "number" &&
    Number.isFinite(cell.style.padding)
      ? Math.max(0, ptToPx(cell.style.padding)) * 2
      : Math.max(
          0,
          (cell.style?.paddingLeft !== undefined
            ? ptToPx(cell.style.paddingLeft)
            : DEFAULT_CELL_PADDING_LEFT_RIGHT_PX) +
            (cell.style?.paddingRight !== undefined
              ? ptToPx(cell.style.paddingRight)
              : DEFAULT_CELL_PADDING_LEFT_RIGHT_PX),
        );
  const borderLeft = cell.style?.borderLeft
    ? Math.max(0, ptToPx(cell.style.borderLeft.width))
    : 1;
  const borderRight = cell.style?.borderRight
    ? Math.max(0, ptToPx(cell.style.borderRight.width))
    : 1;
  return padding + borderLeft + borderRight;
}

export function resolveRowHeightsPx(
  tableNode: EditorTableNode,
  tableLayout: TableCellLayoutEntry[],
  geometry: TableGeometry,
): number[] {
  const rowCount = Math.max(1, tableNode.rows.length);
  const baseRowHeight = geometry.bounds.height / rowCount;
  const rowHeights = Array<number>(rowCount).fill(baseRowHeight);

  const geometryByKey = new Map(
    geometry.cells.map(
      (cell) => [`${cell.rowIndex}:${cell.cellIndex}`, cell] as const,
    ),
  );

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const explicitPt = parseSizeToPt(tableNode.rows[rowIndex]?.style?.height);
    if (explicitPt !== null) {
      rowHeights[rowIndex] = Math.max(1, ptToPx(explicitPt));
      continue;
    }

    const singleSpan = tableLayout.find(
      (entry) => entry.rowIndex === rowIndex && entry.rowSpan === 1,
    );
    if (singleSpan) {
      const geometryCell = geometryByKey.get(
        `${singleSpan.rowIndex}:${singleSpan.cellIndex}`,
      );
      if (geometryCell) {
        rowHeights[rowIndex] = Math.max(1, geometryCell.height);
      }
    }
  }

  return rowHeights;
}

export function resolveColumnWidthsPt(
  tableNode: EditorTableNode,
  tableLayout: TableCellLayoutEntry[],
  geometry: TableGeometry,
): { widthsPt: Record<number, number>; maxColumnIndex: number } {
  const visualColumnCount = Math.max(
    1,
    ...tableLayout.map(
      (entry) => entry.visualColumnIndex + Math.max(1, entry.colSpan),
    ),
  );
  const maxColumnIndex = visualColumnCount - 1;

  const widthsPx = Array<number>(visualColumnCount).fill(
    geometry.bounds.width / visualColumnCount,
  );
  const geometryByKey = new Map(
    geometry.cells.map(
      (cell) => [`${cell.rowIndex}:${cell.cellIndex}`, cell] as const,
    ),
  );

  if (tableNode.gridCols && tableNode.gridCols.length >= visualColumnCount) {
    for (let index = 0; index < visualColumnCount; index += 1) {
      widthsPx[index] = Math.max(1, ptToPx(tableNode.gridCols[index]!));
    }
  } else {
    for (const entry of tableLayout) {
      if (entry.colSpan !== 1) {
        continue;
      }
      const geometryCell = geometryByKey.get(
        `${entry.rowIndex}:${entry.cellIndex}`,
      );
      if (!geometryCell) {
        continue;
      }
      widthsPx[entry.visualColumnIndex] = Math.max(1, geometryCell.width);
    }
  }

  const widthsPt: Record<number, number> = {};
  for (let columnIndex = 0; columnIndex < visualColumnCount; columnIndex += 1) {
    widthsPt[columnIndex] = Math.max(
      MIN_TABLE_SIZE_PT,
      pxToPt(widthsPx[columnIndex]!),
    );
  }

  return { widthsPt, maxColumnIndex };
}

export function resolveMinRowHeightPx(
  tableNode: EditorTableNode,
  tableLayout: TableCellLayoutEntry[],
  geometry: TableGeometry,
  targetRowIndex: number,
): number {
  const row = tableNode.rows[targetRowIndex];
  if (!row) {
    return ptToPx(MIN_TABLE_SIZE_PT);
  }
  const minFloor = ptToPx(MIN_TABLE_SIZE_PT);
  let minHeight = minFloor;
  for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
    const cell = row.cells[cellIndex];
    if (!cell) continue;
    const layoutEntry = tableLayout.find(
      (entry) =>
        entry.rowIndex === targetRowIndex && entry.cellIndex === cellIndex,
    );
    if (!layoutEntry || layoutEntry.rowSpan !== 1) {
      continue;
    }
    const geometryCell = geometry.cells.find(
      (candidate) =>
        candidate.rowIndex === targetRowIndex &&
        candidate.cellIndex === cellIndex,
    );
    if (!geometryCell) continue;
    minHeight = Math.max(
      minHeight,
      geometryCell.contentMinHeight + CONTENT_MIN_HEIGHT_GUARD_PX,
    );
  }
  return Math.max(minFloor, minHeight);
}

export function resolveMinColumnWidthsPx(
  state: EditorState,
  tableNode: EditorTableNode,
  tableLayout: TableCellLayoutEntry[],
  geometry: TableGeometry,
): Record<number, number> {
  const minFloor = ptToPx(MIN_TABLE_SIZE_PT);
  const result: Record<number, number> = {};
  const geometryByKey = new Map(
    geometry.cells.map(
      (cell) => [`${cell.rowIndex}:${cell.cellIndex}`, cell] as const,
    ),
  );
  for (const entry of tableLayout) {
    if (entry.colSpan !== 1) continue;
    const geometryCell = geometryByKey.get(
      `${entry.rowIndex}:${entry.cellIndex}`,
    );
    if (!geometryCell) continue;
    const cell = tableNode.rows[entry.rowIndex]?.cells[entry.cellIndex];
    if (!cell) continue;
    const visualCol = entry.visualColumnIndex;
    const currentMin = result[visualCol] ?? minFloor;
    const minContentWidth = cell.blocks.reduce((largest, paragraph) => {
      return Math.max(
        largest,
        measureParagraphMinContentWidthPx(paragraph, state.document.styles),
      );
    }, 1);
    result[visualCol] = Math.max(
      currentMin,
      minContentWidth +
        resolveHorizontalCellChromePx(cell) +
        CONTENT_MIN_WIDTH_GUARD_PX,
      minFloor,
    );
  }
  return result;
}

/** Convenience: builds layout and calls resolveColumnWidthsPt */
export function buildResolvedColumnWidthsPt(
  tableNode: EditorTableNode,
  geometry: TableGeometry,
): { widthsPt: Record<number, number>; maxColumnIndex: number } {
  const tableLayout = buildTableCellLayout(tableNode);
  return resolveColumnWidthsPt(tableNode, tableLayout, geometry);
}
