import type { PresetPathSegment } from "../types.js";
import {
  arcSegments,
  ellipseSegments,
  polygon,
  rectSegments,
} from "../primitives.js";

export function blockArcSegments(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): PresetPathSegment[] {
  const outer = arcSegments(cx, cy, rx, ry, -45, 250);
  const inner = arcSegments(cx, cy, rx * 0.58, ry * 0.58, 250, -45).reverse();
  return [...outer, ...inner.slice(1), { type: "close" }];
}

export function plusSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return polygon([
    [x + width * 0.38, y],
    [x + width * 0.62, y],
    [x + width * 0.62, y + height * 0.38],
    [x + width, y + height * 0.38],
    [x + width, y + height * 0.62],
    [x + width * 0.62, y + height * 0.62],
    [x + width * 0.62, y + height],
    [x + width * 0.38, y + height],
    [x + width * 0.38, y + height * 0.62],
    [x, y + height * 0.62],
    [x, y + height * 0.38],
    [x + width * 0.38, y + height * 0.38],
  ]);
}

export function xSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return polygon([
    [x + width * 0.18, y],
    [x + width * 0.5, y + height * 0.32],
    [x + width * 0.82, y],
    [x + width, y + height * 0.18],
    [x + width * 0.68, y + height * 0.5],
    [x + width, y + height * 0.82],
    [x + width * 0.82, y + height],
    [x + width * 0.5, y + height * 0.68],
    [x + width * 0.18, y + height],
    [x, y + height * 0.82],
    [x + width * 0.32, y + height * 0.5],
    [x, y + height * 0.18],
  ]);
}

export function mathDivideSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...ellipseSegments(
      x + width / 2,
      y + height * 0.22,
      width * 0.07,
      height * 0.07,
    ),
    ...rectSegments(
      x + width * 0.18,
      y + height * 0.46,
      width * 0.64,
      height * 0.08,
    ),
    ...ellipseSegments(
      x + width / 2,
      y + height * 0.78,
      width * 0.07,
      height * 0.07,
    ),
  ];
}

export function mathEqualSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...rectSegments(x, y + height * 0.3, width, height * 0.12),
    ...rectSegments(x, y + height * 0.58, width, height * 0.12),
  ];
}

export function mathNotEqualSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...mathEqualSegments(x, y, width, height),
    ...polygon([
      [x + width * 0.62, y],
      [x + width * 0.74, y],
      [x + width * 0.38, y + height],
      [x + width * 0.26, y + height],
    ]),
  ];
}
