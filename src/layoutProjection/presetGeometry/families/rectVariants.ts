import type { PresetPathSegment } from "../types.js";
import { polygon } from "../primitives.js";

export function mixedRectSegments(
  x: number,
  y: number,
  width: number,
  height: number,
  tl: boolean,
  tr: boolean,
  br: boolean,
  bl: boolean,
): PresetPathSegment[] {
  return snipRoundRectLikeSegments(x, y, width, height, {
    tlRound: tl,
    trRound: tr,
    brRound: br,
    blRound: bl,
  });
}

export function snipRoundRectSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return snipRoundRectLikeSegments(x, y, width, height, {
    tlSnip: true,
    brRound: true,
  });
}

export function snipRectSegments(
  x: number,
  y: number,
  width: number,
  height: number,
  tl: boolean,
  tr: boolean,
  br: boolean,
  bl: boolean,
): PresetPathSegment[] {
  return snipRoundRectLikeSegments(x, y, width, height, {
    tlSnip: tl,
    trSnip: tr,
    brSnip: br,
    blSnip: bl,
  });
}

function snipRoundRectLikeSegments(
  x: number,
  y: number,
  width: number,
  height: number,
  corners: Partial<
    Record<
      | "tlSnip"
      | "trSnip"
      | "brSnip"
      | "blSnip"
      | "tlRound"
      | "trRound"
      | "brRound"
      | "blRound",
      boolean
    >
  >,
): PresetPathSegment[] {
  const r = Math.min(width, height) * 0.16;
  const right = x + width;
  const bottom = y + height;
  const points: Array<[number, number]> = [
    [x + (corners.tlSnip || corners.tlRound ? r : 0), y],
    [right - (corners.trSnip || corners.trRound ? r : 0), y],
    [right, y + (corners.trSnip || corners.trRound ? r : 0)],
    [right, bottom - (corners.brSnip || corners.brRound ? r : 0)],
    [right - (corners.brSnip || corners.brRound ? r : 0), bottom],
    [x + (corners.blSnip || corners.blRound ? r : 0), bottom],
    [x, bottom - (corners.blSnip || corners.blRound ? r : 0)],
    [x, y + (corners.tlSnip || corners.tlRound ? r : 0)],
  ];
  return polygon(points);
}
