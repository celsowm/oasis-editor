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

function escapeAttrValue(value: string): string {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(value)
    : value.replace(/"/g, '\\"');
}

/**
 * Find a segment span (text/tab/image) that covers a given paragraph offset.
 * Returns null if no segment is mounted (e.g. paragraph is virtualized).
 *
 * Looks for atom segments by `data-char-index` first (tab/image), falling back
 * to text segments by `data-segment-start <= offset < data-segment-end`.
 */
export function findSegmentAtOffset(
  surface: HTMLElement,
  paragraphId: string,
  offset: number,
): {
  element: HTMLElement;
  kind: "text" | "tab" | "image" | "phantom" | "empty";
  segmentStart: number;
  segmentEnd: number;
} | null {
  const escapedPid = escapeAttrValue(paragraphId);

  // 1. Try atom segments (tab/image/phantom) by exact data-char-index.
  const atom = surface.querySelector<HTMLElement>(
    `[data-source-paragraph-id="${escapedPid}"] [data-char-index="${offset}"], [data-paragraph-id="${escapedPid}"] [data-char-index="${offset}"]`,
  );
  if (atom) {
    const seg = atom.dataset.segment as "text" | "tab" | "image" | undefined;
    return {
      element: atom,
      kind: seg ?? (atom.classList.contains("oasis-editor-char-phantom") ? "phantom" : "tab"),
      segmentStart: offset,
      segmentEnd: offset + 1,
    };
  }

  // 2. Try text segments — pick the one whose [start,end) contains offset.
  const candidates = surface.querySelectorAll<HTMLElement>(
    `[data-source-paragraph-id="${escapedPid}"] [data-segment="text"], [data-paragraph-id="${escapedPid}"] [data-segment="text"]`,
  );
  for (const el of candidates) {
    const start = Number(el.dataset.segmentStart);
    const end = Number(el.dataset.segmentEnd);
    if (Number.isFinite(start) && Number.isFinite(end) && offset >= start && offset < end) {
      return { element: el, kind: "text", segmentStart: start, segmentEnd: end };
    }
  }

  // 3. Empty paragraph → empty-char span (no offset metadata, but offset must be 0).
  if (offset === 0) {
    const empty = surface.querySelector<HTMLElement>(
      `[data-source-paragraph-id="${escapedPid}"] [data-empty-block="true"], [data-paragraph-id="${escapedPid}"] [data-empty-block="true"]`,
    );
    if (empty) {
      return { element: empty, kind: "empty", segmentStart: 0, segmentEnd: 0 };
    }
  }

  return null;
}

/**
 * Compute the caret rect at a given paragraph offset using the DOM Range API.
 * O(1) in document size; O(segments) within the paragraph.
 *
 * Returns null when the paragraph is not mounted or geometry is unavailable.
 */
export function getCaretRectAtOffset(
  surface: HTMLElement,
  paragraphId: string,
  offset: number,
): { left: number; top: number; height: number } | null {
  const segment = findSegmentAtOffset(surface, paragraphId, offset);
  if (!segment) {
    // Try the slot just before — caret sits on the right edge of the previous atom.
    if (offset > 0) {
      const before = findSegmentAtOffset(surface, paragraphId, offset - 1);
      if (before) {
        return rectFromSegmentEdge(before.element, before.kind, "right", offset - before.segmentStart - 1);
      }
    }
    return null;
  }

  if (segment.kind === "text") {
    const textNode = segment.element.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      const rect = segment.element.getBoundingClientRect();
      return rect.height > 0 ? { left: rect.left, top: rect.top, height: rect.height } : null;
    }
    const offsetWithinSegment = Math.max(0, offset - segment.segmentStart);
    const range = document.createRange();
    try {
      range.setStart(textNode, offsetWithinSegment);
      range.setEnd(textNode, offsetWithinSegment);
      let rect = range.getBoundingClientRect();
      // Collapsed Range at the very edge of a text node sometimes returns a
      // zero-height rect. Fall back to selecting one char and using its
      // left edge in that case.
      if (rect.height <= 0 && (textNode.nodeValue?.length ?? 0) > offsetWithinSegment) {
        range.setEnd(textNode, offsetWithinSegment + 1);
        rect = range.getBoundingClientRect();
        if (rect.height > 0) {
          return { left: rect.left, top: rect.top, height: rect.height };
        }
      }
      if (rect.height <= 0 && offsetWithinSegment > 0) {
        range.setStart(textNode, offsetWithinSegment - 1);
        range.setEnd(textNode, offsetWithinSegment);
        rect = range.getBoundingClientRect();
        if (rect.height > 0) {
          return { left: rect.right, top: rect.top, height: rect.height };
        }
      }
      if (rect.height > 0) {
        return { left: rect.left, top: rect.top, height: rect.height };
      }
    } finally {
      range.detach?.();
    }
    return null;
  }

  // Atom segments (tab/image/phantom/empty) → caret on the left edge.
  return rectFromSegmentEdge(segment.element, segment.kind, "left", 0);
}

function rectFromSegmentEdge(
  element: HTMLElement,
  _kind: string,
  edge: "left" | "right",
  _innerOffset: number,
): { left: number; top: number; height: number } | null {
  const rect = element.getBoundingClientRect();
  if (rect.height <= 0) {
    return null;
  }
  return {
    left: edge === "left" ? rect.left : rect.right,
    top: rect.top,
    height: rect.height,
  };
}

/**
 * Resolve a click target → (paragraphId, offset). Used when the click landed
 * directly on a text segment / atom span; returns null otherwise.
 */
export function resolveClickOffsetFromTarget(
  target: EventTarget | null,
  clientX: number,
): { paragraphId: string; offset: number } | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }
  const segmentEl = target.closest<HTMLElement>("[data-segment]");
  if (segmentEl) {
    const start = Number(segmentEl.dataset.segmentStart);
    const end = Number(segmentEl.dataset.segmentEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return null;
    }
    const paragraphEl = segmentEl.closest<HTMLElement>("[data-paragraph-id]");
    const paragraphId = paragraphEl?.dataset.paragraphId
      ?? paragraphEl?.dataset.sourceParagraphId
      ?? null;
    if (!paragraphId) {
      return null;
    }
    const segKind = segmentEl.dataset.segment;

    if (segKind === "text") {
      // Use Range API to map clientX to character offset within text node.
      const textNode = segmentEl.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const length = textNode.nodeValue?.length ?? 0;
        if (length === 0) {
          return { paragraphId, offset: start };
        }
        // Binary search for the offset whose caret rect is closest to clientX.
        // Linear scan is fine for typical segment sizes (< 200 chars per line).
        const range = document.createRange();
        try {
          let bestOffset = 0;
          let bestDx = Infinity;
          for (let i = 0; i <= length; i += 1) {
            range.setStart(textNode, i);
            range.setEnd(textNode, i);
            const r = range.getBoundingClientRect();
            const dx = Math.abs(r.left - clientX);
            if (dx < bestDx) {
              bestDx = dx;
              bestOffset = i;
            }
          }
          return { paragraphId, offset: start + bestOffset };
        } finally {
          range.detach?.();
        }
      }
      // Fallback: midpoint of the whole segment.
      const rect = segmentEl.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      return { paragraphId, offset: clientX <= midX ? start : end };
    }

    // Atom (tab/image): split on midpoint.
    const rect = segmentEl.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    return { paragraphId, offset: clientX <= midX ? start : end };
  }

  return null;
}
