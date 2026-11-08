import type { EditorState } from "@/core/model.js";
import { resolveActiveTableLocation } from "./tableCommandUtils.js";
import { setSelectedTableRowStyleValue } from "./tableRowCommands.js";

/**
 * Word's table row height (Table Layout › Cell Size). Sets the height (and
 * optional rule) of the active row, mirroring the cell-width payload command.
 * `heightRule` follows Word's "exact"/"atLeast" semantics; omit it to leave the
 * current rule untouched.
 */
export interface TableRowHeight {
  /** Row height in points. `null` clears the explicit height. */
  height: number | string | null;
  /** Optional trHeightRule; omitted leaves the current rule. */
  heightRule?: "exact" | "atLeast";
}

/** True when the caret sits inside a table row whose height can be changed. */
export function canSetActiveTableRowHeight(state: EditorState): boolean {
  return resolveActiveTableLocation(state) !== null;
}

/**
 * Word's row height: apply the requested height (and optional rule) to the row
 * containing the caret. A single transactional merge key keeps the whole change
 * one undo step.
 */
export function setActiveTableRowHeight(
  state: EditorState,
  value: TableRowHeight,
): EditorState {
  let next: EditorState = state;
  next = setSelectedTableRowStyleValue(next, "height", value.height);
  if (value.heightRule !== undefined) {
    next = setSelectedTableRowStyleValue(next, "heightRule", value.heightRule);
  }
  return next;
}
