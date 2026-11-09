/**
 * Paragraph list-level command.
 *
 * Mirrors WordCraft's `para.listLevel` (Word's Home › Paragraph › Bullets ›
 * Change List Level): sets the explicit list level (0–8) of every selected
 * paragraph that is in a list. A paragraph with no list is left untouched; a
 * level outside the valid range is clamped. The command is a no-op (returns
 * the same state) when nothing can change, and preserves the selection by
 * paragraph offset.
 */
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { cloneParagraphWithListLevel } from "@/core/document/paragraphRunBuild.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { normalizeSelection } from "@/core/selection.js";

/** The highest list level (`w:lvl` is 0–8). */
export const MAX_LIST_LEVEL = 8;

/**
 * Set the explicit list level of every selected list paragraph (`level`
 * 0–8). Returns the same state when nothing changes.
 */
export function setParagraphListLevel(
  state: EditorState,
  level: number,
): EditorState {
  const normalized = normalizeSelection(state);
  const resolved = Math.min(MAX_LIST_LEVEL, Math.max(0, Math.round(level)));
  const paragraphs = getParagraphs(state);

  let changed = false;
  const nextParagraphs = paragraphs.map(
    (paragraph, paragraphIndex): EditorParagraphNode => {
      if (
        paragraphIndex < normalized.startIndex ||
        paragraphIndex > normalized.endIndex
      ) {
        return paragraph;
      }
      if (!paragraph.list) {
        return paragraph;
      }
      const current = paragraph.list.level ?? 0;
      if (current === resolved) {
        return paragraph;
      }
      changed = true;
      return cloneParagraphWithListLevel(paragraph, resolved);
    },
  );

  if (!changed) {
    return state;
  }

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}
