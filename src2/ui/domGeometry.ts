import {
  getDocumentPageSettings,
  getPageContentWidth,
  type Editor2Document,
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
  document: Editor2Document,
  paragraphId?: string,
): number {
  if (!surface) {
    return getPageContentWidth(getDocumentPageSettings(document));
  }

  const contentSurface =
    surface.querySelector<HTMLDivElement>('[data-testid="editor-2-surface"]') ?? surface;
  if (paragraphId) {
    const paragraphElement = contentSurface.querySelector<HTMLElement>(
      `[data-paragraph-id="${paragraphId}"]`,
    );
    const cellElement = paragraphElement?.closest<HTMLElement>("td.oasis-editor-2-table-cell");
    if (cellElement) {
      return getElementContentWidth(cellElement);
    }
  }

  return getElementContentWidth(contentSurface);
}

export function getEmptyBlockRect(blockElement: HTMLElement): DOMRect | null {
  return (
    blockElement
      .querySelector<HTMLElement>('[data-testid="editor-2-empty-char"]')
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
