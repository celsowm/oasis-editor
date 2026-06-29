export { PX_PER_POINT } from "@/core/units.js";

/**
 * Horizontal gutter (px) reserved for the footnote marker column, shared by the
 * layout projector, canvas painter and PDF exporter. Lives here (a leaf module)
 * rather than in `footnotePagination` so consumers don't pull in pagination
 * logic just to read a constant.
 */
export const FOOTNOTE_MARKER_GUTTER_PX = 24;

/**
 * Extra gap (px) inserted between a paragraph border and its text, on top of
 * the border's own stroke width. Keeps glyphs from touching the box edges and
 * mirrors Word's small default `w:space` around paragraph borders.
 */
export const PARAGRAPH_BORDER_PADDING_PX = 2;
