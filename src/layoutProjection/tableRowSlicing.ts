import type {
  EditorNamedStyle,
  EditorParagraphNode,
  EditorTableNode,
  EditorTableRowNode,
  TableCellBlockPosition,
} from "@/core/model.js";
import type { ITextMeasurer } from "@/core/engine.js";
import { projectParagraphLayout } from "./paragraphPagination.js";
import { estimateTableRowHeight } from "./tablePagination.js";

// Table-row slicing for pagination: splitting a table row's cell content at a
// page boundary and estimating slice heights. Extracted from blocksPagination
// (S2 hotspot decomposition); blocksPagination imports the entry helpers.

export function normalizeCellStartPositions(
  row: EditorTableRowNode,
  starts: TableCellBlockPosition[] | undefined,
  legacyStarts: number[] | undefined,
): TableCellBlockPosition[] {
  return row.cells.map((_, cellIdx) => ({
    blockIndex: starts?.[cellIdx]?.blockIndex ?? legacyStarts?.[cellIdx] ?? 0,
    offset: starts?.[cellIdx]?.offset,
  }));
}

export function positionsToBlockIndexes(
  positions: TableCellBlockPosition[] | undefined,
): number[] | undefined {
  return positions?.map((position) => position.blockIndex);
}

export function hasPartialPositions(
  positions: TableCellBlockPosition[] | undefined,
): boolean {
  return positions?.some((position) => (position.offset ?? 0) > 0) ?? false;
}

function getParagraphTextLength(paragraph: EditorParagraphNode): number {
  return paragraph.runs.reduce((sum, run) => sum + run.text.length, 0);
}

function sliceParagraphForTableSegment(
  paragraph: EditorParagraphNode,
  startOffset: number,
  endOffset: number,
): EditorParagraphNode {
  let cursor = 0;
  const runs = paragraph.runs.flatMap((run) => {
    const runStart = cursor;
    const runEnd = runStart + run.text.length;
    cursor = runEnd;
    const sliceStart = Math.max(startOffset, runStart);
    const sliceEnd = Math.min(endOffset, runEnd);
    if (sliceEnd <= sliceStart) return [];
    return [
      {
        ...run,
        id: `${run.id}:slice:${sliceStart - runStart}:${sliceEnd - runStart}`,
        text: run.text.slice(sliceStart - runStart, sliceEnd - runStart),
      },
    ];
  });
  return {
    ...paragraph,
    runs: runs.length > 0 ? runs : [{ id: `${paragraph.id}:empty`, text: "" }],
  };
}

function sliceCellBlocksForTableSegment(
  blocks: EditorParagraphNode[],
  start: TableCellBlockPosition,
  end: TableCellBlockPosition,
): EditorParagraphNode[] {
  const result: EditorParagraphNode[] = [];
  const endExclusive =
    end.offset !== undefined ? end.blockIndex + 1 : end.blockIndex;
  for (let index = start.blockIndex; index < endExclusive; index += 1) {
    const paragraph = blocks[index];
    if (!paragraph) continue;
    const paragraphLength = getParagraphTextLength(paragraph);
    const startOffset = index === start.blockIndex ? (start.offset ?? 0) : 0;
    const endOffset =
      index === end.blockIndex
        ? (end.offset ?? paragraphLength)
        : paragraphLength;
    if (startOffset <= 0 && endOffset >= paragraphLength) {
      result.push(paragraph);
    } else if (endOffset > startOffset) {
      result.push(
        sliceParagraphForTableSegment(paragraph, startOffset, endOffset),
      );
    }
  }
  return result;
}

export function buildRowSliceFromPositions(
  row: EditorTableRowNode,
  starts: TableCellBlockPosition[],
  ends: TableCellBlockPosition[],
): EditorTableRowNode {
  return {
    ...row,
    cells: row.cells.map((cell, cellIdx) => ({
      ...cell,
      blocks: sliceCellBlocksForTableSegment(
        cell.blocks,
        starts[cellIdx] ?? { blockIndex: 0 },
        ends[cellIdx] ?? { blockIndex: cell.blocks.length },
      ),
    })),
  };
}

function estimateSingleCellRowSliceHeight(
  row: EditorTableRowNode,
  cellIndex: number,
  start: TableCellBlockPosition,
  end: TableCellBlockPosition,
  styles: Record<string, EditorNamedStyle> | undefined,
  measurer: ITextMeasurer,
  defaultTabStop: number | undefined,
  contentWidth: number | undefined,
  table: EditorTableNode,
  rowIndex: number,
): number {
  const starts = row.cells.map((_, idx) =>
    idx === cellIndex ? start : { blockIndex: 0 },
  );
  const ends = row.cells.map((cell, idx) =>
    idx === cellIndex ? end : { blockIndex: 0 },
  );
  return estimateTableRowHeight(
    buildRowSliceFromPositions(row, starts, ends),
    styles,
    measurer,
    defaultTabStop,
    contentWidth,
    table,
    rowIndex,
  );
}

export function findCellSplitEndPosition(
  row: EditorTableRowNode,
  cellIndex: number,
  start: TableCellBlockPosition,
  availableHeight: number,
  styles: Record<string, EditorNamedStyle> | undefined,
  measurer: ITextMeasurer,
  defaultTabStop: number | undefined,
  contentWidth: number | undefined,
  table: EditorTableNode,
  rowIndex: number,
): TableCellBlockPosition {
  const cell = row.cells[cellIndex];
  if (!cell) return start;
  const limit = cell.blocks.length;
  let best: TableCellBlockPosition = { blockIndex: start.blockIndex };

  for (
    let blockIndex = start.blockIndex + 1;
    blockIndex <= limit;
    blockIndex += 1
  ) {
    const end = { blockIndex };
    const height = estimateSingleCellRowSliceHeight(
      row,
      cellIndex,
      start,
      end,
      styles,
      measurer,
      defaultTabStop,
      contentWidth,
      table,
      rowIndex,
    );
    if (height <= availableHeight) {
      best = end;
    } else {
      break;
    }
  }

  if (best.blockIndex > start.blockIndex) {
    return best;
  }

  const paragraph = cell.blocks[start.blockIndex];
  if (!paragraph) return best;
  const paragraphLength = getParagraphTextLength(paragraph);
  const startOffset = start.offset ?? 0;
  const layout = projectParagraphLayout(
    paragraph,
    undefined,
    undefined,
    styles,
    contentWidth,
    measurer,
    defaultTabStop,
  );
  for (const line of layout.lines) {
    if (line.endOffset <= startOffset || line.endOffset >= paragraphLength) {
      continue;
    }
    const end = { blockIndex: start.blockIndex, offset: line.endOffset };
    const height = estimateSingleCellRowSliceHeight(
      row,
      cellIndex,
      start,
      end,
      styles,
      measurer,
      defaultTabStop,
      contentWidth,
      table,
      rowIndex,
    );
    if (height <= availableHeight) {
      best = end;
    } else {
      break;
    }
  }
  return best;
}

export function canSplitTableRow(row: EditorTableRowNode | undefined): boolean {
  if (!row || row.isHeader || row.style?.cantSplit === true) {
    return false;
  }
  return row.cells.some((cell) => {
    if (cell.vMerge || (cell.rowSpan ?? 1) > 1) return false;
    if (cell.style?.textDirection) return false;
    return cell.blocks.some((paragraph) => {
      if (paragraph.style?.textDirection) return false;
      return getParagraphTextLength(paragraph) > 0;
    });
  });
}

export function positionsProgressed(
  starts: TableCellBlockPosition[],
  ends: TableCellBlockPosition[],
): boolean {
  return ends.some((end, index) => {
    const start = starts[index] ?? { blockIndex: 0 };
    return (
      end.blockIndex > start.blockIndex ||
      (end.blockIndex === start.blockIndex &&
        (end.offset ?? 0) > (start.offset ?? 0))
    );
  });
}

export function positionsFinishedRow(
  row: EditorTableRowNode,
  ends: TableCellBlockPosition[],
): boolean {
  return row.cells.every(
    (cell, cellIdx) => (ends[cellIdx]?.blockIndex ?? 0) >= cell.blocks.length,
  );
}
