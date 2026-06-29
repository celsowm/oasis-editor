import type { EditorWrapPolygonPoint } from "@/core/model.js";

/**
 * Auto-traces a tight/through wrap contour from an image's alpha channel.
 *
 * The image is rasterized to a small offscreen canvas, the alpha channel is
 * thresholded into a binary mask, the outer boundary is followed with
 * Moore-neighbor tracing, and the result is simplified with Douglas–Peucker.
 * Points are returned as fractions (0..1) of the image bounding box, origin at
 * the top-left. A fully opaque (or undecodable) image yields the rectangle.
 */

const RECTANGLE: ReadonlyArray<EditorWrapPolygonPoint> = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

const MAX_SIDE = 256;
const ALPHA_THRESHOLD = 128; // 0..255
const OPAQUE_RATIO = 0.985; // above this we treat the image as a rectangle
const MAX_POINTS = 40;

const contourCache = new Map<string, EditorWrapPolygonPoint[]>();

function rectangle(): EditorWrapPolygonPoint[] {
  return RECTANGLE.map((point): { x: number; y: number } => ({ ...point }));
}

// 8-connected neighbor offsets in clockwise order (N, NE, E, SE, S, SW, W, NW).
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

function buildAlphaMask(img: HTMLImageElement): {
  mask: Uint8Array;
  width: number;
  height: number;
  foreground: number;
} | null {
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (!naturalW || !naturalH) {
    return null;
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(naturalW, naturalH));
  const width = Math.max(1, Math.round(naturalW * scale));
  const height = Math.max(1, Math.round(naturalH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  ctx.drawImage(img, 0, 0, width, height);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, width, height).data;
  } catch {
    // Tainted canvas (cross-origin image) — cannot inspect alpha.
    return null;
  }

  const mask = new Uint8Array(width * height);
  let foreground = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (pixels[i * 4 + 3]! >= ALPHA_THRESHOLD) {
      mask[i] = 1;
      foreground += 1;
    }
  }

  return { mask, width, height, foreground };
}

function traceBoundary(
  mask: Uint8Array,
  width: number,
  height: number,
): Array<readonly [number, number]> {
  const at = (x: number, y: number): boolean =>
    x >= 0 && x < width && y >= 0 && y < height && mask[y * width + x] === 1;

  // Topmost, then leftmost foreground pixel.
  let startX = -1;
  let startY = -1;
  for (let y = 0; y < height && startY < 0; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 1) {
        startX = x;
        startY = y;
        break;
      }
    }
  }
  if (startX < 0) {
    return [];
  }

  const contour: Array<readonly [number, number]> = [];
  let bx = startX;
  let by = startY;
  // We arrived at the start pixel from the West (scan order), so resume the
  // clockwise neighbor search just after the West direction.
  let backtrack = 6; // index of (-1, 0)
  const maxSteps = width * height * 4;

  for (let step = 0; step < maxSteps; step += 1) {
    let moved = false;
    for (let k = 1; k <= 8; k += 1) {
      const dir = (backtrack + k) % 8;
      const [dx, dy] = DIRS[dir]!;
      const nx = bx + dx;
      const ny = by + dy;
      if (at(nx, ny)) {
        contour.push([bx, by]);
        // Resume next search from the cell we came from (current b).
        backtrack = (dir + 4) % 8;
        bx = nx;
        by = ny;
        moved = true;
        break;
      }
    }
    if (!moved) {
      // Isolated pixel.
      contour.push([bx, by]);
      break;
    }
    if (bx === startX && by === startY && contour.length > 1) {
      break;
    }
  }

  return contour;
}

function perpendicularDistance(
  point: readonly [number, number],
  lineStart: readonly [number, number],
  lineEnd: readonly [number, number],
): number {
  const [px, py] = point;
  const [ax, ay] = lineStart;
  const [bx, by] = lineEnd;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const cross = Math.abs(dx * (ay - py) - dy * (ax - px));
  return cross / Math.sqrt(lengthSq);
}

function douglasPeucker(
  points: Array<readonly [number, number]>,
  tolerance: number,
): Array<readonly [number, number]> {
  if (points.length < 3) {
    return points.slice();
  }

  let maxDist = 0;
  let index = 0;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  for (let i = 1; i < points.length - 1; i += 1) {
    const dist = perpendicularDistance(points[i]!, first, last);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist <= tolerance) {
    return [first, last];
  }

  const left = douglasPeucker(points.slice(0, index + 1), tolerance);
  const right = douglasPeucker(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

/**
 * Pure mask → fractional contour. A mostly-opaque or empty mask, or one whose
 * boundary degenerates, yields the rectangle. Exported for deterministic tests
 * (the canvas rasterization path needs a real browser).
 */
export function traceAlphaMaskContour(
  mask: Uint8Array,
  width: number,
  height: number,
): EditorWrapPolygonPoint[] {
  let foreground = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === 1) foreground += 1;
  }
  if (
    width <= 0 ||
    height <= 0 ||
    foreground === 0 ||
    foreground / (width * height) >= OPAQUE_RATIO
  ) {
    return rectangle();
  }

  const boundary = traceBoundary(mask, width, height);
  if (boundary.length < 3) {
    return rectangle();
  }

  const tolerance = Math.max(width, height) * 0.012;
  let simplified = douglasPeucker(boundary, tolerance);

  // Progressively coarsen until under the point cap.
  let extraTolerance = tolerance;
  while (simplified.length > MAX_POINTS) {
    extraTolerance *= 1.6;
    simplified = douglasPeucker(boundary, extraTolerance);
  }

  if (simplified.length < 3) {
    return rectangle();
  }

  return simplified.map(([x, y]): { x: number; y: number } => ({
    x: Math.min(1, Math.max(0, x / width)),
    y: Math.min(1, Math.max(0, y / height)),
  }));
}

/** Traces (and caches) the wrap contour for a decoded, same-origin image. */
export function traceImageAlphaContour(
  img: HTMLImageElement,
): EditorWrapPolygonPoint[] {
  const cacheKey = img.src;
  const cached = contourCache.get(cacheKey);
  if (cached) {
    return cached.map((point): { x: number; y: number } => ({ ...point }));
  }

  const built = buildAlphaMask(img);
  if (!built) {
    return rectangle();
  }

  const polygon = traceAlphaMaskContour(built.mask, built.width, built.height);
  contourCache.set(cacheKey, polygon);
  return polygon.map((point): { x: number; y: number } => ({ ...point }));
}
