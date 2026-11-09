/**
 * Table cell-spacing commands.
 *
 * Word's cell spacing (Table › Table Properties › Options, and the OOXML
 * `w:tblPr/w:tblCellSpacing`) is the gap between adjacent cells in the whole
 * table, in contrast to cell margins which are the padding inside each cell.
 *
 * This module sets the cell spacing on the active table (the one the caret
 * sits in). A `null` value removes the key (the Word default of zero/omitted).
 * A no-op returns the same state when nothing can change.
 */
import type { EditorState } from "@/core/model.js";
import { resolveActiveTableLocation } from "./tableCommandUtils.js";
import { setTableStyleValue } from "./tableStyleCommands.js";

/** True when the caret sits inside a table whose cell spacing can be set. */
export function canSetActiveTableCellSpacing(state: EditorState): boolean {
  return resolveActiveTableLocation(state) !== null;
}

/**
 * Set the active table's cell spacing (`w:tblCellSpacing`) in points, or clear
 * it with `null` (Word's default). Returns the same state when the value is
 * unchanged.
 */
export function setActiveTableCellSpacing(
  state: EditorState,
  value: number | null,
): EditorState {
  if (!canSetActiveTableCellSpacing(state)) {
    return state;
  }
  if (value === null || value < 0) {
    return setTableStyleValue(state, "cellSpacing", value === null ? null : 0);
  }
  return setTableStyleValue(state, "cellSpacing", Math.round(value * 2) / 2);
}
