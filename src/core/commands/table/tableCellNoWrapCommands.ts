/**
 * Table cell no-wrap commands.
 *
 * Word's cell "Wrap text" (Table › Layout › Properties › Cell › Options) is
 * the OOXML `w:tcPr/w:noWrap` flag: when present, the cell's text does not
 * wrap and the cell widens to fit the line. The flag defaults to off, so an
 * explicit `false` stores the off state so a later export honors it, while
 * `null` removes the key (falling back to the default, wrapping allowed).
 *
 * This command sets the flag on every selected cell (or the active cell when
 * the caret has no multi-cell selection). A no-op (returns the same state)
 * when nothing can change.
 */
import type { EditorState } from "@/core/model.js";
import { setTableCellStyleValue } from "./tableCellStyleCommands.js";

/**
 * Set the no-wrap flag (`noWrap`) of every selected cell. Pass `true`/`false`
 * to store the state explicitly, or `null` to clear the key (default off).
 * Returns the same state when the caret is outside a table.
 */
export function setTableCellNoWrap(
  state: EditorState,
  value: boolean | null,
): EditorState {
  return setTableCellStyleValue(state, "noWrap", value);
}
