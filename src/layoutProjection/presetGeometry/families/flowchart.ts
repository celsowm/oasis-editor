import type { PresetPathSegment, PresetSegmentResolver } from "../types.js";
import {
  arcSegments,
  ellipseSegments,
  polygon,
  rectSegments,
  roundRectSegments,
} from "../primitives.js";
import { snipRectSegments } from "./rectVariants.js";
import { canSegments } from "./containers3d.js";

export function flowChartSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
  resolvePreset: PresetSegmentResolver,
): PresetPathSegment[] {
  if (key.includes("Decision"))
    return resolvePreset("diamond", x, y, width, height);
  if (
    key.includes("Connector") ||
    key.includes("SummingJunction") ||
    key.includes("Or")
  ) {
    return ellipseSegments(
      x + width / 2,
      y + height / 2,
      width / 2,
      height / 2,
    );
  }
  if (key.includes("Terminator")) {
    return roundRectSegments(
      x,
      y,
      width,
      height,
      Math.min(width, height) * 0.28,
    );
  }
  if (key.includes("Delay")) {
    return [
      ...rectSegments(x, y, width * 0.65, height).slice(0, -1),
      ...arcSegments(
        x + width * 0.65,
        y + height / 2,
        width * 0.35,
        height / 2,
        -90,
        90,
      ),
      { type: "close" },
    ];
  }
  if (key.includes("Document")) return waveBottomRect(x, y, width, height);
  if (
    key.includes("Data") ||
    key.includes("InputOutput") ||
    key.includes("ManualInput")
  ) {
    return resolvePreset("parallelogram", x, y, width, height);
  }
  if (key.includes("Preparation")) {
    return resolvePreset("hexagon", x, y, width, height);
  }
  if (key.includes("OffpageConnector")) {
    return resolvePreset("homePlate", x, y, width, height);
  }
  if (key.includes("PunchedCard")) {
    return snipRectSegments(x, y, width, height, true, false, false, false);
  }
  if (key.includes("Magnetic")) return canSegments(x, y, width, height);
  if (key.includes("Collate")) {
    return polygon([
      [x, y],
      [x + width, y],
      [x, y + height],
      [x + width, y + height],
    ]);
  }
  if (key.includes("Sort"))
    return resolvePreset("diamond", x, y, width, height);
  return rectSegments(x, y, width, height);
}

export function actionButtonSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
  resolvePreset: PresetSegmentResolver,
): PresetPathSegment[] {
  const base = roundRectSegments(
    x,
    y,
    width,
    height,
    Math.min(width, height) * 0.08,
  );
  if (key === "actionButtonBlank") return base;
  return [...base, ...symbolSegments(key, x, y, width, height, resolvePreset)];
}

function symbolSegments(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
  resolvePreset: PresetSegmentResolver,
): PresetPathSegment[] {
  const cx = x + width / 2;
  const cy = y + height / 2;
  if (key.includes("Home"))
    return polygon([
      [cx, y + height * 0.25],
      [x + width * 0.72, cy],
      [x + width * 0.72, y + height * 0.75],
      [x + width * 0.28, y + height * 0.75],
      [x + width * 0.28, cy],
    ]);
  if (key.includes("Help")) {
    return ellipseSegments(cx, cy, width * 0.12, height * 0.12);
  }
  if (key.includes("Information")) {
    return rectSegments(
      cx - width * 0.04,
      y + height * 0.34,
      width * 0.08,
      height * 0.38,
    );
  }
  if (key.includes("Sound"))
    return polygon([
      [x + width * 0.3, cy],
      [x + width * 0.45, y + height * 0.35],
      [x + width * 0.45, y + height * 0.65],
    ]);
  if (
    key.includes("Back") ||
    key.includes("Beginning") ||
    key.includes("Return")
  ) {
    return resolvePreset(
      "leftArrow",
      x + width * 0.28,
      y + height * 0.3,
      width * 0.45,
      height * 0.4,
    );
  }
  return resolvePreset(
    "rightArrow",
    x + width * 0.28,
    y + height * 0.3,
    width * 0.45,
    height * 0.4,
  );
}

function waveBottomRect(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    { type: "move", x, y },
    { type: "line", x: x + width, y },
    { type: "line", x: x + width, y: y + height * 0.82 },
    {
      type: "cubic",
      x1: x + width * 0.75,
      y1: y + height,
      x2: x + width * 0.25,
      y2: y + height * 0.64,
      x,
      y: y + height * 0.82,
    },
    { type: "close" },
  ];
}
