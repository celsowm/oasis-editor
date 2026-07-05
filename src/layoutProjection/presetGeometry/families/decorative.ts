import type { PresetPathSegment } from "../types.js";
import { arcSegments, ellipseSegments, polygon } from "../primitives.js";

export function heartSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  const cx = x + width / 2;
  return [
    { type: "move", x: cx, y: y + height * 0.9 },
    {
      type: "cubic",
      x1: x - width * 0.12,
      y1: y + height * 0.45,
      x2: x + width * 0.08,
      y2: y,
      x: cx,
      y: y + height * 0.28,
    },
    {
      type: "cubic",
      x1: x + width * 0.92,
      y1: y,
      x2: x + width * 1.12,
      y2: y + height * 0.45,
      x: cx,
      y: y + height * 0.9,
    },
    { type: "close" },
  ];
}

export function cloudSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...ellipseSegments(
      x + width * 0.28,
      y + height * 0.58,
      width * 0.24,
      height * 0.23,
    ),
    ...ellipseSegments(
      x + width * 0.48,
      y + height * 0.42,
      width * 0.28,
      height * 0.28,
    ),
    ...ellipseSegments(
      x + width * 0.7,
      y + height * 0.58,
      width * 0.25,
      height * 0.24,
    ),
  ];
}

export function moonSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    { type: "move", x: x + width * 0.68, y },
    {
      type: "cubic",
      x1: x + width * 0.22,
      y1: y + height * 0.06,
      x2: x + width * 0.18,
      y2: y + height * 0.94,
      x: x + width * 0.68,
      y: y + height,
    },
    {
      type: "cubic",
      x1: x + width * 0.42,
      y1: y + height * 0.72,
      x2: x + width * 0.42,
      y2: y + height * 0.28,
      x: x + width * 0.68,
      y,
    },
    { type: "close" },
  ];
}

export function smileySegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...ellipseSegments(x + width / 2, y + height / 2, width / 2, height / 2),
    ...ellipseSegments(
      x + width * 0.35,
      y + height * 0.38,
      width * 0.05,
      height * 0.05,
    ),
    ...ellipseSegments(
      x + width * 0.65,
      y + height * 0.38,
      width * 0.05,
      height * 0.05,
    ),
    ...arcSegments(
      x + width / 2,
      y + height * 0.52,
      width * 0.24,
      height * 0.18,
      20,
      160,
    ),
  ];
}

export function teardropSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    { type: "move", x: x + width * 0.55, y },
    {
      type: "cubic",
      x1: x + width,
      y1: y + height * 0.22,
      x2: x + width * 0.95,
      y2: y + height,
      x: x + width * 0.35,
      y: y + height,
    },
    {
      type: "cubic",
      x1: x - width * 0.1,
      y1: y + height * 0.66,
      x2: x + width * 0.16,
      y2: y + height * 0.12,
      x: x + width * 0.55,
      y,
    },
    { type: "close" },
  ];
}

export function noSmokingSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...ellipseSegments(x + width / 2, y + height / 2, width / 2, height / 2),
    ...polygon([
      [x + width * 0.18, y + height * 0.1],
      [x + width * 0.28, y],
      [x + width * 0.82, y + height * 0.9],
      [x + width * 0.72, y + height],
    ]),
  ];
}

export function donutSegments(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): PresetPathSegment[] {
  return [
    ...ellipseSegments(cx, cy, rx, ry),
    ...ellipseSegments(cx, cy, rx * 0.52, ry * 0.52),
  ];
}
