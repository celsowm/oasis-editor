import type { PresetPathSegment } from "./types.js";

export const KAPPA = 0.5522847498307936;

export function polygon(points: Array<[number, number]>): PresetPathSegment[] {
  const segments: PresetPathSegment[] = [];
  points.forEach(([px, py], index): void => {
    segments.push(
      index === 0
        ? { type: "move", x: px, y: py }
        : { type: "line", x: px, y: py },
    );
  });
  segments.push({ type: "close" });
  return segments;
}

export function rectSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return polygon([
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ]);
}

export function ellipseSegments(
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

export function pointOnEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  degrees: number,
): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [cx + Math.cos(radians) * rx, cy + Math.sin(radians) * ry];
}

export function arcSegments(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  start: number,
  end: number,
): PresetPathSegment[] {
  const steps = Math.max(4, Math.ceil(Math.abs(end - start) / 30));
  const points = Array.from(
    { length: steps + 1 },
    (_, index): [number, number] =>
      pointOnEllipse(cx, cy, rx, ry, start + ((end - start) * index) / steps),
  );
  return points.map(
    (
      [px, py],
      index,
    ):
      | { type: "move"; x: number; y: number }
      | { type: "line"; x: number; y: number } =>
      index === 0
        ? { type: "move", x: px, y: py }
        : { type: "line", x: px, y: py },
  );
}

export function pieSegments(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  start: number,
  end: number,
): PresetPathSegment[] {
  return [
    { type: "move", x: cx, y: cy },
    ...arcSegments(cx, cy, rx, ry, start, end).slice(1),
    { type: "close" },
  ];
}

export function regularPolygon(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sides: number,
  startDegrees: number,
): PresetPathSegment[] {
  const points = Array.from({ length: sides }, (_, index): [number, number] =>
    pointOnEllipse(cx, cy, rx, ry, startDegrees + (360 * index) / sides),
  );
  return polygon(points);
}

export function starPointCount(preset: string): number {
  return Number.parseInt(preset.replace("star", ""), 10);
}

export function starSegments(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  points: number,
  innerRatio = 0.45,
): PresetPathSegment[] {
  const vertices = Array.from(
    { length: points * 2 },
    (_, index): [number, number] => {
      const radius = index % 2 === 0 ? 1 : innerRatio;
      return pointOnEllipse(
        cx,
        cy,
        rx * radius,
        ry * radius,
        -90 + (180 * index) / points,
      );
    },
  );
  return polygon(vertices);
}

export function roundRectSegments(
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
