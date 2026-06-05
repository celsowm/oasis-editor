export { FOOTNOTE_MARKER_GUTTER_PX } from "./footnotePagination.js";

/** CSS reference: 96 device pixels per inch, 72 points per inch. */
export const PX_PER_POINT = 96 / 72;

/**
 * Extra gap (px) inserted between a paragraph border and its text, on top of
 * the border's own stroke width. Keeps glyphs from touching the box edges and
 * mirrors Word's small default `w:space` around paragraph borders.
 */
export const PARAGRAPH_BORDER_PADDING_PX = 2;
