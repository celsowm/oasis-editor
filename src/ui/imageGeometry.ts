import {
  getDocumentPageSettings,
  getPageContentWidth,
  type EditorDocument,
} from "@/core/model.js";
import { getTableCellContentWidthForParagraph } from "./tableGeometry.js";

export const DEFAULT_MAX_INSERTED_IMAGE_WIDTH = 624;

/**
 * Maximum inline image width in CSS pixels for the given paragraph context.
 *
 * - When the paragraph lives inside a table cell, returns the cell's inner
 *   content width so the image fits the cell instead of overflowing it.
 * - When the paragraph is in the regular body/header/footer flow, returns
 *   the page's content width (between margins).
 *
 * The `_surface` parameter is kept for API compatibility with callers that
 * pass it; it is not used internally.
 */
export function getMaxInlineImageWidth(
  _surface: HTMLElement | undefined,
  document: EditorDocument,
  paragraphId?: string,
  activeSectionIndex: number = 0,
): number {
  const pageMax = getPageContentWidth(getDocumentPageSettings(document));
  if (!paragraphId) {
    return pageMax;
  }
  const cellMax = getTableCellContentWidthForParagraph(
    document,
    paragraphId,
    activeSectionIndex,
  );
  if (cellMax !== null && Number.isFinite(cellMax) && cellMax > 0) {
    return Math.min(pageMax, cellMax);
  }
  return pageMax;
}
