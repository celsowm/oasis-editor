/**
 * Paragraph suppress-auto-hyphens command.
 *
 * Word's paragraph "Don't hyphenate" option is the OOXML
 * `w:suppressAutoHyphens` flag: when on, automatic hyphenation is disabled for
 * the paragraph even if the section/document allows hyphens. This command
 * mirrors that affordance by setting the flag on every selected paragraph.
 *
 * The flag defaults to off; an explicit `false` stores the off state so a
 * later export honors it, while `null` removes the key (falling back to the
 * default). A no-op (returns the same state) when nothing can change, and the
 * selection is preserved by paragraph offset.
 */
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { cloneParagraph } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { normalizeSelection } from "@/core/selection.js";

/**
 * Set the suppress-auto-hyphens flag (`suppressAutoHyphens`) of every selected
 * paragraph. Pass `true`/`false` to store the state explicitly, or `null` to
 * clear the key (default off). Returns the same state when nothing changes.
 */
export function setParagraphSuppressAutoHyphens(
  state: EditorState,
  value: boolean | null,
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
      const current = paragraph.style?.suppressAutoHyphens;
      const next = value === null ? undefined : value;
      if (current === next) {
        return paragraph;
      }
      changed = true;
      const style =
        next === undefined
          ? (() => {
              const { suppressAutoHyphens: _drop, ...rest } =
                paragraph.style ?? {};
              void _drop;
              return Object.keys(rest).length > 0 ? rest : undefined;
            })()
          : { ...(paragraph.style ?? {}), suppressAutoHyphens: next };
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
