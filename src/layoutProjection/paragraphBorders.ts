import type { EditorBorderStyle, EditorParagraphStyle } from "@/core/model.js";
import { PARAGRAPH_BORDER_PADDING_PX, PX_PER_POINT } from "./constants.js";

export interface ParagraphBorderInsets {
  top: number;
  bottom: number;
}

function isVisibleBorder(
  border: EditorBorderStyle | null | undefined,
): boolean {
  return !!border && border.type !== "none" && border.width > 0;
}

function edgeInset(border: EditorBorderStyle | null | undefined): number {
  if (!isVisibleBorder(border)) {
    return 0;
  }
  return border!.width * PX_PER_POINT + PARAGRAPH_BORDER_PADDING_PX;
}

/**
 * Vertical space (px) a paragraph's top/bottom borders add around its text.
 * Each visible edge reserves its stroke width plus
 * {@link PARAGRAPH_BORDER_PADDING_PX}; absent edges reserve nothing, so plain or
 * shading-only paragraphs are unchanged. Shared by pagination (to reserve the
 * height) and the canvas/PDF painters (to size the box and offset the text).
 */
export function getParagraphBorderInsets(
  style: EditorParagraphStyle,
): ParagraphBorderInsets {
  return {
    top: edgeInset(style.borderTop),
    bottom: edgeInset(style.borderBottom),
  };
}

/**
 * Word draws a `w:between` paragraph border only when two *consecutive*
 * paragraphs both define a matching `between` edge (same style, width, and
 * color). This predicate encodes that matching rule so the canvas and PDF
 * renderers share one source of truth. Returns false when either side has no
 * visible `between` border.
 */
export function paragraphBetweenBorderMatches(
  a: EditorParagraphStyle,
  b: EditorParagraphStyle,
): boolean {
  const ba = a.borderBetween;
  const bb = b.borderBetween;
  if (!isVisibleBorder(ba) || !isVisibleBorder(bb)) {
    return false;
  }
  return (
    ba!.type === bb!.type && ba!.width === bb!.width && ba!.color === bb!.color
  );
}
