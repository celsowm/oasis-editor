import type {
  EditorState,
  EditorTableNode,
  EditorTableRowNode,
} from "@/core/model.js";
import {
  getActiveTableStory,
  readInnermostTableAtPath,
  resolveActiveTableLocation,
  updateActiveTableBlocks,
} from "./tableCommandUtils.js";

/** True when the caret sits inside a table whose header row can be repeated. */
export function canToggleRepeatHeaderRows(state: EditorState): boolean {
  const target = resolveActiveTableLocation(state);
  if (!target) return false;
  const story = getActiveTableStory(state);
  if (!story) return false;
  const table = readInnermostTableAtPath(story, target.loc.tablePath);
  return table !== null && table.rows.length > 0;
}

/**
 * True when the active table repeats its first row as a header across page
 * breaks (Word's "Repeat Header Rows" active state).
 */
export function isRepeatHeaderRowsActive(state: EditorState): boolean {
  const target = resolveActiveTableLocation(state);
  if (!target) return false;
  const story = getActiveTableStory(state);
  if (!story) return false;
  const table = readInnermostTableAtPath(story, target.loc.tablePath);
  if (!table || table.rows.length === 0) return false;
  return isHeaderRow(table.rows[0]!);
}

/**
 * Word's "Repeat Header Rows": toggles whether the active table's first row is a
 * header that repeats at the top of each page. Setting it marks the first row as
 * a header; clearing it removes that mark. A no-op when the caret is outside a
 * table, or when the active table has no rows.
 */
export function toggleRepeatHeaderRows(state: EditorState): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;

  const story = getActiveTableStory(state);
  if (!story) return state;
  const table = readInnermostTableAtPath(story, target.loc.tablePath);
  if (!table || table.rows.length === 0) return state;

  const header = isHeaderRow(table.rows[0]!);
  const update = (current: EditorTableNode): EditorTableNode => ({
    ...current,
    rows: current.rows.map((row, index): EditorTableRowNode => {
      if (index !== 0) return row;
      if (header) {
        return { ...row, isHeader: undefined };
      }
      return { ...row, isHeader: true };
    }),
  });
  return updateActiveTableBlocks(state, update);
}

function isHeaderRow(row: EditorTableRowNode): boolean {
  return row.isHeader === true;
}
