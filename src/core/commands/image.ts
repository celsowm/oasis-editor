import type {
  EditorParagraphNode,
  EditorPosition,
  EditorState,
  EditorTextRun,
  EditorImageRunData,
} from "../model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
} from "../model.js";
import { createEditorStyledRun } from "../editorState.js";
import {
  findParagraphIndex,
  isSelectionCollapsed,
  normalizeSelection,
} from "../selection.js";
import {
  getStyleAtOffset,
  insertRunsAtOffset,
  buildParagraphFromRuns,
  sliceRuns,
} from "../document/paragraphRuns.js";
import {
  cloneParagraph,
  cloneRun,
  cloneParagraphs,
} from "../document/clone.js";
import { cloneStateWithParagraphs } from "../document/blockReplacement.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  preserveSelectionByParagraphOffsets,
  withSelection,
} from "../selection/rangeEditing.js";

export interface SelectedImageRun {
  paragraph: EditorParagraphNode;
  paragraphIndex: number;
  run: EditorTextRun;
  runIndex: number;
  offset: number;
}

export function getSelectedImageRun(
  state: EditorState,
): SelectedImageRun | null {
  const normalized = normalizeSelection(state);
  if (
    normalized.isCollapsed ||
    normalized.startIndex !== normalized.endIndex ||
    normalized.endParagraphOffset - normalized.startParagraphOffset !== 1
  ) {
    return null;
  }

  const paragraphs = getParagraphs(state);
  const paragraph = paragraphs[normalized.startIndex];
  if (!paragraph) {
    return null;
  }

  let consumed = 0;
  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index]!;
    const startOffset = consumed;
    consumed += run.text.length;
    if (
      run.image &&
      run.text.length === 1 &&
      startOffset === normalized.startParagraphOffset
    ) {
      return {
        paragraph,
        paragraphIndex: normalized.startIndex,
        run,
        runIndex: index,
        offset: startOffset,
      };
    }
  }

  return null;
}

export function insertImageAtSelection(
  state: EditorState,
  image: EditorImageRunData,
): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);

  const insertedRun = createEditorStyledRun(
    "\uFFFC",
    getStyleAtOffset(paragraph, offset),
    image,
  );
  const nextParagraph = insertRunsAtOffset(paragraph, offset, [insertedRun]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
    candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
  );

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, offset + 1)),
  );
}

export function resizeSelectedImage(
  state: EditorState,
  width: number,
  height: number,
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const { paragraphIndex, run: targetRun } = selectedImage;

  const nextParagraphs = paragraphs.map((candidate, candidateIndex) => {
    if (candidateIndex !== paragraphIndex) {
      return cloneParagraph(candidate);
    }

    return {
      ...cloneParagraph(candidate),
      runs: candidate.runs.map((run) =>
        run.id === targetRun.id && run.image
          ? {
              ...run,
              image: {
                ...run.image,
                width: Math.max(24, Math.round(width)),
                height: Math.max(24, Math.round(height)),
              },
            }
          : cloneRun(run),
      ),
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(
      nextParagraphs,
      normalizeSelection(state),
    ),
  );
}

export function getSelectedImageAlt(state: EditorState): string | null {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage?.run.image) {
    return null;
  }

  return selectedImage.run.image.alt ?? null;
}

export function setSelectedImageAlt(
  state: EditorState,
  alt: string | null,
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage?.run.image) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) => {
    if (candidateIndex !== selectedImage.paragraphIndex) {
      return cloneParagraph(candidate);
    }

    return {
      ...cloneParagraph(candidate),
      runs: candidate.runs.map((run) =>
        run.id === selectedImage.run.id && run.image
          ? {
              ...run,
              image: {
                ...run.image,
                alt: alt ?? undefined,
              },
            }
          : cloneRun(run),
      ),
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(
      nextParagraphs,
      normalizeSelection(state),
    ),
  );
}

export function moveSelectedImageToPosition(
  state: EditorState,
  targetPosition: EditorPosition,
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const {
    paragraphIndex: sourceIndex,
    offset: sourceOffset,
    run: imageRun,
  } = selectedImage;

  const targetIndex = findParagraphIndex(
    paragraphs,
    targetPosition.paragraphId,
  );
  if (targetIndex < 0) {
    return state;
  }

  const targetParagraph = paragraphs[targetIndex];
  const targetOffsetRaw = positionToParagraphOffset(
    targetParagraph,
    targetPosition,
  );
  const adjustedTargetOffset =
    targetIndex === sourceIndex && targetOffsetRaw > sourceOffset
      ? targetOffsetRaw - 1
      : targetOffsetRaw;

  if (targetIndex === sourceIndex && adjustedTargetOffset === sourceOffset) {
    return state;
  }

  const removeImageFromParagraph = (
    paragraph: EditorParagraphNode,
  ): EditorParagraphNode =>
    buildParagraphFromRuns(paragraph, [
      ...sliceRuns(paragraph, 0, sourceOffset),
      ...sliceRuns(paragraph, sourceOffset + 1, getParagraphLength(paragraph)),
    ]);

  const insertImageIntoParagraph = (
    paragraph: EditorParagraphNode,
    offset: number,
  ): EditorParagraphNode =>
    insertRunsAtOffset(
      paragraph,
      Math.max(0, Math.min(offset, getParagraphLength(paragraph))),
      [
        createEditorStyledRun(
          "\uFFFC",
          getStyleAtOffset(paragraph, offset),
          imageRun.image,
        ),
      ],
    );

  const nextParagraphs = paragraphs.map((paragraph, index) => {
    if (index === sourceIndex && index === targetIndex) {
      return insertImageIntoParagraph(
        removeImageFromParagraph(paragraph),
        adjustedTargetOffset,
      );
    }

    if (index === sourceIndex) {
      return removeImageFromParagraph(paragraph);
    }

    if (index === targetIndex) {
      return insertImageIntoParagraph(paragraph, adjustedTargetOffset);
    }

    return cloneParagraphs([paragraph])[0]!;
  });

  const insertedParagraph = nextParagraphs[targetIndex];
  const insertedOffset = Math.max(
    0,
    Math.min(adjustedTargetOffset + 1, getParagraphLength(insertedParagraph)),
  );

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(insertedParagraph, insertedOffset)),
  );
}
