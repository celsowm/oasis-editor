import { paragraphOffsetToPosition } from "@/core/model.js";
import type { EditorTableNode } from "@/core/model.js";
import type {
  CanvasTableCellLayoutEntry,
  CanvasTableParagraphLayoutEntry,
} from "./types.js";
import type { PreparedCell } from "./prepareCells.js";
import { resolveVerticalContentOffset } from "./tableCellGeometry.js";

const DEFAULT_TABLE_ROW_HEIGHT = 14;
const MIN_TABLE_CELL_CONTENT_HEIGHT_PX = 1;

export function assembleCellEntries(options: {
  prepared: PreparedCell[];
  rowHeights: number[];
  rowOffsets: number[];
  columnOffsets: number[];
  tableLeft: number;
  originY: number;
  cellSpacingPx: number;
  table: EditorTableNode;
}): CanvasTableCellLayoutEntry[] {
  const {
    prepared,
    rowHeights,
    rowOffsets,
    columnOffsets,
    tableLeft,
    originY,
    cellSpacingPx,
    table,
  } = options;

  const cells: CanvasTableCellLayoutEntry[] = [];

  for (const cellEntry of prepared) {
    const {
      rowIndex,
      cellIndex,
      cell,
      visualCol,
      rowSpan,
      width,
      padding,
      borders,
      contentWidthPx,
    } = cellEntry;

    const left = tableLeft + (columnOffsets[visualCol] ?? 0);
    const top = originY + (rowOffsets[rowIndex] ?? 0);
    const height = Math.max(
      1,
      rowHeights
        .slice(rowIndex, rowIndex + rowSpan)
        .reduce((sum, current): number => sum + current, 0) +
        (rowSpan - 1) * cellSpacingPx,
    );

    const contentLeft = left + borders.left.width + padding.left;
    const contentTop = top + borders.top.width + padding.top;
    const contentHeightPx = Math.max(
      MIN_TABLE_CELL_CONTENT_HEIGHT_PX,
      height -
        borders.top.width -
        borders.bottom.width -
        padding.top -
        padding.bottom,
    );

    const firstParagraph = cell.blocks[0];
    const anchorPosition = firstParagraph
      ? paragraphOffsetToPosition(firstParagraph, 0)
      : paragraphOffsetToPosition(
          {
            id: `table:${table.id}:r${rowIndex}:c${cellIndex}:empty`,
            type: "paragraph",
            runs: [{ id: "run:empty", text: "", kind: "text" as const }],
          },
          0,
        );

    let paragraphCursorY = 0;
    const verticalContentOffset =
      cellEntry.verticalMode === "horizontal"
        ? resolveVerticalContentOffset(
            cell,
            contentHeightPx,
            cellEntry.contentNaturalHeightPx,
          )
        : 0;

    const paragraphs: CanvasTableParagraphLayoutEntry[] = [];
    for (const projected of cellEntry.projectedParagraphs) {
      paragraphs.push({
        paragraph: projected.paragraph,
        lines: projected.lines,
        originX: contentLeft,
        originY:
          contentTop +
          verticalContentOffset +
          paragraphCursorY +
          projected.spacingBefore,
        width: contentWidthPx,
        height: projected.height,
      });
      paragraphCursorY += projected.height;
    }

    cells.push({
      tableId: table.id,
      rowIndex,
      cellIndex,
      left,
      top,
      width,
      height,
      contentLeft,
      contentTop,
      contentWidth: contentWidthPx,
      contentHeight: contentHeightPx,
      shading: cell.style?.shading,
      anchorPosition,
      padding,
      borders,
      paragraphs,
      verticalMode: cellEntry.verticalMode,
      revision:
        cell.style?.revision ??
        (cell.style?.propertyRevision
          ? { ...cell.style.propertyRevision, type: "property" as const }
          : undefined),
    });
  }

  return cells;
}

export function buildRowOffsets(
  rowHeights: number[],
  cellSpacingPx: number,
): number[] {
  const rowOffsets: number[] = [];
  let cumulativeY = cellSpacingPx;
  for (let rowIndex = 0; rowIndex < rowHeights.length; rowIndex += 1) {
    rowOffsets[rowIndex] = cumulativeY;
    cumulativeY +=
      (rowHeights[rowIndex] ?? DEFAULT_TABLE_ROW_HEIGHT) + cellSpacingPx;
  }
  return rowOffsets;
}
