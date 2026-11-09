/**
 * Paragraph alignment command.
 *
 * Word's paragraph "General › Alignment" (left/center/right/justify) is the
 * OOXML `w:jc/@w:val`. This exposes it as a value command (WordCraft's
 * `para.align`), setting the `align` style on every selected paragraph. A `null`
 * payload clears the key (returning to the paragraph's style default).
 *
 * A no-op (returns the same state) when nothing can change, and the selection
 * is preserved by paragraph offset.
 */
import type { EditorState } from "@/core/model.js";
import { setParagraphStyle } from "./block.js";

/** Word's paragraph alignment values (w:jc/@w:val). */
export type EditorParagraphAlign = "left" | "center" | "right" | "justify";

/**
 * Set the alignment (`align`) of every selected paragraph. Pass a
 * `left|center|right|justify` value to store it, or `null` to clear the key
 * (returning to the paragraph's style default). Returns the same state when
 * nothing changes.
 */
export function setParagraphAlign(
  state: EditorState,
  value: EditorParagraphAlign | null,
): EditorState {
  return setParagraphStyle(state, "align", value);
}
