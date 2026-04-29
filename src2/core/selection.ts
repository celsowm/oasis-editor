import type {
  Editor2ParagraphNode,
  Editor2Position,
  Editor2Selection,
  Editor2State,
} from "./model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
} from "./model.js";

export interface NormalizedEditor2Selection {
  start: Editor2Position;
  end: Editor2Position;
  startIndex: number;
  endIndex: number;
  startParagraphOffset: number;
  endParagraphOffset: number;
  isCollapsed: boolean;
}

export function findParagraphIndex(paragraphs: Editor2ParagraphNode[], paragraphId: string): number {
  const index = paragraphs.findIndex((paragraph) => paragraph.id === paragraphId);
  return index === -1 ? 0 : index;
}

export function findParagraphById(
  paragraphs: Editor2ParagraphNode[],
  paragraphId: string,
): Editor2ParagraphNode {
  return paragraphs[findParagraphIndex(paragraphs, paragraphId)];
}

export function clampOffset(offset: number, paragraph: Editor2ParagraphNode): number {
  return Math.max(0, Math.min(offset, getParagraphLength(paragraph)));
}

export function clampPosition(state: Editor2State, position: Editor2Position): Editor2Position {
  const paragraphs = getParagraphs(state);
  const paragraph = findParagraphById(paragraphs, position.paragraphId);
  const paragraphOffset = positionToParagraphOffset(paragraph, position);
  return paragraphOffsetToPosition(paragraph, clampOffset(paragraphOffset, paragraph));
}

export function comparePositions(
  paragraphs: Editor2ParagraphNode[],
  left: Editor2Position,
  right: Editor2Position,
): number {
  const leftIndex = findParagraphIndex(paragraphs, left.paragraphId);
  const rightIndex = findParagraphIndex(paragraphs, right.paragraphId);

  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  const paragraph = paragraphs[leftIndex];
  return positionToParagraphOffset(paragraph, left) - positionToParagraphOffset(paragraph, right);
}

export function createCollapsedSelection(position: Editor2Position): Editor2Selection {
  return {
    anchor: position,
    focus: position,
  };
}

export function isSelectionCollapsed(selection: Editor2Selection): boolean {
  return (
    selection.anchor.paragraphId === selection.focus.paragraphId &&
    selection.anchor.runId === selection.focus.runId &&
    selection.anchor.offset === selection.focus.offset
  );
}

export function normalizeSelection(state: Editor2State): NormalizedEditor2Selection {
  const paragraphs = getParagraphs(state);
  const anchor = clampPosition(state, state.selection.anchor);
  const focus = clampPosition(state, state.selection.focus);
  const anchorIndex = findParagraphIndex(paragraphs, anchor.paragraphId);
  const focusIndex = findParagraphIndex(paragraphs, focus.paragraphId);
  const comparison = comparePositions(paragraphs, anchor, focus);
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
