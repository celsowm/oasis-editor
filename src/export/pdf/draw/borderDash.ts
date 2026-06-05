import { pxToPt } from "../units.js";

type BorderType = "solid" | "dashed" | "dotted" | "none";

/**
 * Maps a border type to a PDF dash pattern (in points), mirroring the canvas
 * renderer so dashed/dotted paragraph and table borders look the same in both
 * outputs. `solid`/`none` return `undefined` (a continuous stroke).
 *
 * The canvas uses pixel patterns ([5,3] dashed, [1,3] dotted); these are the
 * point-space equivalents via {@link pxToPt}.
 */
export function borderDashArray(type: BorderType): number[] | undefined {
  switch (type) {
    case "dashed":
      return [pxToPt(5), pxToPt(3)];
    case "dotted":
      return [pxToPt(1), pxToPt(3)];
    default:
      return undefined;
  }
}
