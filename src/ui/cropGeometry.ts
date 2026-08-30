/**
 * Pure geometry for interactive image cropping (Word-style crop handles).
 *
 * Dragging a crop handle changes the visible frame and the source crop by the
 * same amount, preserving the original image scale instead of stretching the
 * remaining source into a fixed frame.
 */

import {
  axisSignForDirection,
  clamp,
  MIN_RESIZE_SIZE_PX,
  type ResizeHandleDirection,
} from "./resizeGeometry.js";
import type { EditorImageCrop } from "@/core/model.js";

export interface CropSessionGeometry {
  handleDirection: ResizeHandleDirection;
  /** Displayed box size (px) captured when the handle was grabbed. */
  startWidth: number;
  startHeight: number;
  /** Crop fractions captured when the handle was grabbed. */
  startCrop: EditorImageCrop;
}

export interface CropResult {
  crop: EditorImageCrop;
  width: number;
  height: number;
}

/** Source fraction shown along an axis, guarded against degenerate values. */
function visibleFraction(near: number, far: number): number {
  return Math.max(1e-4, 1 - near - far);
}

function clampCropPair(
  near: number,
  far: number,
  nextNear: number,
  nextFar: number,
): { near: number; far: number } {
  const visible = Math.max(0.01, 1 - near - far);
  const clampedNear = Math.max(0, Math.min(nextNear, 0.99 - far));
  const clampedFar = Math.max(0, Math.min(nextFar, 0.99 - clampedNear));
  if (clampedNear + clampedFar >= 0.99) {
    return { near: Math.max(0, 0.99 - visible - far), far };
  }
  return { near: clampedNear, far: clampedFar };
}

/**
 * Resolves the next crop + displayed size for a crop-handle drag. `deltaX`/
 * `deltaY` are pointer deltas in document px (already divided by zoom). The
 * display dimensions follow the handle so the source image keeps its scale.
 */
export function resolveCroppedImage(
  geometry: CropSessionGeometry,
  deltaX: number,
  deltaY: number,
): CropResult {
  const { startWidth: W, startHeight: H } = geometry;
  const l0 = geometry.startCrop.left ?? 0;
  const t0 = geometry.startCrop.top ?? 0;
  const r0 = geometry.startCrop.right ?? 0;
  const b0 = geometry.startCrop.bottom ?? 0;

  const kx = visibleFraction(l0, r0) / W; // source fraction per box px
  const ky = visibleFraction(t0, b0) / H;
  const xs = axisSignForDirection(geometry.handleDirection, "x");
  const ys = axisSignForDirection(geometry.handleDirection, "y");

  let left = l0;
  let right = r0;
  let width = W;
  if (xs !== 0) {
    if (xs < 0) {
      const maxWidth = W + l0 / kx;
      width = clamp(W - deltaX, MIN_RESIZE_SIZE_PX, maxWidth);
      const pair = clampCropPair(l0, r0, l0 - (width - W) * kx, r0);
      left = pair.near;
      right = pair.far;
    } else {
      const maxWidth = W + r0 / kx;
      width = clamp(W + deltaX, MIN_RESIZE_SIZE_PX, maxWidth);
      const pair = clampCropPair(l0, r0, l0, r0 - (width - W) * kx);
      left = pair.near;
      right = pair.far;
    }
  }

  let top = t0;
  let bottom = b0;
  let height = H;
  if (ys !== 0) {
    if (ys < 0) {
      const maxHeight = H + t0 / ky;
      height = clamp(H - deltaY, MIN_RESIZE_SIZE_PX, maxHeight);
      const pair = clampCropPair(t0, b0, t0 - (height - H) * ky, b0);
      top = pair.near;
      bottom = pair.far;
    } else {
      const maxHeight = H + b0 / ky;
      height = clamp(H + deltaY, MIN_RESIZE_SIZE_PX, maxHeight);
      const pair = clampCropPair(t0, b0, t0, b0 - (height - H) * ky);
      top = pair.near;
      bottom = pair.far;
    }
  }

  return {
    crop: { left, top, right, bottom },
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** Moves the source image inside the fixed crop frame. */
export function resolveMovedImageCrop(
  geometry: CropSessionGeometry,
  deltaX: number,
  deltaY: number,
): CropResult {
  const { startWidth: W, startHeight: H } = geometry;
  const l0 = geometry.startCrop.left ?? 0;
  const t0 = geometry.startCrop.top ?? 0;
  const r0 = geometry.startCrop.right ?? 0;
  const b0 = geometry.startCrop.bottom ?? 0;
  const kx = visibleFraction(l0, r0) / W;
  const ky = visibleFraction(t0, b0) / H;
  const visibleW = 1 - l0 - r0;
  const visibleH = 1 - t0 - b0;
  const nextLeft = Math.max(0, Math.min(1 - visibleW, l0 - deltaX * kx));
  const nextTop = Math.max(0, Math.min(1 - visibleH, t0 - deltaY * ky));
  return {
    crop: {
      left: nextLeft,
      right: Math.max(0, 1 - visibleW - nextLeft),
      top: nextTop,
      bottom: Math.max(0, 1 - visibleH - nextTop),
    },
    width: Math.round(W),
    height: Math.round(H),
  };
}
