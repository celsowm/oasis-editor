import type { PresetPathSegment, PresetSegmentResolver } from "./types.js";
import {
  arcSegments,
  ellipseSegments,
  polygon,
  rectSegments,
  roundRectSegments,
  starSegments,
} from "./primitives.js";

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

export function blockArcSegments(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): PresetPathSegment[] {
  const outer = arcSegments(cx, cy, rx, ry, -45, 250);
  const inner = arcSegments(cx, cy, rx * 0.58, ry * 0.58, 250, -45).reverse();
  return [...outer, ...inner.slice(1), { type: "close" }];
}

export function plusSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return polygon([
    [x + width * 0.38, y],
    [x + width * 0.62, y],
    [x + width * 0.62, y + height * 0.38],
    [x + width, y + height * 0.38],
    [x + width, y + height * 0.62],
    [x + width * 0.62, y + height * 0.62],
    [x + width * 0.62, y + height],
    [x + width * 0.38, y + height],
    [x + width * 0.38, y + height * 0.62],
    [x, y + height * 0.62],
    [x, y + height * 0.38],
    [x + width * 0.38, y + height * 0.38],
  ]);
}

export function xSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return polygon([
    [x + width * 0.18, y],
    [x + width * 0.5, y + height * 0.32],
    [x + width * 0.82, y],
    [x + width, y + height * 0.18],
    [x + width * 0.68, y + height * 0.5],
    [x + width, y + height * 0.82],
    [x + width * 0.82, y + height],
    [x + width * 0.5, y + height * 0.68],
    [x + width * 0.18, y + height],
    [x, y + height * 0.82],
    [x + width * 0.32, y + height * 0.5],
    [x, y + height * 0.18],
  ]);
}

export function mathDivideSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...ellipseSegments(
      x + width / 2,
      y + height * 0.22,
      width * 0.07,
      height * 0.07,
    ),
    ...rectSegments(
      x + width * 0.18,
      y + height * 0.46,
      width * 0.64,
      height * 0.08,
    ),
    ...ellipseSegments(
      x + width / 2,
      y + height * 0.78,
      width * 0.07,
      height * 0.07,
    ),
  ];
}

export function mathEqualSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...rectSegments(x, y + height * 0.3, width, height * 0.12),
    ...rectSegments(x, y + height * 0.58, width, height * 0.12),
  ];
}

export function mathNotEqualSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...mathEqualSegments(x, y, width, height),
    ...polygon([
      [x + width * 0.62, y],
      [x + width * 0.74, y],
      [x + width * 0.38, y + height],
      [x + width * 0.26, y + height],
    ]),
  ];
}

export function heartSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  const cx = x + width / 2;
  return [
    { type: "move", x: cx, y: y + height * 0.9 },
    {
      type: "cubic",
      x1: x - width * 0.12,
      y1: y + height * 0.45,
      x2: x + width * 0.08,
      y2: y,
      x: cx,
      y: y + height * 0.28,
    },
    {
      type: "cubic",
      x1: x + width * 0.92,
      y1: y,
      x2: x + width * 1.12,
      y2: y + height * 0.45,
      x: cx,
      y: y + height * 0.9,
    },
    { type: "close" },
  ];
}

export function cloudSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...ellipseSegments(
      x + width * 0.28,
      y + height * 0.58,
      width * 0.24,
      height * 0.23,
    ),
    ...ellipseSegments(
      x + width * 0.48,
      y + height * 0.42,
      width * 0.28,
      height * 0.28,
    ),
    ...ellipseSegments(
      x + width * 0.7,
      y + height * 0.58,
      width * 0.25,
      height * 0.24,
    ),
  ];
}

export function moonSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    { type: "move", x: x + width * 0.68, y },
    {
      type: "cubic",
      x1: x + width * 0.22,
      y1: y + height * 0.06,
      x2: x + width * 0.18,
      y2: y + height * 0.94,
      x: x + width * 0.68,
      y: y + height,
    },
    {
      type: "cubic",
      x1: x + width * 0.42,
      y1: y + height * 0.72,
      x2: x + width * 0.42,
      y2: y + height * 0.28,
      x: x + width * 0.68,
      y,
    },
    { type: "close" },
  ];
}

export function smileySegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...ellipseSegments(x + width / 2, y + height / 2, width / 2, height / 2),
    ...ellipseSegments(
      x + width * 0.35,
      y + height * 0.38,
      width * 0.05,
      height * 0.05,
    ),
    ...ellipseSegments(
      x + width * 0.65,
      y + height * 0.38,
      width * 0.05,
      height * 0.05,
    ),
    ...arcSegments(
      x + width / 2,
      y + height * 0.52,
      width * 0.24,
      height * 0.18,
      20,
      160,
    ),
  ];
}

export function teardropSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    { type: "move", x: x + width * 0.55, y },
    {
      type: "cubic",
      x1: x + width,
      y1: y + height * 0.22,
      x2: x + width * 0.95,
      y2: y + height,
      x: x + width * 0.35,
      y: y + height,
    },
    {
      type: "cubic",
      x1: x - width * 0.1,
      y1: y + height * 0.66,
      x2: x + width * 0.16,
      y2: y + height * 0.12,
      x: x + width * 0.55,
      y,
    },
    { type: "close" },
  ];
}

export function noSmokingSegments(
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  return [
    ...ellipseSegments(x + width / 2, y + height / 2, width / 2, height / 2),
    ...polygon([
      [x + width * 0.18, y + height * 0.1],
      [x + width * 0.28, y],
      [x + width * 0.82, y + height * 0.9],
      [x + width * 0.72, y + height],
    ]),
  ];
}

export function donutSegments(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): PresetPathSegment[] {
  return [
    ...ellipseSegments(cx, cy, rx, ry),
    ...ellipseSegments(cx, cy, rx * 0.52, ry * 0.52),
  ];
}

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
