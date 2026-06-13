import type {
  EditorLayoutBlock,
  EditorParagraphNode,
  EditorTableCellNode,
  EditorTableNode,
  TableCellBlockPosition,
} from "./model.js";

export interface TableCellLayoutEntry {
  rowIndex: number;
  cellIndex: number;
  visualRowIndex: number;
  visualColumnIndex: number;
  rowSpan: number;
  colSpan: number;
  cell: EditorTableCellNode;
}

export function buildTableCellLayout(
  table: EditorTableNode,
): TableCellLayoutEntry[] {
  const occupiedColumns: number[] = [];
  const entries: TableCellLayoutEntry[] = [];

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex];
    if (row.style?.hidden) {
      continue;
    }
    // w:gridBefore: the row's cells start after a number of skipped leading
    // grid columns (ragged tables).
    let visualColumnIndex = Math.max(0, Math.floor(row.style?.gridBefore ?? 0));

    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      while (occupiedColumns[visualColumnIndex] > 0) {
        visualColumnIndex += 1;
      }

      const cell = row.cells[cellIndex];
      if (cell.vMerge === "continue") {
        continue;
      }

      const colSpan = Math.max(1, cell.colSpan ?? 1);
      const rowSpan = Math.max(1, cell.rowSpan ?? 1);
      entries.push({
        rowIndex,
        cellIndex,
        visualRowIndex: rowIndex,
        visualColumnIndex,
        rowSpan,
        colSpan,
        cell,
      });

      for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
        occupiedColumns[visualColumnIndex + colOffset] = Math.max(
          occupiedColumns[visualColumnIndex + colOffset] ?? 0,
          rowSpan,
        );
      }

      visualColumnIndex += colSpan;
    }

    for (
      let columnIndex = 0;
      columnIndex < occupiedColumns.length;
      columnIndex += 1
    ) {
      if (occupiedColumns[columnIndex] > 0) {
        occupiedColumns[columnIndex] -= 1;
      }
    }
  }

  if (table.style?.bidiVisual && entries.length > 0) {
    const visualColumnCount = Math.max(
      ...entries.map((entry) => entry.visualColumnIndex + entry.colSpan),
    );
    for (const entry of entries) {
      entry.visualColumnIndex =
        visualColumnCount - entry.visualColumnIndex - entry.colSpan;
    }
  }

  return entries;
}

export function buildSegmentTable(
  table: EditorTableNode,
  segment: NonNullable<EditorLayoutBlock["tableSegment"]>,
): EditorTableNode {
  const {
    startRowIndex,
    endRowIndex,
    repeatedHeaderRowCount,
    startRowCellBlockStarts,
    endRowCellBlockEnds,
    startRowCellBlockPositions,
    endRowCellBlockPositions,
  } = segment;

  const headerRows =
    startRowIndex > 0 && repeatedHeaderRowCount > 0
      ? table.rows.slice(0, repeatedHeaderRowCount)
      : [];

  const bodyRows = table.rows
    .slice(startRowIndex, endRowIndex)
    .map((row, idx, arr) => {
      const isFirstRow = idx === 0;
      const isLastRow = idx === arr.length - 1;

      if (
        (isFirstRow &&
          (startRowCellBlockStarts || startRowCellBlockPositions)) ||
        (isLastRow && (endRowCellBlockEnds || endRowCellBlockPositions))
      ) {
        const newCells = row.cells.map((cell, cellIdx) => {
          const start =
            isFirstRow && startRowCellBlockPositions
              ? startRowCellBlockPositions[cellIdx]
              : undefined;
          const end =
            isLastRow && endRowCellBlockPositions
              ? endRowCellBlockPositions[cellIdx]
              : undefined;
          const startIdx =
            start?.blockIndex ??
            (isFirstRow && startRowCellBlockStarts
              ? (startRowCellBlockStarts[cellIdx] ?? 0)
              : 0);
          const endIdx =
            end?.blockIndex ??
            (isLastRow && endRowCellBlockEnds
              ? (endRowCellBlockEnds[cellIdx] ?? cell.blocks.length)
              : cell.blocks.length);
          const blocks = sliceCellBlocks(cell, startIdx, start, endIdx, end);
          return { ...cell, blocks };
        });
        return { ...row, cells: newCells };
      }
      return row;
    });

  return { ...table, rows: [...headerRows, ...bodyRows] };
}

function sliceCellBlocks(
  cell: EditorTableCellNode,
  startIndex: number,
  start: TableCellBlockPosition | undefined,
  endIndex: number,
  end: TableCellBlockPosition | undefined,
): EditorParagraphNode[] {
  const blocks: EditorParagraphNode[] = [];
  const endExclusive = end?.offset !== undefined ? endIndex + 1 : endIndex;
  for (let index = startIndex; index < endExclusive; index += 1) {
    const paragraph = cell.blocks[index];
    if (!paragraph) continue;
    const startOffset =
      start && start.blockIndex === index ? (start.offset ?? 0) : 0;
    const endOffset =
      end && end.blockIndex === index
        ? (end.offset ?? getParagraphTextLength(paragraph))
        : getParagraphTextLength(paragraph);
    if (startOffset <= 0 && endOffset >= getParagraphTextLength(paragraph)) {
      blocks.push(paragraph);
    } else if (endOffset > startOffset) {
      blocks.push(sliceParagraph(paragraph, startOffset, endOffset));
    }
  }
  return blocks;
}

function getParagraphTextLength(paragraph: EditorParagraphNode): number {
  return paragraph.runs.reduce((sum, run) => sum + run.text.length, 0);
}

function sliceParagraph(
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
