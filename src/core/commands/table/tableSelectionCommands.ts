import type {
  EditorParagraphNode,
  EditorState,
  EditorTableCellNode,
  EditorTableNode,
} from "@/core/model.js";
import {
  getBlockParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import {
  buildTableCellLayout,
  type TableCellLayoutEntry,
} from "@/core/tableLayout.js";
import {
  getActiveTableStory,
  readInnermostTableAtPath,
  resolveActiveTableLocation,
} from "./tableCommandUtils.js";

/** The granularity of a table selection expansion. */
export type TableSelectionKind = "cell" | "row" | "column" | "table";

/**
 * Word's table Select commands: expand the current caret selection to cover the
 * active cell, row, column, or the whole table. Returns a new `EditorState`
 * whose selection spans the first paragraph of the first target cell to the end
 * of the last target cell (in document/visual order). A no-op when the caret is
 * outside a table.
 */
export function selectActiveTable(
  state: EditorState,
  kind: TableSelectionKind,
): EditorState {
  const targets = resolveSelectionTargets(state);
  if (!targets) return state;
  const { table, entries, active } = targets;

  const kept = selectedEntries(table, entries, active, kind);
  if (kept.length === 0) return state;

  const ordered = sortByVisualOrder(kept);
  const firstCell = ordered[0]!.cell;
  const lastCell = ordered[ordered.length - 1]!.cell;
  const firstParagraphs = getCellParagraphs(firstCell);
  const lastParagraphs = getCellParagraphs(lastCell);
  const first = firstParagraphs[0];
  const last = lastParagraphs[lastParagraphs.length - 1];
  if (!first || !last) return state;

  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(first, 0),
      focus: paragraphOffsetToPosition(last, getParagraphText(last).length),
    },
  };
}

/** True when the caret sits inside a table that can be selected. */
export function canSelectActiveTable(state: EditorState): boolean {
  return resolveActiveTableLocation(state) !== null;
}

/** Convenience wrappers matching the per-kind command surface. */
export function selectActiveTableCell(state: EditorState): EditorState {
  return selectActiveTable(state, "cell");
}

export function selectActiveTableRow(state: EditorState): EditorState {
  return selectActiveTable(state, "row");
}

export function selectActiveTableColumn(state: EditorState): EditorState {
  return selectActiveTable(state, "column");
}

export function selectActiveTableWholeTable(state: EditorState): EditorState {
  return selectActiveTable(state, "table");
}

function resolveSelectionTargets(state: EditorState): {
  table: EditorTableNode;
  entries: TableCellLayoutEntry[];
  active: TableCellLayoutEntry;
} | null {
  const target = resolveActiveTableLocation(state);
  if (!target) return null;
  const story = getActiveTableStory(state);
  if (!story) return null;
  const table = readInnermostTableAtPath(story, target.loc.tablePath);
  if (!table) return null;

  const entries = buildTableCellLayout(table);
  const active = entries.find(
    (entry): boolean =>
      entry.rowIndex === target.loc.rowIndex &&
      entry.cellIndex === target.loc.cellIndex,
  );
  if (!active) return null;
  return { table, entries, active };
}

/** Keeps only the entries belonging to the requested kind of selection. */
function selectedEntries(
  table: EditorTableNode,
  entries: readonly TableCellLayoutEntry[],
  active: TableCellLayoutEntry,
  kind: TableSelectionKind,
): TableCellLayoutEntry[] {
  switch (kind) {
    case "cell":
      return [active];
    case "row": {
      const rowStart = active.visualRowIndex;
      const rowEnd = active.visualRowIndex + active.rowSpan;
      return entries.filter((entry): boolean => {
        const eStart = entry.visualRowIndex;
        const eEnd = entry.visualRowIndex + entry.rowSpan;
        return eStart < rowEnd && rowStart < eEnd;
      });
    }
    case "column": {
      const colStart = active.visualColumnIndex;
      const colEnd = active.visualColumnIndex + active.colSpan;
      return entries.filter((entry): boolean => {
        const eStart = entry.visualColumnIndex;
        const eEnd = entry.visualColumnIndex + entry.colSpan;
        return eStart < colEnd && colStart < eEnd;
      });
    }
    case "table":
      return [...entries];
  }
}

/** Orders entries top-to-bottom, left-to-right (document/visual order). */
function sortByVisualOrder(
  entries: readonly TableCellLayoutEntry[],
): TableCellLayoutEntry[] {
  return [...entries].sort((a, b): number => {
    if (a.visualRowIndex !== b.visualRowIndex) {
      return a.visualRowIndex - b.visualRowIndex;
    }
    return a.visualColumnIndex - b.visualColumnIndex;
  });
}

/** Flattens a cell's blocks into its paragraphs in order. */
function getCellParagraphs(cell: EditorTableCellNode): EditorParagraphNode[] {
  return cell.blocks.flatMap(getBlockParagraphs);
}
