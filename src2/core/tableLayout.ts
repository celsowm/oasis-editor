import type { Editor2TableCellNode, Editor2TableNode } from "./model.js";

export interface TableCellLayoutEntry {
  rowIndex: number;
  cellIndex: number;
  visualRowIndex: number;
  visualColumnIndex: number;
  rowSpan: number;
  colSpan: number;
  cell: Editor2TableCellNode;
}

export function buildTableCellLayout(table: Editor2TableNode): TableCellLayoutEntry[] {
  const occupiedColumns: number[] = [];
  const entries: TableCellLayoutEntry[] = [];

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex];
    let visualColumnIndex = 0;

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

    for (let columnIndex = 0; columnIndex < occupiedColumns.length; columnIndex += 1) {
      if (occupiedColumns[columnIndex] > 0) {
        occupiedColumns[columnIndex] -= 1;
      }
    }
  }

  return entries;
}
