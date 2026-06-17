import { getPresetPathSegments } from "@/layoutProjection/presetGeometry.js";

/**
 * Builds a canvas {@link Path2D} for a DrawingML preset shape from its
 * backend-agnostic geometry (see
 * {@link getPresetPathSegments}). Used to fill/stroke shapes and
 * non-rectangular text boxes on the canvas.
 */
export function buildPresetPath(
  preset: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): Path2D {
  const path = new Path2D();
  for (const segment of getPresetPathSegments(preset, x, y, width, height)) {
    switch (segment.type) {
      case "move":
        path.moveTo(segment.x, segment.y);
        break;
      case "line":
        path.lineTo(segment.x, segment.y);
        break;
      case "cubic":
        path.bezierCurveTo(
          segment.x1,
          segment.y1,
          segment.x2,
          segment.y2,
          segment.x,
          segment.y,
        );
        break;
      case "close":
        path.closePath();
        break;
    }
  }
  return path;
}
