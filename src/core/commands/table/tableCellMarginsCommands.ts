import type { EditorState } from "@/core/model.js";
import { resolveActiveTableLocation } from "./tableCommandUtils.js";
import { setTableCellStyleValue } from "./tableCellStyleCommands.js";

/**
 * Cell margins in points, applied as per-direction cell padding
 * (`w:tcPr/w:tcMar/w:top|w:right|w:bottom|w:left`). Omitted directions are left
 * untouched so callers can adjust a single edge without disturbing the others.
 */
export interface TableCellMargins {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/** True when the caret sits inside a table whose cells can be re-margined. */
export function canSetTableCellMargins(state: EditorState): boolean {
  return resolveActiveTableLocation(state) !== null;
}

/**
 * Word's cell margins: set the padding of every resolved table cell. Only the
 * provided edges are changed; any direction left `undefined` keeps its current
 * value. A single transactional merge key keeps the whole change one undo step.
 */
export function setActiveTableCellMargins(
  state: EditorState,
  margins: TableCellMargins,
): EditorState {
  let next: EditorState = state;
  if (margins.top !== undefined) {
    next = setTableCellStyleValue(next, "paddingTop", margins.top);
  }
  if (margins.right !== undefined) {
    next = setTableCellStyleValue(next, "paddingRight", margins.right);
  }
  if (margins.bottom !== undefined) {
    next = setTableCellStyleValue(next, "paddingBottom", margins.bottom);
  }
  if (margins.left !== undefined) {
    next = setTableCellStyleValue(next, "paddingLeft", margins.left);
  }
  return next;
}
