import type {
  EditorParagraphNode,
  EditorPosition,
  EditorState,
  EditorImageRunData,
  EditorImageBorder,
  EditorImageCrop,
  EditorImageFloatingLayout,
  EditorLineDash,
  EditorTextRun,
} from "@/core/model.js";
import { PX_PER_CM } from "@/core/units.js";
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
  return getSelectedObjectRun(state, (run): boolean => run.kind === "image");
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
  const nextParagraphs = paragraphs.map(
    (candidate, candidateIndex): EditorParagraphNode =>
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

/** Minimum on-screen image dimension in CSS px (mirrors resizeSelectedImage). */
const MIN_IMAGE_PX = 24;

/** Displayed size of the selected image, in centimetres, or `null`. */
export function getSelectedImageSizeCm(
  state: EditorState,
): { width: number; height: number } | null {
  const selectedImage = getSelectedImageRun(state);
  const image = selectedImage && getRunImage(selectedImage.run);
  if (!image) {
    return null;
  }
  return {
    width: image.width / PX_PER_CM,
    height: image.height / PX_PER_CM,
  };
}

/**
 * Sets the displayed width from a centimetre value, scaling the height by the
 * current aspect ratio (Word locks aspect for pictures).
 */
export function setSelectedImageWidthCm(
  state: EditorState,
  cm: number,
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  const image = selectedImage && getRunImage(selectedImage.run);
  if (!image || !Number.isFinite(cm) || cm <= 0) {
    return state;
  }
  const nextWidth = Math.max(MIN_IMAGE_PX, Math.round(cm * PX_PER_CM));
  const ratio = image.height / image.width;
  return resizeSelectedImage(state, nextWidth, nextWidth * ratio);
}

/** Sets the displayed height from a centimetre value, scaling width to match. */
export function setSelectedImageHeightCm(
  state: EditorState,
  cm: number,
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  const image = selectedImage && getRunImage(selectedImage.run);
  if (!image || !Number.isFinite(cm) || cm <= 0) {
    return state;
  }
  const nextHeight = Math.max(MIN_IMAGE_PX, Math.round(cm * PX_PER_CM));
  const ratio = image.width / image.height;
  return resizeSelectedImage(state, nextHeight * ratio, nextHeight);
}

/** Crop fractions of the selected image (`a:srcRect`), or `null`. */
export function getSelectedImageCrop(
  state: EditorState,
): EditorImageCrop | null {
  const selectedImage = getSelectedImageRun(state);
  const image = selectedImage && getRunImage(selectedImage.run);
  return image?.crop ?? null;
}

/** Clamp a single crop side to `[0, 0.99)`; treat non-finite as 0. */
function clampCropSide(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(value, 0.99);
}

/** Normalize crop fractions; returns `undefined` when nothing is trimmed. */
function normalizeCrop(
  crop: EditorImageCrop | null | undefined,
): EditorImageCrop | undefined {
  if (!crop) {
    return undefined;
  }
  const left = clampCropSide(crop.left);
  const top = clampCropSide(crop.top);
  const right = clampCropSide(crop.right);
  const bottom = clampCropSide(crop.bottom);
  // Keep opposite sides from crossing (leave at least 1% visible each axis).
  const safeRight = Math.min(right, Math.max(0, 0.99 - left));
  const safeBottom = Math.min(bottom, Math.max(0, 0.99 - top));
  if (left === 0 && top === 0 && safeRight === 0 && safeBottom === 0) {
    return undefined;
  }
  return { left, top, right: safeRight, bottom: safeBottom };
}

export interface ImageCropUpdate {
  crop: EditorImageCrop | null;
  /** Optional new displayed width (px) — used when cropping shrinks the box. */
  width?: number;
  /** Optional new displayed height (px). */
  height?: number;
}

/**
 * Applies a crop (and optionally a new displayed size) to the selected image.
 * Passing `crop: null` clears the crop. Round-trips to DOCX `a:srcRect`.
 */
export function setSelectedImageCrop(
  state: EditorState,
  update: ImageCropUpdate,
): EditorState {
  return patchSelectedImage(state, (image) => {
    const next: EditorImageRunData = { ...image };
    const crop = normalizeCrop(update.crop);
    if (crop) {
      next.crop = crop;
    } else {
      delete next.crop;
    }
    if (update.width !== undefined) {
      next.width = Math.max(MIN_IMAGE_PX, Math.round(update.width));
    }
    if (update.height !== undefined) {
      next.height = Math.max(MIN_IMAGE_PX, Math.round(update.height));
    }
    return next;
  });
}

/** Aspect-ratio crop preset: a numeric `width/height` ratio, or `"reset"`. */
export type ImageCropAspectMode = number | "reset";

/**
 * Computes a centred crop that makes the displayed box match `mode` (a
 * `width/height` ratio), trimming the longer axis and shrinking that box
 * dimension so the image is not distorted. `"reset"` clears the crop.
 */
export function computeImageAspectCrop(
  image: EditorImageRunData,
  mode: ImageCropAspectMode,
): ImageCropUpdate {
  if (mode === "reset") {
    return { crop: null };
  }
  const target = mode;
  const { width: W, height: H } = image;
  if (!Number.isFinite(target) || target <= 0 || W <= 0 || H <= 0) {
    return { crop: image.crop ?? null };
  }
  const c = image.crop ?? {};
  const l0 = clampCropSide(c.left);
  const t0 = clampCropSide(c.top);
  const r0 = clampCropSide(c.right);
  const b0 = clampCropSide(c.bottom);
  const currentRatio = W / H;
  if (currentRatio > target) {
    // Too wide → trim left/right, shrink the box width.
    const newWidth = H * target;
    const addFrac = ((W - newWidth) / W) * Math.max(0, 1 - l0 - r0);
    return {
      crop: { ...c, left: l0 + addFrac / 2, right: r0 + addFrac / 2 },
      width: newWidth,
    };
  }
  if (currentRatio < target) {
    // Too tall → trim top/bottom, shrink the box height.
    const newHeight = W / target;
    const addFrac = ((H - newHeight) / H) * Math.max(0, 1 - t0 - b0);
    return {
      crop: { ...c, top: t0 + addFrac / 2, bottom: b0 + addFrac / 2 },
      height: newHeight,
    };
  }
  return { crop: image.crop ?? null };
}

/** Applies an aspect-ratio crop preset to the selected image. */
export function applySelectedImageCropAspect(
  state: EditorState,
  mode: ImageCropAspectMode,
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  const image = selectedImage && getRunImage(selectedImage.run);
  if (!image) {
    return state;
  }
  return setSelectedImageCrop(state, computeImageAspectCrop(image, mode));
}

/** Outline of the selected image (`pic:spPr/a:ln`), or `null`. */
export function getSelectedImageBorder(
  state: EditorState,
): EditorImageBorder | null {
  const selectedImage = getSelectedImageRun(state);
  const image = selectedImage && getRunImage(selectedImage.run);
  return image?.border ?? null;
}

/**
 * A partial edit of the image outline, as dispatched by the picture-border
 * toolbar popup. Each popup action touches one facet, so the patch merges onto
 * whatever border the image already has. `color: null` removes the outline.
 */
export interface ImageBorderPatch {
  color?: string | null;
  widthPt?: number;
  dash?: EditorLineDash;
}

/** Colour Word applies when a weight/dash is chosen before any colour. */
const DEFAULT_IMAGE_BORDER_COLOR = "#000000";

/** Merges `patch` onto the selected image's outline. `color: null` clears it. */
export function setSelectedImageBorder(
  state: EditorState,
  patch: ImageBorderPatch,
): EditorState {
  return patchSelectedImage(state, (image) => {
    if (patch.color === null) {
      const { border: _removed, ...rest } = image;
      return rest;
    }
    const border: EditorImageBorder = {
      ...(image.border ?? { color: DEFAULT_IMAGE_BORDER_COLOR }),
    };
    if (patch.color !== undefined) {
      border.color = patch.color;
    }
    if (patch.widthPt !== undefined) {
      border.widthPt = patch.widthPt;
    }
    if (patch.dash !== undefined) {
      border.dash = patch.dash;
    }
    return { ...image, border };
  });
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

  const nextParagraphs = paragraphs.map(
    (candidate, candidateIndex): EditorParagraphNode => {
      if (candidateIndex !== paragraphIndex) {
        return cloneParagraph(candidate);
      }
      return {
        ...cloneParagraph(candidate),
        runs: candidate.runs.map(
          (run): EditorTextRun =>
            run.id === targetRun.id && run.kind === "image"
              ? { ...run, image: updater(run.image) }
              : cloneRun(run),
        ),
      };
    },
  );

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
  return patchSelectedImageFloating(
    state,
    (floating): EditorImageFloatingLayout | undefined =>
      wrapPresetToFloating(floating, preset),
  );
}

export function setSelectedImageFixedPosition(
  state: EditorState,
  fixed: boolean,
): EditorState {
  return patchSelectedImageFloating(
    state,
    (floating): EditorImageFloatingLayout | undefined =>
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

  const nextParagraphs = paragraphs.map((candidate): EditorParagraphNode => {
    if (
      !candidate.runs.some(
        (run): boolean => run.id === runId && run.kind === "image",
      )
    ) {
      return cloneParagraph(candidate);
    }

    return {
      ...cloneParagraph(candidate),
      runs: candidate.runs.map((run): EditorTextRun => {
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

  const nextParagraphs = paragraphs.map(
    (paragraph, index): EditorParagraphNode => {
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
    },
  );

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
