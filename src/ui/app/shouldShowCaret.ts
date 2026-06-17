import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  type EditorState,
} from "@/core/model.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import type { CaretBox } from "@/ui/editorUiTypes.js";

/**
 * Decides whether the text caret should be painted: only for a visible, collapsed
 * selection that is not a cross-cell table selection (where the caret would be
 * ambiguous between cells).
 */
export function computeShouldShowCaret(
  state: EditorState,
  caretBox: CaretBox,
): boolean {
  if (!caretBox.visible || !isSelectionCollapsed(state.selection)) {
    return false;
  }
  const sectionIndex = getActiveSectionIndex(state);
  const anchorLoc = findParagraphTableLocation(
    state.document,
    state.selection.anchor.paragraphId,
    sectionIndex,
  );
  const focusLoc = findParagraphTableLocation(
    state.document,
    state.selection.focus.paragraphId,
    sectionIndex,
  );
  const inTableSelection =
    anchorLoc &&
    focusLoc &&
    anchorLoc.blockIndex === focusLoc.blockIndex &&
    (anchorLoc.rowIndex !== focusLoc.rowIndex ||
      anchorLoc.cellIndex !== focusLoc.cellIndex);
  return !inTableSelection;
}
