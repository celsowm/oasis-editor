import type { PresetPathSegment } from "../types.js";
import {
  arcSegments,
  ellipseSegments,
  polygon,
  rectSegments,
} from "../primitives.js";

export function canSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...rectSegments(x, y + height * 0.14, width, height * 0.72),
    ...ellipseSegments(
      x + width / 2,
      y + height * 0.14,
      width / 2,
      height * 0.14,
    ),
    ...arcSegments(
      x + width / 2,
      y + height * 0.86,
      width / 2,
      height * 0.14,
      0,
      180,
    ),
  ];
}

export function cubeSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return polygon([
    [x + width * 0.22, y],
    [x + width, y],
    [x + width, y + height * 0.78],
    [x + width * 0.78, y + height],
    [x, y + height],
    [x, y + height * 0.22],
  ]);
}

export function bevelSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  const inset = Math.min(width, height) * 0.16;
  return polygon([
    [x + inset, y],
    [x + width - inset, y],
    [x + width, y + inset],
    [x + width, y + height - inset],
    [x + width - inset, y + height],
    [x + inset, y + height],
    [x, y + height - inset],
    [x, y + inset],
  ]);
}

export function foldedCornerSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return polygon([
    [x, y],
    [x + width * 0.78, y],
    [x + width, y + height * 0.22],
    [x + width, y + height],
    [x, y + height],
  ]);
}

export function frameSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...rectSegments(x, y, width, height),
    ...rectSegments(
      x + width * 0.18,
      y + height * 0.18,
      width * 0.64,
      height * 0.64,
    ),
  ];
}

export function halfFrameSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return polygon([
    [x, y],
    [x + width, y],
    [x + width, y + height * 0.22],
    [x + width * 0.22, y + height * 0.22],
    [x + width * 0.22, y + height],
    [x, y + height],
  ]);
}

export function cornerSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return polygon([
    [x, y],
    [x + width, y],
    [x + width, y + height * 0.22],
    [x + width * 0.22, y + height * 0.22],
    [x + width * 0.22, y + height],
    [x, y + height],
  ]);
}

export function plaqueSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return polygon([
    [x + width * 0.18, y],
    [x + width * 0.82, y],
    [x + width, y + height * 0.18],
    [x + width, y + height * 0.82],
    [x + width * 0.82, y + height],
    [x + width * 0.18, y + height],
    [x, y + height * 0.82],
    [x, y + height * 0.18],
  ]);
}

export function tabbedRectSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  const tab = Math.min(width, height) * 0.18;
  if (key === "cornerTabs")
    return polygon([
      [x, y + tab],
      [x + tab, y + tab],
      [x + tab, y],
      [x + width - tab, y],
      [x + width - tab, y + tab],
      [x + width, y + tab],
      [x + width, y + height - tab],
      [x + width - tab, y + height - tab],
      [x + width - tab, y + height],
      [x + tab, y + height],
      [x + tab, y + height - tab],
      [x, y + height - tab],
    ]);
  if (key === "plaqueTabs")
    return polygon([
      [x, y + tab],
      [x + width * 0.35, y + tab],
      [x + width * 0.35, y],
      [x + width * 0.65, y],
      [x + width * 0.65, y + tab],
      [x + width, y + tab],
      [x + width, y + height - tab],
      [x + width * 0.65, y + height - tab],
      [x + width * 0.65, y + height],
      [x + width * 0.35, y + height],
      [x + width * 0.35, y + height - tab],
      [x, y + height - tab],
    ]);
  return polygon([
    [x + tab, y],
    [x + width - tab, y],
    [x + width - tab, y + tab],
    [x + width, y + tab],
    [x + width, y + height - tab],
    [x + width - tab, y + height - tab],
    [x + width - tab, y + height],
    [x + tab, y + height],
    [x + tab, y + height - tab],
    [x, y + height - tab],
    [x, y + tab],
    [x + tab, y + tab],
  ]);
}
