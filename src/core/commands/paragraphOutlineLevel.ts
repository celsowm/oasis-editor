/**
 * Paragraph outline-level command.
 *
 * Mirrors WordCraft's `para.outlineLevel` / `outline.level` (Word's
 * Paragraph → Outline level, and the Outlining tab dropdown): sets the
 * outline level of every paragraph the selection touches. In OOXML an outline
 * level is stored directly as `w:outlineLvl/@w:val` (0–8, where 0 is Heading 1
 * … 8 is Heading 9); `null` returns a paragraph to body text by removing the
 * level. The command is a no-op (returns the same state) when nothing can
 * change, and preserves the selection by paragraph offset.
 */
import type {
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorState,
} from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { cloneParagraph } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { normalizeSelection } from "@/core/selection.js";

/** The lowest outline level (Heading 1 in OOXML, `w:outlineLvl` 0). */
export const MIN_OUTLINE_LEVEL = 0;
/** The highest outline level (Heading 9 in OOXML, `w:outlineLvl` 8). */
export const MAX_OUTLINE_LEVEL = 8;

/**
 * Set the outline level of every selected paragraph (`level` 0–8, mirroring
 * OOXML) or return it to body text (`null` / `undefined`). Returns the same
 * state when nothing changes.
 */
export function setParagraphOutlineLevel(
  state: EditorState,
  level: number | null | undefined,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const resolved =
    level === null || level === undefined
      ? null
      : Math.min(MAX_OUTLINE_LEVEL, Math.max(MIN_OUTLINE_LEVEL, Math.round(level)));

  let changed = false;
  const nextParagraphs = paragraphs.map(
    (paragraph, paragraphIndex): EditorParagraphNode => {
      if (
        paragraphIndex < normalized.startIndex ||
        paragraphIndex > normalized.endIndex
      ) {
        return paragraph;
      }

      const current = paragraph.style?.outlineLevel ?? null;
      if (current === resolved) {
        return paragraph;
      }

      changed = true;
      const nextStyle: EditorParagraphStyle = {
        ...(paragraph.style ?? {}),
      };
      if (resolved === null) {
        delete nextStyle.outlineLevel;
      } else {
        nextStyle.outlineLevel = resolved;
      }
      const next = cloneParagraph(paragraph);
      next.style =
        Object.keys(nextStyle).length > 0 ? nextStyle : undefined;
      return next;
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
