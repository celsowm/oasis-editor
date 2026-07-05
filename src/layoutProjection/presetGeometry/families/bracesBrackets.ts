import type { PresetPathSegment } from "../types.js";

export function braceSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  if (key === "rightBrace")
    return [
      { type: "move", x, y },
      {
        type: "cubic",
        x1: x + width,
        y1: y,
        x2: x,
        y2: y + height * 0.5,
        x: x + width,
        y: y + height * 0.5,
      },
      {
        type: "cubic",
        x1: x,
        y1: y + height * 0.5,
        x2: x + width,
        y2: y + height,
        x,
        y: y + height,
      },
    ];
  if (key === "bracePair")
    return [
      ...braceSegments("leftBrace", x, y, width * 0.45, height),
      ...braceSegments("rightBrace", x + width * 0.55, y, width * 0.45, height),
    ];
  return [
    { type: "move", x: x + width, y },
    {
      type: "cubic",
      x1: x,
      y1: y,
      x2: x + width,
      y2: y + height * 0.5,
      x,
      y: y + height * 0.5,
    },
    {
      type: "cubic",
      x1: x + width,
      y1: y + height * 0.5,
      x2: x,
      y2: y + height,
      x: x + width,
      y: y + height,
    },
  ];
}

export function bracketSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  if (key === "rightBracket")
    return [
      { type: "move", x, y },
      { type: "line", x: x + width, y },
      { type: "line", x: x + width, y: y + height },
      { type: "line", x, y: y + height },
    ];
  if (key === "bracketPair")
    return [
      ...bracketSegments("leftBracket", x, y, width * 0.45, height),
      ...bracketSegments(
        "rightBracket",
        x + width * 0.55,
        y,
        width * 0.45,
        height,
      ),
    ];
  return [
    { type: "move", x: x + width, y },
    { type: "line", x, y },
    { type: "line", x, y: y + height },
    { type: "line", x: x + width, y: y + height },
  ];
}
