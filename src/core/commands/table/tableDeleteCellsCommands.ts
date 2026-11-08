import type {
  EditorParagraphNode,
  EditorState,
  EditorTableCellNode,
  EditorTableNode,
  EditorTableRowNode,
} from "@/core/model.js";
import { getBlockParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { withSelection } from "@/core/selection/rangeEditing.js";
import {
  getActiveTableStory,
  readInnermostTableAtPath,
  resolveActiveTableLocation,
  updateActiveTableBlocks,
} from "./tableCommandUtils.js";

/**
 * True when the caret sits inside a table, on a row that has more than one cell
 * (so Word's "Delete Cells" would leave the row with at least one cell after
 * removing the active one).
 */
export function canDeleteActiveTableCell(state: EditorState): boolean {
  const row = activeRow(state);
  return Boolean(row && row.cells.length > 1);
}

/**
 * Word's "Delete Cells": removes the active (innermost) cell from its row,
 * shifting the cells to its right one cell left. A no-op when the caret is
 * outside a table or the row has only one cell (Word leaves a single-celled row
 * intact). The caret lands in the cell that now occupies the removed cell's
 * position, or in the cell immediately to its left when the removed cell was
 * the row's last one.
 */
export function deleteActiveTableCell(state: EditorState): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;
  const story = getActiveTableStory(state);
  if (!story) return state;
  const table = readInnermostTableAtPath(story, target.loc.tablePath);
  if (!table) return state;

  const rowIndex = target.loc.rowIndex;
  const cellIndex = target.loc.cellIndex;
  const row = table.rows[rowIndex];
  if (!row || row.cells.length <= 1 || cellIndex >= row.cells.length) {
    return state;
  }

  const next = updateActiveTableBlocks(state, (current): EditorTableNode => {
    const nextRows = current.rows.map(
      (targetRow, index): EditorTableRowNode => {
        if (index !== rowIndex) return targetRow;
        const nextCells = targetRow.cells.filter(
          (_cell, indexInRow): boolean => indexInRow !== cellIndex,
        );
        return { ...targetRow, cells: nextCells };
      },
    );
    return { ...current, rows: nextRows };
  });
  if (next === state) return state;

  // The caret's paragraph was deleted with its cell; land in the cell that now
  // occupies the removed cell's position, or the one immediately to its left.
  const survivor = row.cells[Math.min(cellIndex, row.cells.length - 2)];
  const caretParagraph = survivor ? firstParagraphInCell(survivor) : null;
  if (caretParagraph) {
    return {
      ...next,
      selection: withSelection(paragraphOffsetToPosition(caretParagraph, 0)),
    };
  }
  return next;
}

function activeRow(state: EditorState): EditorTableRowNode | null {
  const target = resolveActiveTableLocation(state);
  if (!target) return null;
  const story = getActiveTableStory(state);
  if (!story) return null;
  const table = readInnermostTableAtPath(story, target.loc.tablePath);
  if (!table) return null;
  return table.rows[target.loc.rowIndex] ?? null;
}

/** The first paragraph nested inside `cell`, in document order. */
function firstParagraphInCell(
  cell: EditorTableCellNode,
): EditorParagraphNode | null {
  const paragraphs = cell.blocks.flatMap(getBlockParagraphs);
  return paragraphs[0] ?? null;
}
