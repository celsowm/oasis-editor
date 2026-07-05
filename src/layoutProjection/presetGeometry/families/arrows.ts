import type { PresetPathSegment } from "../types.js";
import { polygon, starSegments } from "../primitives.js";
import { blockArcSegments } from "./mathSymbols.js";

export function arrowSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  const right = x + width;
  const bottom = y + height;
  const cx = x + width / 2;
  const cy = y + height / 2;
  if (key === "upDownArrow")
    return polygon([
      [cx, y],
      [right, y + height * 0.28],
      [x + width * 0.62, y + height * 0.28],
      [x + width * 0.62, y + height * 0.72],
      [right, y + height * 0.72],
      [cx, bottom],
      [x, y + height * 0.72],
      [x + width * 0.38, y + height * 0.72],
      [x + width * 0.38, y + height * 0.28],
      [x, y + height * 0.28],
    ]);
  if (key === "leftRightArrow" || key === "leftRightUpArrow")
    return polygon([
      [x, cy],
      [x + width * 0.24, y],
      [x + width * 0.24, y + height * 0.32],
      [x + width * 0.76, y + height * 0.32],
      [x + width * 0.76, y],
      [right, cy],
      [x + width * 0.76, bottom],
      [x + width * 0.76, y + height * 0.68],
      [x + width * 0.24, y + height * 0.68],
      [x + width * 0.24, bottom],
    ]);
  if (key === "quadArrow")
    return starSegments(cx, cy, width * 0.5, height * 0.5, 4, 0.38);
  if (key === "leftArrow" || key === "leftCircularArrow")
    return polygon([
      [x, cy],
      [x + width * 0.38, y],
      [x + width * 0.38, y + height * 0.28],
      [right, y + height * 0.28],
      [right, y + height * 0.72],
      [x + width * 0.38, y + height * 0.72],
      [x + width * 0.38, bottom],
    ]);
  if (key === "upArrow" || key === "bentUpArrow" || key === "curvedUpArrow")
    return polygon([
      [cx, y],
      [right, y + height * 0.38],
      [x + width * 0.68, y + height * 0.38],
      [x + width * 0.68, bottom],
      [x + width * 0.32, bottom],
      [x + width * 0.32, y + height * 0.38],
      [x, y + height * 0.38],
    ]);
  if (key === "downArrow" || key === "curvedDownArrow")
    return polygon([
      [x + width * 0.32, y],
      [x + width * 0.68, y],
      [x + width * 0.68, y + height * 0.62],
      [right, y + height * 0.62],
      [cx, bottom],
      [x, y + height * 0.62],
      [x + width * 0.32, y + height * 0.62],
    ]);
  if (key === "circularArrow" || key === "leftRightCircularArrow")
    return blockArcSegments(cx, cy, width / 2, height / 2);
  if (key === "uturnArrow")
    return polygon([
      [x + width * 0.2, bottom],
      [x + width * 0.2, y + height * 0.35],
      [x + width * 0.62, y + height * 0.35],
      [x + width * 0.62, y],
      [right, y + height * 0.5],
      [x + width * 0.62, bottom],
      [x + width * 0.62, y + height * 0.65],
      [x + width * 0.38, y + height * 0.65],
      [x + width * 0.38, bottom],
    ]);
  if (key === "notchedRightArrow")
    return polygon([
      [x, y],
      [right - width * 0.28, y],
      [right, cy],
      [right - width * 0.28, bottom],
      [x, bottom],
      [x + width * 0.18, cy],
    ]);
  if (key === "stripedRightArrow")
    return polygon([
      [x + width * 0.16, y],
      [right - width * 0.28, y],
      [right, cy],
      [right - width * 0.28, bottom],
      [x + width * 0.16, bottom],
      [x + width * 0.34, cy],
    ]);
  return polygon([
    [x, y + height * 0.28],
    [right - width * 0.38, y + height * 0.28],
    [right - width * 0.38, y],
    [right, cy],
    [right - width * 0.38, bottom],
    [right - width * 0.38, y + height * 0.72],
    [x, y + height * 0.72],
  ]);
}
