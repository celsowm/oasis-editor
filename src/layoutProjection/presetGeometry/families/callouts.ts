import type { PresetPathSegment } from "../types.js";
import {
  ellipseSegments,
  rectSegments,
  roundRectSegments,
} from "../primitives.js";

export function calloutSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  if (key.startsWith("wedgeEllipse")) {
    return [
      ...ellipseSegments(
        x + width / 2,
        y + height / 2,
        width / 2,
        height * 0.42,
      ),
      { type: "move", x: x + width * 0.55, y: y + height * 0.82 },
      { type: "line", x: x + width * 0.24, y: y + height },
      { type: "line", x: x + width * 0.45, y: y + height * 0.75 },
    ];
  }
  const r = key.startsWith("wedgeRound") ? Math.min(width, height) * 0.08 : 0;
  const body =
    r > 0
      ? roundRectSegments(x, y, width, height * 0.82, r)
      : rectSegments(x, y, width, height * 0.82);
  return [
    ...body,
    { type: "move", x: x + width * 0.58, y: y + height * 0.82 },
    { type: "line", x: x + width * 0.26, y: y + height },
    { type: "line", x: x + width * 0.44, y: y + height * 0.82 },
    { type: "close" },
  ];
}
