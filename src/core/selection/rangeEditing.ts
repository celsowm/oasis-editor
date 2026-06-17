import type {
  EditorParagraphNode,
  EditorPosition,
  EditorSelection,
  EditorState,
  EditorTextRun,
} from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
} from "@/core/model.js";
import {
  clampPosition,
  createCollapsedSelection,
  findParagraphIndex,
  normalizeSelection,
} from "@/core/selection.js";
import { cloneParagraph, cloneParagraphs } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  buildParagraphFromRuns,
  sliceRuns,
} from "@/core/document/paragraphRuns.js";

export function withSelection(position: EditorPosition): EditorSelection {
  return createCollapsedSelection(position);
}

export function getFocusParagraph(state: EditorState): {
  paragraph: EditorParagraphNode;
  index: number;
  offset: number;
} {
  const paragraphs = getParagraphs(state);
  const focus = clampPosition(state, state.selection.focus);
  const index = findParagraphIndex(paragraphs, focus.paragraphId);
  const paragraph = paragraphs[index];
  return {
    paragraph,
    index,
    offset: positionToParagraphOffset(paragraph, focus),
  };
}

export function deleteSelectionRange(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);

  if (state.trackChangesEnabled) {
    const revisionId = `rev:${Math.random().toString(36).slice(2, 9)}`;
    const author = "User";
    const date = Date.now();

    const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
      if (
        paragraphIndex < normalized.startIndex ||
        paragraphIndex > normalized.endIndex
      ) {
        return cloneParagraph(paragraph);
      }

      const startOffset =
        paragraphIndex === normalized.startIndex
          ? normalized.startParagraphOffset
          : 0;
      const endOffset =
        paragraphIndex === normalized.endIndex
          ? normalized.endParagraphOffset
          : getParagraphLength(paragraph);

      return mapRunsInRange(paragraph, startOffset, endOffset, (run) => {
        if (run.revision?.type === "insert") {
          return { ...run, text: "" };
        }
        return {
          ...run,
          revision: { id: revisionId, type: "delete", author, date },
        };
      });
    });

    return cloneStateWithParagraphs(
      state,
      nextParagraphs,
      withSelection(normalized.start),
    );
  }

  const startParagraph = paragraphs[normalized.startIndex];
  const endParagraph = paragraphs[normalized.endIndex];
  const startOffset = positionToParagraphOffset(
    startParagraph,
    normalized.start,
  );
  const endOffset = positionToParagraphOffset(endParagraph, normalized.end);
  const mergedParagraph = buildParagraphFromRuns(startParagraph, [
    ...sliceRuns(startParagraph, 0, startOffset),
    ...sliceRuns(endParagraph, endOffset, getParagraphLength(endParagraph)),
  ]);

  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, normalized.startIndex)),
    mergedParagraph,
    ...cloneParagraphs(paragraphs.slice(normalized.endIndex + 1)),
  ];

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(mergedParagraph, startOffset)),
  );
}

export function mapRunsInRange(
  paragraph: EditorParagraphNode,
  startOffset: number,
  endOffset: number,
  mapper: (run: EditorTextRun) => EditorTextRun,
): EditorParagraphNode {
  return buildParagraphFromRuns(paragraph, [
    ...sliceRuns(paragraph, 0, startOffset),
    ...sliceRuns(paragraph, startOffset, endOffset).map(mapper),
    ...sliceRuns(paragraph, endOffset, getParagraphLength(paragraph)),
  ]);
}

export function preserveSelectionByParagraphOffsets(
  paragraphs: EditorParagraphNode[],
  normalized: ReturnType<typeof normalizeSelection>,
): EditorSelection {
  const startParagraph = paragraphs[normalized.startIndex]!;
  const endParagraph = paragraphs[normalized.endIndex]!;

  return {
    anchor: paragraphOffsetToPosition(
      startParagraph,
      normalized.startParagraphOffset,
    ),
    focus: paragraphOffsetToPosition(
      endParagraph,
      normalized.endParagraphOffset,
    ),
  };
}

export function collapseToBoundary(
  state: EditorState,
  direction: "start" | "end",
): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  return {
    document: state.document,
    selection: withSelection(
      direction === "start" ? normalized.start : normalized.end,
    ),
  };
}
