/**
 * Paragraph text-direction command.
 *
 * Word's paragraph "Text Direction" (Word's Layout › Text Direction and the
 * OOXML `w:textDirection/@w:val`) sets the flow of vertical text within a
 * paragraph: `lrTb` (left-to-right, top-to-bottom), `tbRl` (vertical, top to
 * bottom), `btLr`, `lrTbV`, and `tbRlV`. It round-trips through OOXML and is
 * otherwise a mostly faithful round-trip property in the editor.
 *
 * This command sets the flow on every selected paragraph. Passing `null`
 * removes the key (back to the `lrTb` default, which is omitted on export). A
 * no-op (returns the same state) when nothing can change, and the selection is
 * preserved by paragraph offset.
 */
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { cloneParagraph } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { normalizeSelection } from "@/core/selection.js";

/** Valid `w:textDirection/@w:val` values for a paragraph. */
export type ParagraphTextDirection =
  | "lrTb"
  | "tbRl"
  | "btLr"
  | "lrTbV"
  | "tbRlV";

const VALID_DIRECTIONS: ReadonlySet<string> = new Set([
  "lrTb",
  "tbRl",
  "btLr",
  "lrTbV",
  "tbRlV",
]);

/**
 * Set the text flow (`textDirection`) of every selected paragraph. Pass one of
 * the five OOXML values to store it, or `null` to clear the key (default
 * `lrTb`, omitted on export). Returns the same state when nothing changes.
 */
export function setParagraphTextDirection(
  state: EditorState,
  direction: ParagraphTextDirection | null,
): EditorState {
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
      const current = paragraph.style?.textDirection;
      const next =
        direction === null || direction === "lrTb"
          ? undefined
          : VALID_DIRECTIONS.has(direction)
            ? direction
            : current;
      if (current === next) {
        return paragraph;
      }
      changed = true;
      const style =
        next === undefined
          ? (() => {
              const { textDirection: _drop, ...rest } = paragraph.style ?? {};
              void _drop;
              return Object.keys(rest).length > 0 ? rest : undefined;
            })()
          : { ...(paragraph.style ?? {}), textDirection: next };
      return {
        ...cloneParagraph(paragraph),
        style,
      };
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
