import type {
  EditorParagraphNode,
  EditorPosition,
  EditorState,
  EditorImageRunData,
} from "@/core/model.js";
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
  getRunImage,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
} from "@/core/model.js";
import { createEditorStyledRun } from "@/core/editorState.js";
import {
  createImageCaptionParagraph,
  getCaptionSelectionOffset,
  getImageCaptionText,
  isImageCaptionParagraph,
  renumberImageCaptionParagraphs,
  updateImageCaptionParagraph,
} from "@/core/document/imageCaptions.js";
import {
  findParagraphIndex,
  isSelectionCollapsed,
  normalizeSelection,
} from "@/core/selection.js";
import {
  getStyleAtOffset,
  insertRunsAtOffset,
  buildParagraphFromRuns,
  sliceRuns,
} from "@/core/document/paragraphRuns.js";
import {
  cloneParagraph,
  cloneRun,
  cloneParagraphs,
} from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  preserveSelectionByParagraphOffsets,
  withSelection,
} from "@/core/selection/rangeEditing.js";

export type SelectedImageRun = SelectedObjectRun;

export function getSelectedImageRun(
  state: EditorState,
): SelectedImageRun | null {
  return getSelectedObjectRun(state, (run) => run.kind === "image");
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
  return patchSelectedImage(state, (image) => ({
    ...image,
    width: Math.max(24, Math.round(width)),
    height: Math.max(24, Math.round(height)),
  }));
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
  const nextRotation = normalizeRotation(rotation);
  return patchSelectedImage(state, (image) => ({
    ...image,
    rotation: nextRotation,
  }));
}

export function getSelectedImageWrapPreset(
  state: EditorState,
): WrapPreset | null {
  const selectedImage = getSelectedImageRun(state);
  const image = selectedImage && getRunImage(selectedImage.run);
  if (!image) {
    return null;
  }
  return floatingToWrapPreset(image.floating);
}

export function isSelectedImageFixedPosition(state: EditorState): boolean {
  const selectedImage = getSelectedImageRun(state);
  const image = selectedImage && getRunImage(selectedImage.run);
  return isFloatingFixedPosition(image?.floating);
}

/**
 * Applies `updater` to the image data of the currently selected image run,
 * cloning all paragraphs and preserving the selection by paragraph offsets.
 */
function patchSelectedImage(
  state: EditorState,
  updater: (image: EditorImageRunData) => EditorImageRunData,
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage || !getRunImage(selectedImage.run)) {
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
        run.id === targetRun.id && run.kind === "image"
          ? { ...run, image: updater(run.image) }
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

/** Patches the selected image's `floating` field (or removes it for inline). */
function patchSelectedImageFloating(
  state: EditorState,
  next: (
    floating: EditorImageRunData["floating"],
  ) => EditorImageRunData["floating"],
): EditorState {
  return patchSelectedImage(state, (image) => {
    const floating = next(image.floating);
    if (floating) return { ...image, floating };
    const { floating: _removed, ...rest } = image;
    return rest;
  });
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
    if (
      !candidate.runs.some((run) => run.id === runId && run.kind === "image")
    ) {
      return cloneParagraph(candidate);
    }

    return {
      ...cloneParagraph(candidate),
      runs: candidate.runs.map((run) => {
        if (run.id !== runId || run.kind !== "image") {
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
  const image = selectedImage && getRunImage(selectedImage.run);
  if (!image) {
    return null;
  }

  return image.alt ?? null;
}

export function setSelectedImageAlt(
  state: EditorState,
  alt: string | null,
): EditorState {
  return patchSelectedImage(state, (image) => ({
    ...image,
    alt: alt ?? undefined,
  }));
}

export function getSelectedImageCaption(state: EditorState): string | null {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage || !getRunImage(selectedImage.run)) {
    return null;
  }

  const paragraphs = getParagraphs(state);
  return getImageCaptionText(paragraphs[selectedImage.paragraphIndex + 1]);
}

export function setSelectedImageCaption(
  state: EditorState,
  captionText: string,
  label: string,
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage || !getRunImage(selectedImage.run)) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const captionIndex = selectedImage.paragraphIndex + 1;
  const nextParagraph =
    captionIndex < paragraphs.length &&
    isImageCaptionParagraph(paragraphs[captionIndex])
      ? updateImageCaptionParagraph(
          paragraphs[captionIndex]!,
          captionText,
          label,
        )
      : createImageCaptionParagraph(captionText, label, 1);

  const nextParagraphs =
    captionIndex < paragraphs.length &&
    isImageCaptionParagraph(paragraphs[captionIndex])
      ? [
          ...cloneParagraphs(paragraphs.slice(0, captionIndex)),
          nextParagraph,
          ...cloneParagraphs(paragraphs.slice(captionIndex + 1)),
        ]
      : [
          ...cloneParagraphs(paragraphs.slice(0, captionIndex)),
          nextParagraph,
          ...cloneParagraphs(paragraphs.slice(captionIndex)),
        ];
  const renumberedParagraphs = renumberImageCaptionParagraphs(nextParagraphs);
  const insertedCaption = renumberedParagraphs[captionIndex] ?? nextParagraph;

  return cloneStateWithParagraphs(
    state,
    renumberedParagraphs,
    withSelection(
      paragraphOffsetToPosition(
        insertedCaption,
        getCaptionSelectionOffset(insertedCaption),
      ),
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
          getRunImage(imageRun),
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
