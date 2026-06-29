import type {
  EditorParagraphNode,
  EditorPosition,
  EditorSelection,
  EditorState,
} from "./model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
} from "./model.js";

export interface NormalizedEditorSelection {
  start: EditorPosition;
  end: EditorPosition;
  startIndex: number;
  endIndex: number;
  startParagraphOffset: number;
  endParagraphOffset: number;
  isCollapsed: boolean;
}

export function findParagraphIndex(
  paragraphs: EditorParagraphNode[],
  paragraphId: string,
): number {
  const index = paragraphs.findIndex(
    (paragraph): boolean => paragraph.id === paragraphId,
  );
  return index === -1 ? 0 : index;
}

export function findParagraphById(
  paragraphs: EditorParagraphNode[],
  paragraphId: string,
): EditorParagraphNode {
  return paragraphs[findParagraphIndex(paragraphs, paragraphId)];
}

export function clampOffset(
  offset: number,
  paragraph: EditorParagraphNode,
): number {
  return Math.max(0, Math.min(offset, getParagraphLength(paragraph)));
}

export function clampPosition(
  state: EditorState,
  position: EditorPosition,
): EditorPosition {
  const paragraphs = getParagraphs(state);
  const paragraph = findParagraphById(paragraphs, position.paragraphId);
  return clampPositionInParagraph(position, paragraph);
}

function clampPositionInParagraph(
  position: EditorPosition,
  paragraph: EditorParagraphNode,
): EditorPosition {
  const paragraphOffset = positionToParagraphOffset(paragraph, position);
  return paragraphOffsetToPosition(
    paragraph,
    clampOffset(paragraphOffset, paragraph),
  );
}

export function comparePositions(
  paragraphs: EditorParagraphNode[],
  left: EditorPosition,
  right: EditorPosition,
): number {
  const leftIndex = findParagraphIndex(paragraphs, left.paragraphId);
  const rightIndex = findParagraphIndex(paragraphs, right.paragraphId);

  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  const paragraph = paragraphs[leftIndex];
  return (
    positionToParagraphOffset(paragraph, left) -
    positionToParagraphOffset(paragraph, right)
  );
}

export function createCollapsedSelection(
  position: EditorPosition,
): EditorSelection {
  return {
    anchor: position,
    focus: position,
  };
}

export function isSelectionCollapsed(selection: EditorSelection): boolean {
  return (
    selection.anchor.paragraphId === selection.focus.paragraphId &&
    selection.anchor.runId === selection.focus.runId &&
    selection.anchor.offset === selection.focus.offset
  );
}

export function normalizeSelection(
  state: EditorState,
  providedParagraphs?: EditorParagraphNode[],
): NormalizedEditorSelection {
  const paragraphs = providedParagraphs ?? getParagraphs(state);
  const indexById = new Map(
    paragraphs.map((paragraph, index): readonly [string, number] => [paragraph.id, index] as const),
  );
  const rawAnchorIndex = indexById.get(state.selection.anchor.paragraphId) ?? 0;
  const rawFocusIndex = indexById.get(state.selection.focus.paragraphId) ?? 0;
  const anchorParagraph = paragraphs[rawAnchorIndex] ?? paragraphs[0];
  const focusParagraph = paragraphs[rawFocusIndex] ?? paragraphs[0];
  const anchor = clampPositionInParagraph(
    state.selection.anchor,
    anchorParagraph,
  );
  const focus = clampPositionInParagraph(state.selection.focus, focusParagraph);
  const anchorIndex = indexById.get(anchor.paragraphId) ?? rawAnchorIndex;
  const focusIndex = indexById.get(focus.paragraphId) ?? rawFocusIndex;
  const comparison =
    anchorIndex !== focusIndex
      ? anchorIndex - focusIndex
      : positionToParagraphOffset(paragraphs[anchorIndex], anchor) -
        positionToParagraphOffset(paragraphs[focusIndex], focus);
  const start = comparison <= 0 ? anchor : focus;
  const end = comparison <= 0 ? focus : anchor;
  const startParagraph = paragraphs[comparison <= 0 ? anchorIndex : focusIndex];
  const endParagraph = paragraphs[comparison <= 0 ? focusIndex : anchorIndex];

  return {
    start,
    end,
    startIndex: comparison <= 0 ? anchorIndex : focusIndex,
    endIndex: comparison <= 0 ? focusIndex : anchorIndex,
    startParagraphOffset: positionToParagraphOffset(startParagraph, start),
    endParagraphOffset: positionToParagraphOffset(endParagraph, end),
    isCollapsed: comparison === 0,
  };
}
