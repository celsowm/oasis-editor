import type { PresetPathSegment } from "../types.js";
import { ellipseSegments, polygon, rectSegments } from "../primitives.js";

export function ribbonSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  const mid = y + height * 0.5;
  if (key.includes("Ellipse"))
    return [
      ...ellipseSegments(x + width / 2, mid, width * 0.42, height * 0.28),
      ...polygon([
        [x, mid],
        [x + width * 0.18, y + height * 0.3],
        [x + width * 0.18, y + height * 0.7],
      ]),
      ...polygon([
        [x + width, mid],
        [x + width * 0.82, y + height * 0.3],
        [x + width * 0.82, y + height * 0.7],
      ]),
    ];
  return polygon([
    [x, y + height * 0.25],
    [x + width, y + height * 0.25],
    [x + width * 0.82, mid],
    [x + width, y + height * 0.75],
    [x, y + height * 0.75],
    [x + width * 0.18, mid],
  ]);
}

export function scrollSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  if (key === "horizontalScroll")
    return [
      ...rectSegments(
        x + width * 0.1,
        y + height * 0.2,
        width * 0.8,
        height * 0.6,
      ),
      ...ellipseSegments(
        x + width * 0.1,
        y + height * 0.5,
        width * 0.1,
        height * 0.3,
      ),
      ...ellipseSegments(
        x + width * 0.9,
        y + height * 0.5,
        width * 0.1,
        height * 0.3,
      ),
    ];
  return [
    ...rectSegments(
      x + width * 0.2,
      y + height * 0.1,
      width * 0.6,
      height * 0.8,
    ),
    ...ellipseSegments(
      x + width * 0.5,
      y + height * 0.1,
      width * 0.3,
      height * 0.1,
    ),
    ...ellipseSegments(
      x + width * 0.5,
      y + height * 0.9,
      width * 0.3,
      height * 0.1,
    ),
  ];
}

export function waveSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  const first: PresetPathSegment[] = [
    { type: "move", x, y: y + height * 0.5 },
    {
      type: "cubic",
      x1: x + width * 0.25,
      y1: y,
      x2: x + width * 0.25,
      y2: y + height,
      x: x + width * 0.5,
      y: y + height * 0.5,
    },
    {
      type: "cubic",
      x1: x + width * 0.75,
      y1: y,
      x2: x + width * 0.75,
      y2: y + height,
      x: x + width,
      y: y + height * 0.5,
    },
  ];
  return key === "doubleWave"
    ? [
        ...first,
        ...first.map((segment) =>
          "y" in segment
            ? { ...segment, y: segment.y + height * 0.18 }
            : segment,
        ),
      ]
    : first;
}
