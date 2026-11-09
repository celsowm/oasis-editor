/**
 * Paragraph widow-control command.
 *
 * Word's "Widow/Orphan control" (Paragraph › Line and Page Breaks tab) is the
 * OOXML `w:widowControl` flag: when on (the default), a widow or orphan line is
 * not allowed at the top or bottom of a page. The flag defaults to on, so
 * turning it off needs an explicit `false` (a `null`/absent value resolves
 * back to the default on).
 *
 * This command sets the flag on every selected paragraph. An explicit `false`
 * stores the off state so a later export honors it; `null` removes the key
 * (falling back to the default on). A no-op (returns the same state) when
 * nothing can change, and the selection is preserved by paragraph offset.
 */
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { cloneParagraph } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { normalizeSelection } from "@/core/selection.js";

/**
 * Set the widow-control flag (`widowControl`) of every selected paragraph.
 * Pass `true`/`false` to store the state explicitly, or `null` to clear the
 * key (defaults to on and is omitted on export). Returns the same state when
 * nothing changes.
 */
export function setParagraphWidowControl(
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
      const current = paragraph.style?.widowControl;
      const next = value === null ? undefined : value;
      if (current === next) {
        return paragraph;
      }
      changed = true;
      const style =
        next === undefined
          ? (() => {
              const { widowControl: _drop, ...rest } = paragraph.style ?? {};
              void _drop;
              return Object.keys(rest).length > 0 ? rest : undefined;
            })()
          : { ...(paragraph.style ?? {}), widowControl: next };
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
