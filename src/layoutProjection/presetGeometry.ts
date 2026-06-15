/**
 * Outline geometry for DrawingML preset shapes (`a:prstGeom/@prst`), expressed
 * as backend-agnostic path segments so the canvas renderer and the PDF exporter
 * paint identical shapes. Coordinates are in a top-left origin coordinate space
 * (px on canvas, pt in the PDF exporter — the segments are affine in the input
 * rectangle, so either unit works).
 *
 * Only the "basic shapes" handled by the editor are mapped explicitly; any
 * unknown or absent preset falls back to a plain rectangle, preserving the
 * historical behaviour for ordinary text boxes.
 */
export type PresetPathSegment =
  | { type: "move"; x: number; y: number }
  | { type: "line"; x: number; y: number }
  | {
      type: "cubic";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x: number;
      y: number;
    }
  | { type: "close" };

// Control-point distance for approximating a quarter circle with a cubic Bézier.
const KAPPA = 0.5522847498307936;

export function getPresetPathSegments(
  preset: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  const right = x + width;
  const bottom = y + height;
  const cx = x + width / 2;
  const cy = y + height / 2;

  switch (preset) {
    case "roundRect":
      return roundRectSegments(
        x,
        y,
        width,
        height,
        Math.min(width, height) * 0.1,
      );
    case "ellipse":
      return ellipseSegments(cx, cy, width / 2, height / 2);
    case "triangle":
      return polygon([
        [cx, y],
        [right, bottom],
        [x, bottom],
      ]);
    case "rtTriangle":
      return polygon([
        [x, y],
        [x, bottom],
        [right, bottom],
      ]);
    case "diamond":
      return polygon([
        [cx, y],
        [right, cy],
        [cx, bottom],
        [x, cy],
      ]);
    case "rect":
    default:
      return polygon([
        [x, y],
        [right, y],
        [right, bottom],
        [x, bottom],
      ]);
  }
}

function polygon(points: Array<[number, number]>): PresetPathSegment[] {
  const segments: PresetPathSegment[] = [];
  points.forEach(([px, py], index) => {
    segments.push(
      index === 0
        ? { type: "move", x: px, y: py }
        : { type: "line", x: px, y: py },
    );
  });
  segments.push({ type: "close" });
  return segments;
}

function ellipseSegments(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): PresetPathSegment[] {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  return [
    { type: "move", x: cx - rx, y: cy },
    {
      type: "cubic",
      x1: cx - rx,
      y1: cy - oy,
      x2: cx - ox,
      y2: cy - ry,
      x: cx,
      y: cy - ry,
    },
    {
      type: "cubic",
      x1: cx + ox,
      y1: cy - ry,
      x2: cx + rx,
      y2: cy - oy,
      x: cx + rx,
      y: cy,
    },
    {
      type: "cubic",
      x1: cx + rx,
      y1: cy + oy,
      x2: cx + ox,
      y2: cy + ry,
      x: cx,
      y: cy + ry,
    },
    {
      type: "cubic",
      x1: cx - ox,
      y1: cy + ry,
      x2: cx - rx,
      y2: cy + oy,
      x: cx - rx,
      y: cy,
    },
    { type: "close" },
  ];
}

function roundRectSegments(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): PresetPathSegment[] {
  const r = Math.min(radius, width / 2, height / 2);
  const right = x + width;
  const bottom = y + height;
  const o = r * (1 - KAPPA);
  return [
    { type: "move", x: x + r, y },
    { type: "line", x: right - r, y },
    {
      type: "cubic",
      x1: right - o,
      y1: y,
      x2: right,
      y2: y + o,
      x: right,
      y: y + r,
    },
    { type: "line", x: right, y: bottom - r },
    {
      type: "cubic",
      x1: right,
      y1: bottom - o,
      x2: right - o,
      y2: bottom,
      x: right - r,
      y: bottom,
    },
    { type: "line", x: x + r, y: bottom },
    {
      type: "cubic",
      x1: x + o,
      y1: bottom,
      x2: x,
      y2: bottom - o,
      x: x,
      y: bottom - r,
    },
    { type: "line", x, y: y + r },
    { type: "cubic", x1: x, y1: y + o, x2: x + o, y2: y, x: x + r, y },
    { type: "close" },
  ];
}
