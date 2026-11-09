/**
 * Paragraph formatting reset command.
 *
 * Mirrors WordCraft's `para.reset` (Word's "Reset Paragraph Formatting",
 * Ctrl+Q): every paragraph the selection touches is returned to its applied
 * named style by removing all *direct* (local) paragraph formatting — alignment,
 * spacing, indents, line rule, shading, borders, tab stops, keep/break and
 * bidi flags, and outline level — while preserving the paragraph's named style
 * reference (`styleId`), its list/numbering, its drop cap, and its content.
 *
 * Per paragraph this is a no-op when there is no direct formatting to remove
 * (only the named style is present), and the whole command returns the same
 * state when nothing can change. The selection is preserved by paragraph
 * offset.
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

/** The direct paragraph-formatting keys `para.reset` removes. */
export const RESET_PARAGRAPH_KEYS: readonly (keyof EditorParagraphStyle)[] = [
  "align",
  "spacingBefore",
  "spacingAfter",
  "lineHeight",
  "lineRule",
  "indentLeft",
  "indentRight",
  "indentFirstLine",
  "indentHanging",
  "mirrorIndents",
  "contextualSpacing",
  "outlineLevel",
  "shading",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "tabs",
  "pageBreakBefore",
  "keepWithNext",
  "keepLinesTogether",
  "widowControl",
  "bidi",
];

/**
 * Remove all direct paragraph formatting from the selected paragraphs, keeping
 * their named style reference (`styleId`), list, and drop cap. Returns the same
 * state when there is nothing to reset.
 */
export function resetParagraphFormatting(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
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

      const style = paragraph.style;
      // Nothing to reset when there is no direct paragraph style at all or
      // only the named-style reference remains.
      if (!style || RESET_PARAGRAPH_KEYS.every((key) => !(key in style))) {
        return paragraph;
      }

      changed = true;
      const next = cloneParagraph(paragraph);
      const nextStyle: EditorParagraphStyle = style.styleId
        ? { styleId: style.styleId }
        : {};
      next.style = Object.keys(nextStyle).length > 0 ? nextStyle : undefined;
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
