/**
 * Pure, object-type-agnostic geometry for handle-based resizing.
 *
 * Shared by image and text-box resize: given a resize session (the dimensions
 * captured when a handle was grabbed) and the pointer delta, it resolves the
 * next width/height, applying min/max constraints and optional aspect-ratio
 * preservation. Contains no DOM or editor-state coupling.
 */

export type ResizeHandleDirection =
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

export const RESIZE_HANDLE_DIRECTIONS: ResizeHandleDirection[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

/** Minimum size (px) any resizable object may shrink to. */
export const MIN_RESIZE_SIZE_PX = 24;

/**
 * The geometry captured at the start of a resize session. Both
 * `ActiveImageResize` and the text-box resize session satisfy this shape.
 */
export interface ResizeSessionGeometry {
  handleDirection: ResizeHandleDirection;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
}

export function clamp(value: number, min: number, max?: number): number {
  const lowerBound = Math.max(min, value);
  if (max === undefined) {
    return lowerBound;
  }
  return Math.min(max, lowerBound);
}

export function axisSignForDirection(
  direction: ResizeHandleDirection,
  axis: "x" | "y",
): -1 | 0 | 1 {
  if (axis === "x") {
    if (direction.includes("e")) return 1;
    if (direction.includes("w")) return -1;
    return 0;
  }

  if (direction.includes("s")) return 1;
  if (direction.includes("n")) return -1;
  return 0;
}

export function resolveResizedDimensions(
  geometry: ResizeSessionGeometry,
  deltaX: number,
  deltaY: number,
  preserveAspectRatio: boolean,
  maxWidth: number,
): { width: number; height: number } {
  const widthSign = axisSignForDirection(geometry.handleDirection, "x");
  const heightSign = axisSignForDirection(geometry.handleDirection, "y");
  const rawWidth =
    widthSign === 0
      ? geometry.startWidth
      : geometry.startWidth + deltaX * widthSign;
  const rawHeight =
    heightSign === 0
      ? geometry.startHeight
      : geometry.startHeight + deltaY * heightSign;

  let nextWidth = clamp(rawWidth, MIN_RESIZE_SIZE_PX, maxWidth);
  let nextHeight = clamp(rawHeight, MIN_RESIZE_SIZE_PX);

  if (!preserveAspectRatio) {
    return { width: nextWidth, height: nextHeight };
  }

  const aspectRatio = geometry.aspectRatio || 1;
  const hasHorizontalHandle = widthSign !== 0;
  const hasVerticalHandle = heightSign !== 0;

  if (hasHorizontalHandle && hasVerticalHandle) {
    const widthScale = nextWidth / geometry.startWidth;
    const heightScale = nextHeight / geometry.startHeight;
    const dominantScale =
      Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
        ? widthScale
        : heightScale;
    nextWidth = clamp(
      geometry.startWidth * dominantScale,
      MIN_RESIZE_SIZE_PX,
      maxWidth,
    );
    nextHeight = clamp(nextWidth / aspectRatio, MIN_RESIZE_SIZE_PX);
    return { width: nextWidth, height: nextHeight };
  }

  if (hasHorizontalHandle) {
    nextWidth = clamp(nextWidth, MIN_RESIZE_SIZE_PX, maxWidth);
    nextHeight = clamp(nextWidth / aspectRatio, MIN_RESIZE_SIZE_PX);
    return { width: nextWidth, height: nextHeight };
  }

  nextHeight = clamp(nextHeight, MIN_RESIZE_SIZE_PX);
  nextWidth = clamp(nextHeight * aspectRatio, MIN_RESIZE_SIZE_PX, maxWidth);
  nextHeight = clamp(nextWidth / aspectRatio, MIN_RESIZE_SIZE_PX);
  return { width: nextWidth, height: nextHeight };
}
