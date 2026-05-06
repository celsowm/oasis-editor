import {
  getDocumentPageSettings,
  getPageContentWidth,
  type EditorDocument,
} from "../core/model.js";
import { getParagraphElements } from "./positionAtPoint.js";

export const DEFAULT_MAX_INSERTED_IMAGE_WIDTH = 624;

export function getElementContentWidth(element: HTMLElement | null | undefined): number {
  if (!element) {
    return DEFAULT_MAX_INSERTED_IMAGE_WIDTH;
  }

  const rect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);
  const paddingLeft = Number.parseFloat(computed.paddingLeft || "0") || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight || "0") || 0;
  const contentWidth = rect.width - paddingLeft - paddingRight;

  if (!Number.isFinite(contentWidth) || contentWidth <= 0) {
    return DEFAULT_MAX_INSERTED_IMAGE_WIDTH;
  }

  return Math.max(24, Math.floor(contentWidth));
}

export function getMaxInlineImageWidth(
  surface: HTMLDivElement | undefined,
  document: EditorDocument,
  _paragraphId?: string,
): number {
  if (!surface) {
    return getPageContentWidth(getDocumentPageSettings(document));
  }

  const contentSurface =
    surface.querySelector<HTMLDivElement>('[data-testid="editor-surface"]') ?? surface;

  // We no longer restrict the image width to the table cell's current width.
  // MS Word allows images to grow and push the table cell/column width up to the page margins.
  // By returning the content surface width, we allow the image to be resized up to the page boundaries,
  // and the table (with table-layout: auto) will naturally expand to fit.
  return getElementContentWidth(contentSurface);
}

export function getEmptyBlockRect(blockElement: HTMLElement): DOMRect | null {
  return (
    blockElement
      .querySelector<HTMLElement>('[data-testid="editor-empty-char"]')
      ?.getBoundingClientRect() ?? null
  );
}

export function getParagraphBoundaryElement(
  surface: HTMLElement,
  paragraphId: string,
  boundary: "start" | "end",
): HTMLElement | null {
  const elements = getParagraphElements(surface, paragraphId);
  if (elements.length === 0) {
    return null;
  }
  return boundary === "start" ? elements[0]! : elements[elements.length - 1]!;
}

export function hasUsableCharGeometry(
  charRects: Array<{
    left: number;
    right: number;
    top: number;
    bottom: number;
    height: number;
  }>,
): boolean {
  return charRects.some((rect) => rect.right > rect.left || rect.height > 0 || rect.bottom > rect.top);
}
