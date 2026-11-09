/**
 * Paragraph promote / demote (outline step) command.
 *
 * Mirrors WordCraft's `para.promote` / `para.demote` (Word's Alt+Shift+Left /
 * Alt+Shift+Right, the outline keys outside Outline view, ⌃⇧←/→): a heading
 * moves up or down one level (Heading 1 and Heading 9 are the ends); body text
 * promoted becomes a heading at the level of the heading before it (Heading 1
 * when there is none) and can't be demoted further; a list item changes list
 * level like Shift+Tab / Tab.
 *
 * Unlike the reorder commands this only rewrites per-paragraph style/list
 * metadata, so it maps each selected paragraph independently and preserves the
 * selection by paragraph offset.
 */
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { cloneParagraph } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { cloneParagraphWithListLevel } from "@/core/document/paragraphRuns.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { normalizeSelection } from "@/core/selection.js";
import { getHeadingLevel } from "@/core/headings.js";

/** The top heading level (WordCraft's `ensure_heading_style` "Heading1"). */
export const MIN_HEADING_LEVEL = 1;
/** The bottom heading level. */
export const MAX_HEADING_LEVEL = 9;
/** The deepest list level WordCraft allows when demoting (level+1 min 8). */
export const MAX_LIST_LEVEL = 8;

/**
 * Promote (`promote: true`) or demote (`promote: false`) the outline step of
 * every paragraph the selection touches, mirroring WordCraft's `outline_step`.
 * A no-op (returns the same state) when nothing can be changed.
 */
export function stepOutlineLevel(
  state: EditorState,
  promote: boolean,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);

  // The heading level immediately before the selection, for promoted body
  // text (Heading 1 when there is none). Mirrors WordCraft's `before`.
  let precedingHeadingLevel = MIN_HEADING_LEVEL;
  for (let i = 0; i < normalized.startIndex; i += 1) {
    const level = getHeadingLevel(paragraphs[i]?.style?.styleId);
    if (level !== null) precedingHeadingLevel = level;
  }

  let changed = false;
  const nextParagraphs = paragraphs.map(
    (paragraph, paragraphIndex): EditorParagraphNode => {
      if (
        paragraphIndex < normalized.startIndex ||
        paragraphIndex > normalized.endIndex
      ) {
        return cloneParagraph(paragraph);
      }

      const headingLevel = getHeadingLevel(paragraph.style?.styleId);

      // A list item changes list level (promote decreases, demote increases),
      // never its heading style.
      if (paragraph.list && paragraph.list.kind) {
        const currentLevel = paragraph.list.level ?? 0;
        const nextLevel = promote
          ? Math.max(0, currentLevel - 1)
          : Math.min(MAX_LIST_LEVEL, currentLevel + 1);
        if (nextLevel === currentLevel) {
          return cloneParagraph(paragraph);
        }
        changed = true;
        return cloneParagraphWithListLevel(paragraph, nextLevel);
      }

      // A heading moves up/down one level, Heading 1 and Heading 9 are the ends.
      if (headingLevel !== null) {
        const nextLevel = promote
          ? Math.max(MIN_HEADING_LEVEL, headingLevel - 1)
          : Math.min(MAX_HEADING_LEVEL, headingLevel + 1);
        if (nextLevel === headingLevel) {
          return cloneParagraph(paragraph);
        }
        changed = true;
        const next = cloneParagraph(paragraph);
        next.style = {
          ...(paragraph.style ?? {}),
          styleId: `heading${nextLevel}`,
          outlineLevel: undefined,
        };
        return next;
      }

      // Body text: promoting makes it the heading before it; demoting is
      // refused (can't demote body text any further).
      if (!promote) {
        return cloneParagraph(paragraph);
      }
      changed = true;
      const next = cloneParagraph(paragraph);
      next.style = {
        ...(paragraph.style ?? {}),
        styleId: `heading${precedingHeadingLevel}`,
        outlineLevel: undefined,
      };
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
