/**
 * Pure geometry for interactive image cropping (Word-style crop handles).
 *
 * Dragging a crop handle keeps the image scale constant: the displayed box
 * shrinks/grows while the crop fractions (`a:srcRect`) absorb the change, so the
 * visible picture is never distorted. The box is anchored at its top-left layout
 * position (inline images cannot float), so every handle trims from the side it
 * represents while the origin stays put.
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

/**
 * Resolves the next crop + displayed size for a crop-handle drag. `deltaX`/
 * `deltaY` are pointer deltas in document px (already divided by zoom). Growing
 * a side is bounded by that side's original crop (you cannot un-crop past the
 * source image).
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
    const maxGrow = (xs > 0 ? r0 : l0) / kx;
    width = clamp(W + deltaX * xs, MIN_RESIZE_SIZE_PX, W + maxGrow);
    const widthDelta = width - W;
    if (xs > 0) {
      right = Math.max(0, r0 - widthDelta * kx);
    } else {
      left = Math.max(0, l0 - widthDelta * kx);
    }
  }

  let top = t0;
  let bottom = b0;
  let height = H;
  if (ys !== 0) {
    const maxGrow = (ys > 0 ? b0 : t0) / ky;
    height = clamp(H + deltaY * ys, MIN_RESIZE_SIZE_PX, H + maxGrow);
    const heightDelta = height - H;
    if (ys > 0) {
      bottom = Math.max(0, b0 - heightDelta * ky);
    } else {
      top = Math.max(0, t0 - heightDelta * ky);
    }
  }

  return {
    crop: { left, top, right, bottom },
    width: Math.round(width),
    height: Math.round(height),
  };
}
