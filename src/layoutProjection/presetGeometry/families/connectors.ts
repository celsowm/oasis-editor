import type { PresetPathSegment } from "../types.js";

export function connectorSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  const right = x + width;
  const bottom = y + height;
  if (key.startsWith("curved")) {
    return [
      { type: "move", x, y },
      {
        type: "cubic",
        x1: x + width * 0.7,
        y1: y,
        x2: x + width * 0.3,
        y2: bottom,
        x: right,
        y: bottom,
      },
    ];
  }
  if (key === "bentConnector2")
    return [
      { type: "move", x, y },
      { type: "line", x: right, y: bottom },
    ];
  if (key === "bentConnector3")
    return [
      { type: "move", x, y },
      { type: "line", x: right, y },
      { type: "line", x: right, y: bottom },
    ];
  if (key === "bentConnector4")
    return [
      { type: "move", x, y },
      { type: "line", x: x + width * 0.5, y },
      { type: "line", x: x + width * 0.5, y: bottom },
      { type: "line", x: right, y: bottom },
    ];
  if (key === "bentConnector5")
    return [
      { type: "move", x, y },
      { type: "line", x: x + width * 0.34, y },
      { type: "line", x: x + width * 0.34, y: bottom },
      { type: "line", x: x + width * 0.66, y: bottom },
      { type: "line", x: x + width * 0.66, y },
      { type: "line", x: right, y },
    ];
  return [
    { type: "move", x, y },
    { type: "line", x: right, y: bottom },
  ];
}
