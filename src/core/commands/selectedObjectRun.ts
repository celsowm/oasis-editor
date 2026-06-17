import type {
  EditorParagraphNode,
  EditorState,
  EditorTextRun,
} from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";

/**
 * A run holding an inline object (image or text box) that is the sole content
 * of the current selection.
 */
export interface SelectedObjectRun {
  paragraph: EditorParagraphNode;
  paragraphIndex: number;
  run: EditorTextRun;
  runIndex: number;
  offset: number;
}

/**
 * Finds the object run currently selected, when the selection is exactly one
 * object-replacement character wide within a single paragraph. `predicate`
 * decides which kind of object run qualifies (e.g. `run.image` vs
 * `run.textBox`). Returns `null` when the selection is not a single object.
 */
export function getSelectedObjectRun(
  state: EditorState,
  predicate: (run: EditorTextRun) => boolean,
): SelectedObjectRun | null {
  const normalized = normalizeSelection(state);
  if (
    normalized.isCollapsed ||
    normalized.startIndex !== normalized.endIndex ||
    normalized.endParagraphOffset - normalized.startParagraphOffset !== 1
  ) {
    return null;
  }

  const paragraphs = getParagraphs(state);
  const paragraph = paragraphs[normalized.startIndex];
  if (!paragraph) {
    return null;
  }

  let consumed = 0;
  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index]!;
    const startOffset = consumed;
    consumed += run.text.length;
    if (
      predicate(run) &&
      run.text.length === 1 &&
      startOffset === normalized.startParagraphOffset
    ) {
      return {
        paragraph,
        paragraphIndex: normalized.startIndex,
        run,
        runIndex: index,
        offset: startOffset,
      };
    }
  }

  return null;
}
