import { parseUnitToPt } from "@/core/units/parseUnitToPt.js";

export const POINTS_PER_PIXEL = 0.75;
export const PIXELS_PER_POINT = 1 / POINTS_PER_PIXEL;
export const MIN_TABLE_SIZE_PT = 10;

export function pxToPt(px: number): number {
  return px * POINTS_PER_PIXEL;
}

export function ptToPx(pt: number): number {
  return pt * PIXELS_PER_POINT;
}

export const parseSizeToPt = parseUnitToPt;
