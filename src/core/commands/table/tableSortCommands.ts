import type {
  EditorState,
  EditorTableNode,
  EditorTableCellNode,
  EditorParagraphNode,
  EditorTableRowNode,
} from "@/core/model.js";
import { getBlockParagraphs } from "@/core/model.js";
import {
  getActiveTableStory,
  readInnermostTableAtPath,
  resolveActiveTableLocation,
  updateActiveTableBlocks,
} from "./tableCommandUtils.js";

export type TableSortDirection = "ascending" | "descending";

/** True when the active table has at least two body rows that can be reordered. */
export function canSortActiveTable(state: EditorState): boolean {
  const target = resolveActiveTableLocation(state);
  if (!target) return false;
  const story = getActiveTableStory(state);
  if (!story) return false;
  const table = readInnermostTableAtPath(story, target.loc.tablePath);
  if (!table) return false;
  return countBodyRows(table.rows) >= 2;
}

function countBodyRows(rows: EditorTableRowNode[]): number {
  let body = 0;
  for (const row of rows) {
    if (!row.isHeader) body += 1;
  }
  return body;
}

/**
 * Word's "Sort": reorders the active table's body rows by the text in the
 * column under the caret, ascending or descending. A header row (row.isHeader)
 * stays pinned at the top. A no-op when the caret is outside a table.
 */
export function sortActiveTable(
  state: EditorState,
  direction: TableSortDirection,
): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;
  const sortColumn = target.loc.cellIndex;

  const update = (table: EditorTableNode): EditorTableNode => {
    const sorted = sortTableRows(table, sortColumn, direction);
    if (sorted === table.rows) return table;
    return { ...table, rows: sorted };
  };
  return updateActiveTableBlocks(state, update);
}

/**
 * Sorts the body rows of a table by the text in `columnIndex`. Rows flagged as
 * headers stay in place; all other rows are reordered by their cell's flattened
 * text. Returns the original rows array when nothing changes.
 */
export function sortTableRows(
  table: EditorTableNode,
  columnIndex: number,
  direction: TableSortDirection,
): EditorTableRowNode[] {
  const headerRows: EditorTableRowNode[] = [];
  const bodyRows: EditorTableRowNode[] = [];
  for (const row of table.rows) {
    if (row.isHeader) {
      headerRows.push(row);
    } else {
      bodyRows.push(row);
    }
  }
  if (bodyRows.length < 2) return table.rows;

  const factor = direction === "ascending" ? 1 : -1;
  const sortedBody = [...bodyRows].sort((a, b): number => {
    const left = cellText(a.cells[columnIndex]);
    const right = cellText(b.cells[columnIndex]);
    return left.localeCompare(right, undefined, { numeric: true }) * factor;
  });

  const next = [...headerRows, ...sortedBody];
  if (
    next.length === table.rows.length &&
    next.every((row, index) => row === table.rows[index])
  ) {
    return table.rows;
  }
  return next;
}

function cellText(cell: EditorTableCellNode | undefined): string {
  if (!cell) return "";
  return cell.blocks
    .flatMap((block): EditorParagraphNode[] =>
      block.type === "paragraph" ? [block] : getBlockParagraphs(block),
    )
    .map((paragraph) => paragraph.runs.map((run) => run.text).join(""))
    .join("\n");
}
