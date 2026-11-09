/**
 * Horizontal line insertion (WordCraft's `insert.horizontalLine`, Word's
 * "Horizontal Line" in Home > Paragraph > Borders).
 *
 * Faithful to WordCraft, this is not a text insertion: it applies a single
 * 1.5-point bottom border to every paragraph the selection touches, matching
 * Word's horizontal-line button which draws a bottom border on the current
 * paragraph. The rest of the paragraph's borders are left untouched.
 */
import type { EditorBorderStyle, EditorState } from "@/core/model.js";
import { setParagraphStyle } from "./block.js";

/** Word's horizontal line border: single, 1.5 pt, black. */
const HORIZONTAL_LINE_BORDER: EditorBorderStyle = {
  width: 1.5,
  type: "solid",
  color: "#000000",
};

/** Apply a horizontal-line (single 1.5pt bottom) border to the selection. */
export function applyHorizontalLine(state: EditorState): EditorState {
  return setParagraphStyle(state, "borderBottom", HORIZONTAL_LINE_BORDER);
}
