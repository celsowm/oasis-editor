import {
  getDocumentPageSettings,
  getPageContentWidth,
  type EditorDocument,
} from "../core/model.js";

export const DEFAULT_MAX_INSERTED_IMAGE_WIDTH = 624;

/**
 * Maximum inline image width in CSS pixels, derived from the document's
 * page geometry. We deliberately ignore the table cell width: MS Word
 * allows images to grow and push the table cell/column width up to the
 * page margins.
 */
export function getMaxInlineImageWidth(
  _surface: HTMLElement | undefined,
  document: EditorDocument,
  _paragraphId?: string,
): number {
  return getPageContentWidth(getDocumentPageSettings(document));
}
