import type { Editor2Document, Editor2ParagraphNode, Editor2Position, Editor2State } from "../core/model.js";
import { getParagraphs, getParagraphText, paragraphOffsetToPosition } from "../core/model.js";
import {
  measureParagraphLayoutFromRects,
  resolveClosestOffsetInMeasuredLayout,
} from "./layoutProjection.js";

function scoreElementDistance(element: HTMLElement, clientX: number, clientY: number): number {
  const rect = element.getBoundingClientRect();
  const verticalDelta =
    clientY < rect.top
      ? rect.top - clientY
      : clientY > rect.bottom
        ? clientY - rect.bottom
        : 0;
  const horizontalDelta =
    clientX < rect.left
      ? rect.left - clientX
      : clientX > rect.right
        ? clientX - rect.right
        : 0;
  return verticalDelta * 1000 + horizontalDelta;
}

function findNearestElement(
  surface: HTMLElement,
  selector: string,
  clientX: number,
  clientY: number,
): HTMLElement | null {
  const candidates = Array.from(surface.querySelectorAll<HTMLElement>(selector));
  if (candidates.length === 0) {
    return null;
  }

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const score = scoreElementDistance(candidate, clientX, clientY);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

export function findNearestParagraphElement(
  surface: HTMLElement,
  clientX: number,
  clientY: number,
): HTMLElement | null {
  return findNearestElement(surface, "[data-paragraph-id]", clientX, clientY);
}

export function collectCharRects(blockElement: HTMLElement): Array<{
  left: number;
  right: number;
  top: number;
  bottom: number;
  height: number;
}> {
  return Array.from(blockElement.querySelectorAll<HTMLElement>("[data-char-index]")).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    };
  });
}

export function getParagraphElements(surface: HTMLElement, paragraphId: string): HTMLElement[] {
  return Array.from(
    surface.querySelectorAll<HTMLElement>(`[data-paragraph-id="${paragraphId}"]`),
  ).sort((left, right) => {
    const leftOffset = Number(left.dataset.startOffset ?? "0");
    const rightOffset = Number(right.dataset.startOffset ?? "0");
    return leftOffset - rightOffset;
  });
}

export function collectParagraphCharRects(
  surface: HTMLElement,
  paragraphId: string,
): Array<{
  left: number;
  right: number;
  top: number;
  bottom: number;
  height: number;
}> {
  return getParagraphElements(surface, paragraphId).flatMap((element) => collectCharRects(element));
}

function resolveTableCellStartPosition(
  document: Editor2Document,
  cellElement: HTMLElement,
): Editor2Position | null {
  const rowIndex = Number(cellElement.dataset.rowIndex ?? -1);
  const cellIndex = Number(cellElement.dataset.cellIndex ?? -1);
  if (rowIndex < 0 || cellIndex < 0) {
    return null;
  }

  const tableContainer = cellElement.closest<HTMLElement>('[data-testid="editor-2-table"]');
  const tableId =
    tableContainer?.getAttribute("data-source-block-id") ?? tableContainer?.getAttribute("data-block-id");
  const tableBlock = document.blocks.find(
    (block) => block.type === "table" && (tableId ? block.id === tableId : true),
  );
  if (!tableBlock || tableBlock.type !== "table") {
    return null;
  }

  const paragraph = tableBlock.rows[rowIndex]?.cells[cellIndex]?.blocks[0];
  return paragraph ? paragraphOffsetToPosition(paragraph, 0) : null;
}

function resolveParagraphFromElement(
  state: Editor2State,
  paragraphElement: HTMLElement,
): Editor2ParagraphNode | null {
  const paragraphId = paragraphElement.dataset.paragraphId;
  if (!paragraphId) {
    return null;
  }

  return getParagraphs(state).find((candidate) => candidate.id === paragraphId) ?? null;
}

export function resolvePositionAtPoint(options: {
  clientX: number;
  clientY: number;
  surface: HTMLElement;
  state: Editor2State;
  documentLike?: Pick<Document, "elementFromPoint"> | { elementFromPoint?: ((x: number, y: number) => Element | null) | undefined };
}): Editor2Position | null {
  const { clientX, clientY, surface, state, documentLike } = options;
  const target = documentLike?.elementFromPoint?.(clientX, clientY) ?? null;

  const targetElement = target instanceof HTMLElement ? target : null;

  // 1. Direct hit: prefer the deepest match the cursor is actually over.
  const directParagraph = targetElement?.closest<HTMLElement>("[data-paragraph-id]") ?? null;
  const directCell = targetElement?.closest<HTMLElement>("td[data-cell-index]") ?? null;

  // If the cursor is over a paragraph, use it (works for both table-cell
  // paragraphs and outside-the-table paragraphs).
  if (directParagraph) {
    const paragraph = resolveParagraphFromElement(state, directParagraph);
    if (paragraph) {
      const layout = measureParagraphLayoutFromRects(
        paragraph,
        collectParagraphCharRects(surface, paragraph.id),
      );
      const offset =
        layout.text.length === 0
          ? 0
          : resolveClosestOffsetInMeasuredLayout(layout, clientX, clientY);
      return paragraphOffsetToPosition(
        paragraph,
        Math.max(0, Math.min(offset, getParagraphText(paragraph).length)),
      );
    }
  }

  // If the cursor is over a table cell but not over any paragraph (e.g.
  // empty cell padding), drop at the start of that cell.
  if (directCell) {
    const tableCellPosition = resolveTableCellStartPosition(state.document, directCell);
    if (tableCellPosition) {
      return tableCellPosition;
    }
  }

  // 2. Fallback: cursor is over an empty area. Prefer the nearest paragraph
  // (which may be inside or outside a table). Falling back to nearest cell
  // first would force every drop into a table, even when the user is clearly
  // dropping into a paragraph above/below the table.
  const nearestParagraph = findNearestParagraphElement(surface, clientX, clientY);
  if (!nearestParagraph) {
    // Last resort: nearest table cell (used when paragraphs aren't rendered).
    const nearestCell = findNearestElement(surface, "td[data-cell-index]", clientX, clientY);
    if (nearestCell) {
      const tableCellPosition = resolveTableCellStartPosition(state.document, nearestCell);
      if (tableCellPosition) {
        return tableCellPosition;
      }
    }
    return null;
  }

  const paragraph = resolveParagraphFromElement(state, nearestParagraph);
  if (!paragraph) {
    return null;
  }

  const layout = measureParagraphLayoutFromRects(
    paragraph,
    collectParagraphCharRects(surface, paragraph.id),
  );
  const offset =
    layout.text.length === 0
      ? 0
      : resolveClosestOffsetInMeasuredLayout(layout, clientX, clientY);

  return paragraphOffsetToPosition(
    paragraph,
    Math.max(0, Math.min(offset, getParagraphText(paragraph).length)),
  );
}
