import { isPresetGeometrySupported } from "./catalog.js";
import {
  actionButtonSegments,
  arrowSegments,
  bevelSegments,
  blockArcSegments,
  braceSegments,
  bracketSegments,
  calloutSegments,
  canSegments,
  cloudSegments,
  connectorSegments,
  cornerSegments,
  cubeSegments,
  donutSegments,
  flowChartSegments,
  foldedCornerSegments,
  frameSegments,
  halfFrameSegments,
  heartSegments,
  mathDivideSegments,
  mathEqualSegments,
  mathNotEqualSegments,
  mixedRectSegments,
  moonSegments,
  noSmokingSegments,
  plaqueSegments,
  plusSegments,
  ribbonSegments,
  scrollSegments,
  smileySegments,
  snipRectSegments,
  snipRoundRectSegments,
  tabbedRectSegments,
  teardropSegments,
  waveSegments,
  xSegments,
} from "./families.js";
import {
  arcSegments,
  ellipseSegments,
  pieSegments,
  polygon,
  rectSegments,
  regularPolygon,
  roundRectSegments,
  starPointCount,
  starSegments,
} from "./primitives.js";
import type { PresetPathSegment } from "./types.js";

function resolvePresetPathSegments(
  preset: string,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  const right = x + width;
  const bottom = y + height;
  const cx = x + width / 2;
  const cy = y + height / 2;

  if (/Connector\d$/.test(preset) || preset === "straightConnector1") {
    return connectorSegments(preset, x, y, width, height);
  }
  if (/Callout\d$/.test(preset) || /Callout$/.test(preset)) {
    return calloutSegments(preset, x, y, width, height);
  }
  if (/Arrow/.test(preset) || preset === "swooshArrow") {
    return arrowSegments(preset, x, y, width, height);
  }
  if (/^star\d+$/.test(preset)) {
    return starSegments(
      cx,
      cy,
      width * 0.48,
      height * 0.48,
      starPointCount(preset),
    );
  }
  if (/^flowChart/.test(preset)) {
    return flowChartSegments(
      preset,
      x,
      y,
      width,
      height,
      resolvePresetPathSegments,
    );
  }
  if (/^actionButton/.test(preset)) {
    return actionButtonSegments(
      preset,
      x,
      y,
      width,
      height,
      resolvePresetPathSegments,
    );
  }

  switch (preset) {
    case "line":
      return [
        { type: "move", x, y },
        { type: "line", x: right, y: bottom },
      ];
    case "lineInv":
      return [
        { type: "move", x, y: bottom },
        { type: "line", x: right, y },
      ];
    case "arc":
      return arcSegments(cx, cy, width / 2, height / 2, 200, 340);
    case "blockArc":
      return blockArcSegments(cx, cy, width / 2, height / 2);
    case "chord":
      return [
        ...arcSegments(cx, cy, width / 2, height / 2, 210, 330),
        { type: "close" },
      ];
    case "pie":
      return pieSegments(cx, cy, width / 2, height / 2, -90, 45);
    case "pieWedge":
      return pieSegments(cx, cy, width / 2, height / 2, -35, 55);
    case "roundRect":
      return roundRectSegments(
        x,
        y,
        width,
        height,
        Math.min(width, height) * 0.12,
      );
    case "round1Rect":
      return mixedRectSegments(x, y, width, height, true, false, false, false);
    case "round2SameRect":
      return mixedRectSegments(x, y, width, height, true, false, true, false);
    case "round2DiagRect":
      return mixedRectSegments(x, y, width, height, true, false, false, true);
    case "snipRoundRect":
      return snipRoundRectSegments(x, y, width, height);
    case "snip1Rect":
      return snipRectSegments(x, y, width, height, true, false, false, false);
    case "snip2SameRect":
      return snipRectSegments(x, y, width, height, true, true, false, false);
    case "snip2DiagRect":
      return snipRectSegments(x, y, width, height, true, false, true, false);
    case "ellipse":
      return ellipseSegments(cx, cy, width / 2, height / 2);
    case "triangle":
      return polygon([
        [cx, y],
        [right, bottom],
        [x, bottom],
      ]);
    case "rtTriangle":
      return polygon([
        [x, y],
        [x, bottom],
        [right, bottom],
      ]);
    case "diamond":
      return polygon([
        [cx, y],
        [right, cy],
        [cx, bottom],
        [x, cy],
      ]);
    case "parallelogram":
      return polygon([
        [x + width * 0.22, y],
        [right, y],
        [right - width * 0.22, bottom],
        [x, bottom],
      ]);
    case "trapezoid":
      return polygon([
        [x + width * 0.2, y],
        [right - width * 0.2, y],
        [right, bottom],
        [x, bottom],
      ]);
    case "nonIsoscelesTrapezoid":
      return polygon([
        [x + width * 0.08, y],
        [right - width * 0.28, y],
        [right, bottom],
        [x, bottom],
      ]);
    case "pentagon":
      return regularPolygon(cx, cy, width * 0.48, height * 0.48, 5, -90);
    case "hexagon":
      return regularPolygon(cx, cy, width * 0.48, height * 0.48, 6, 0);
    case "heptagon":
      return regularPolygon(cx, cy, width * 0.48, height * 0.48, 7, -90);
    case "octagon":
      return regularPolygon(cx, cy, width * 0.48, height * 0.48, 8, 22.5);
    case "decagon":
      return regularPolygon(cx, cy, width * 0.48, height * 0.48, 10, -90);
    case "dodecagon":
      return regularPolygon(cx, cy, width * 0.48, height * 0.48, 12, -90);
    case "homePlate":
      return polygon([
        [x, y],
        [right - width * 0.22, y],
        [right, cy],
        [right - width * 0.22, bottom],
        [x, bottom],
      ]);
    case "chevron":
      return polygon([
        [x, y],
        [right - width * 0.28, y],
        [right, cy],
        [right - width * 0.28, bottom],
        [x, bottom],
        [x + width * 0.28, cy],
      ]);
    case "heart":
      return heartSegments(x, y, width, height);
    case "cloud":
      return cloudSegments(x, y, width, height);
    case "sun":
      return starSegments(cx, cy, width * 0.48, height * 0.48, 16, 0.72);
    case "moon":
      return moonSegments(x, y, width, height);
    case "smileyFace":
      return smileySegments(x, y, width, height);
    case "lightningBolt":
      return polygon([
        [x + width * 0.58, y],
        [x + width * 0.28, y + height * 0.44],
        [x + width * 0.48, y + height * 0.44],
        [x + width * 0.36, bottom],
        [x + width * 0.74, y + height * 0.36],
        [x + width * 0.52, y + height * 0.36],
      ]);
    case "teardrop":
      return teardropSegments(x, y, width, height);
    case "noSmoking":
      return noSmokingSegments(x, y, width, height);
    case "donut":
      return donutSegments(cx, cy, width / 2, height / 2);
    case "can":
      return canSegments(x, y, width, height);
    case "cube":
      return cubeSegments(x, y, width, height);
    case "bevel":
      return bevelSegments(x, y, width, height);
    case "foldedCorner":
      return foldedCornerSegments(x, y, width, height);
    case "frame":
      return frameSegments(x, y, width, height);
    case "halfFrame":
      return halfFrameSegments(x, y, width, height);
    case "corner":
      return cornerSegments(x, y, width, height);
    case "diagStripe":
      return polygon([
        [x + width * 0.25, y],
        [right, y],
        [right - width * 0.25, bottom],
        [x, bottom],
      ]);
    case "plaque":
      return plaqueSegments(x, y, width, height);
    case "plaqueTabs":
    case "squareTabs":
    case "cornerTabs":
      return tabbedRectSegments(preset, x, y, width, height);
    case "irregularSeal1":
      return starSegments(cx, cy, width * 0.48, height * 0.48, 18, 0.78);
    case "irregularSeal2":
      return starSegments(cx, cy, width * 0.48, height * 0.48, 14, 0.68);
    case "gear6":
      return starSegments(cx, cy, width * 0.48, height * 0.48, 12, 0.76);
    case "gear9":
      return starSegments(cx, cy, width * 0.48, height * 0.48, 18, 0.76);
    case "funnel":
      return polygon([
        [x, y],
        [right, y],
        [x + width * 0.6, y + height * 0.56],
        [x + width * 0.6, bottom],
        [x + width * 0.4, bottom],
        [x + width * 0.4, y + height * 0.56],
      ]);
    case "leftBrace":
    case "rightBrace":
    case "bracePair":
      return braceSegments(preset, x, y, width, height);
    case "leftBracket":
    case "rightBracket":
    case "bracketPair":
      return bracketSegments(preset, x, y, width, height);
    case "mathPlus":
      return plusSegments(x, y, width, height);
    case "mathMinus":
      return polygon([
        [x, y + height * 0.42],
        [right, y + height * 0.42],
        [right, y + height * 0.58],
        [x, y + height * 0.58],
      ]);
    case "mathMultiply":
      return xSegments(x, y, width, height);
    case "mathDivide":
      return mathDivideSegments(x, y, width, height);
    case "mathEqual":
      return mathEqualSegments(x, y, width, height);
    case "mathNotEqual":
      return mathNotEqualSegments(x, y, width, height);
    case "chartPlus":
      return plusSegments(x, y, width, height);
    case "chartX":
      return xSegments(x, y, width, height);
    case "chartStar":
      return starSegments(cx, cy, width * 0.48, height * 0.48, 5);
    case "ribbon":
    case "ribbon2":
    case "ellipseRibbon":
    case "ellipseRibbon2":
    case "leftRightRibbon":
      return ribbonSegments(preset, x, y, width, height);
    case "verticalScroll":
    case "horizontalScroll":
      return scrollSegments(preset, x, y, width, height);
    case "wave":
    case "doubleWave":
      return waveSegments(preset, x, y, width, height);
    case "rect":
    default:
      return rectSegments(x, y, width, height);
  }
}

export function getPresetPathSegments(
  preset: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): PresetPathSegment[] {
  const key: string = isPresetGeometrySupported(preset) ? preset! : "rect";
  return resolvePresetPathSegments(key, x, y, width, height);
}
