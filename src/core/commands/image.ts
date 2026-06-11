import type {
  EditorParagraphNode,
  EditorPosition,
  EditorState,
  EditorImageRunData,
} from "../model.js";
import {
  getSelectedObjectRun,
  type SelectedObjectRun,
} from "./selectedObjectRun.js";
import {
  applyMoveWithText,
  floatingToWrapPreset,
  isFloatingFixedPosition,
  wrapPresetToFloating,
  type WrapPreset,
} from "./floatingLayout.js";
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

export type SelectedImageRun = SelectedObjectRun;

export function getSelectedImageRun(
  state: EditorState,
): SelectedImageRun | null {
  return getSelectedObjectRun(state, (run) => Boolean(run.image));
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

/** Normalize an angle to the [0, 360) range; `0` collapses to `undefined`. */
function normalizeRotation(rotation: number): number | undefined {
  if (!Number.isFinite(rotation)) {
    return undefined;
  }
  const normalized = ((Math.round(rotation) % 360) + 360) % 360;
  return normalized === 0 ? undefined : normalized;
}

export function rotateSelectedImage(
  state: EditorState,
  rotation: number,
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage) {
    return state;
  }

  const nextRotation = normalizeRotation(rotation);
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
                rotation: nextRotation,
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

export function getSelectedImageWrapPreset(
  state: EditorState,
): WrapPreset | null {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage?.run.image) {
    return null;
  }
  return floatingToWrapPreset(selectedImage.run.image.floating);
}

export function isSelectedImageFixedPosition(state: EditorState): boolean {
  const selectedImage = getSelectedImageRun(state);
  return isFloatingFixedPosition(selectedImage?.run.image?.floating);
}

/** Patches the selected image's `floating` field (or removes it for inline). */
function patchSelectedImageFloating(
  state: EditorState,
  next: (
    floating: EditorImageRunData["floating"],
  ) => EditorImageRunData["floating"],
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage?.run.image) {
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
      runs: candidate.runs.map((run) => {
        if (run.id !== targetRun.id || !run.image) {
          return cloneRun(run);
        }
        const floating = next(run.image.floating);
        const image: EditorImageRunData = { ...run.image };
        if (floating) {
          image.floating = floating;
        } else {
          delete image.floating;
        }
        return { ...run, image };
      }),
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

export function setSelectedImageWrapPreset(
  state: EditorState,
  preset: WrapPreset,
): EditorState {
  return patchSelectedImageFloating(state, (floating) =>
    wrapPresetToFloating(floating, preset),
  );
}

export function setSelectedImageFixedPosition(
  state: EditorState,
  fixed: boolean,
): EditorState {
  return patchSelectedImageFloating(state, (floating) =>
    floating ? applyMoveWithText(floating, fixed) : floating,
  );
}

/**
 * Sets the tight/through wrap contour for the image run identified by `runId`.
 * Matches by run id (not the current selection) because the polygon is traced
 * asynchronously and applied after the alpha decode resolves. Passing an empty
 * polygon removes the contour. Selection is preserved.
 */
export function setImageWrapPolygon(
  state: EditorState,
  runId: string,
  polygon: EditorImageRunData["wrapPolygon"],
): EditorState {
  const paragraphs = getParagraphs(state);
  let matched = false;

  const nextParagraphs = paragraphs.map((candidate) => {
    if (!candidate.runs.some((run) => run.id === runId && run.image)) {
      return cloneParagraph(candidate);
    }

    return {
      ...cloneParagraph(candidate),
      runs: candidate.runs.map((run) => {
        if (run.id !== runId || !run.image) {
          return cloneRun(run);
        }
        matched = true;
        const image: EditorImageRunData = { ...run.image };
        if (polygon && polygon.length > 0) {
          image.wrapPolygon = polygon;
        } else {
          delete image.wrapPolygon;
        }
        return { ...run, image };
      }),
    };
  });

  if (!matched) {
    return state;
  }

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
