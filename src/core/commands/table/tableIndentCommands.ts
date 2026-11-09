/**
 * Table indent commands.
 *
 * Word's table Indent from Left (Table › Table Properties › Table tab) is the
 * OOXML `w:tblPr/w:tblInd` element: the horizontal offset of the whole table
 * from the left margin. This module sets that indent on the active table (the
 * one the caret sits in).
 *
 * A `null` value removes the key (Word's default of zero/omitted). Only
 * positive-or-zero, non-NaN values are stored; anything else clears the key. A
 * no-op returns the same state when nothing can change.
 */
import type { EditorState } from "@/core/model.js";
import { resolveActiveTableLocation } from "./tableCommandUtils.js";
import { setTableStyleValue } from "./tableStyleCommands.js";

/** True when the caret sits inside a table whose indent can be set. */
export function canSetActiveTableIndent(state: EditorState): boolean {
  return resolveActiveTableLocation(state) !== null;
}

/**
 * Set the active table's indent from left (`w:tblInd`) in points, or clear it
 * with `null` (Word's default). Returns the same state when the value is
 * unchanged.
 */
export function setActiveTableIndent(
  state: EditorState,
  value: number | null,
): EditorState {
  if (!canSetActiveTableIndent(state)) {
    return state;
  }
  if (
    value === null ||
    value < 0 ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return setTableStyleValue(state, "indentLeft", null);
  }
  return setTableStyleValue(state, "indentLeft", Math.round(value * 2) / 2);
}
