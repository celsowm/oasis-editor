/**
 * Table row "Break across pages" commands.
 *
 * Word's row property "Allow row to break across pages" (Table › Layout ›
 * Properties › Row tab) is the OOXML `w:trPr/w:cantSplit` element: when
 * present, the row is not allowed to break across a page boundary. In the
 * editor model the flag is `cantSplit`, so "Break across pages" is the inverse
 * (allowed) of "don't split". Only `cantSplit` is stored; it defaults to off,
 * so an explicit `true` writes `<w:cantSplit/>` and `null` clears the key.
 *
 * This command sets the flag on the active row (the one the caret sits in). A
 * no-op (returns the same state) when nothing can change.
 */
import type { EditorState } from "@/core/model.js";
import { resolveActiveTableLocation } from "./tableCommandUtils.js";
import { setSelectedTableRowStyleValue } from "./tableRowCommands.js";

/** True when the caret sits in a table row whose break setting can change. */
export function canSetActiveTableRowBreakAcrossPages(
  state: EditorState,
): boolean {
  return resolveActiveTableLocation(state) !== null;
}

/**
 * Set whether the active row may break across pages. Pass `true`/`false` for
 * the "allow" state (stored as the inverse on `cantSplit`), or `null` to clear
 * the key. Returns the same state when the caret is outside a table.
 */
export function setActiveTableRowBreakAcrossPages(
  state: EditorState,
  allow: boolean | null,
): EditorState {
  if (!canSetActiveTableRowBreakAcrossPages(state)) {
    return state;
  }
  const cantSplit = allow === null ? null : !allow;
  return setSelectedTableRowStyleValue(state, "cantSplit", cantSplit);
}
