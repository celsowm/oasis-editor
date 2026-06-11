import type {
  EditorImageFloatingLayout,
  EditorWrapPolygonPoint,
} from "../../../core/model.js";
import type { DocContext } from "../docxTypes.js";
import { escapeXml } from "../xmlUtils.js";
import {
  OOXML_PERCENT_DENOMINATOR,
  OOXML_ROTATION_UNITS,
} from "./constants.js";

export function buildXfrmAttrs(img: DocContext["images"][number]): string {
  let attrs = "";
  if (img.rotation) {
    const rot = Math.round(img.rotation * OOXML_ROTATION_UNITS);
    if (rot !== 0) {
      attrs += ` rot="${rot}"`;
    }
  }
  if (img.flipH) {
    attrs += ` flipH="1"`;
  }
  if (img.flipV) {
    attrs += ` flipV="1"`;
  }
  return attrs;
}

export function buildSrcRect(
  crop: DocContext["images"][number]["crop"],
): string {
  if (!crop) {
    return "";
  }
  const toUnits = (value: number | undefined): number =>
    value ? Math.round(value * OOXML_PERCENT_DENOMINATOR) : 0;
  const l = toUnits(crop.left);
  const t = toUnits(crop.top);
  const r = toUnits(crop.right);
  const b = toUnits(crop.bottom);
  if (l === 0 && t === 0 && r === 0 && b === 0) {
    return "";
  }
  return `<a:srcRect l="${l}" t="${t}" r="${r}" b="${b}"/>`;
}

function buildAnchorBool(
  value: boolean | undefined,
  fallback: boolean,
): string {
  return (value ?? fallback) ? "1" : "0";
}

function buildAnchorPositionXml(
  tagName: "positionH" | "positionV",
  position: EditorImageFloatingLayout["positionH"],
  fallbackRelativeFrom: string,
): string {
  const relativeFrom = escapeXml(
    position?.relativeFrom ?? fallbackRelativeFrom,
  );
  if (position?.align) {
    return `<wp:${tagName} relativeFrom="${relativeFrom}"><wp:align>${escapeXml(position.align)}</wp:align></wp:${tagName}>`;
  }
  const offset = position?.offset ?? 0;
  return `<wp:${tagName} relativeFrom="${relativeFrom}"><wp:posOffset>${offset}</wp:posOffset></wp:${tagName}>`;
}

/** OOXML wrap polygons use a 0..21600 normalized coordinate space. */
const WRAP_POLYGON_DENOMINATOR = 21600;

function buildWrapPolygonXml(
  wrapPolygon: EditorWrapPolygonPoint[] | undefined,
): string {
  if (!wrapPolygon || wrapPolygon.length < 3) {
    return "";
  }
  const toUnit = (value: number): number =>
    Math.round(Math.min(1, Math.max(0, value)) * WRAP_POLYGON_DENOMINATOR);
  const point = (p: EditorWrapPolygonPoint, tag: "start" | "lineTo"): string =>
    `<wp:${tag} x="${toUnit(p.x)}" y="${toUnit(p.y)}"/>`;
  const first = wrapPolygon[0]!;
  const body = [
    point(first, "start"),
    ...wrapPolygon.slice(1).map((p) => point(p, "lineTo")),
    // Close the loop back to the start point.
    point(first, "lineTo"),
  ].join("");
  return `<wp:wrapPolygon edited="0">${body}</wp:wrapPolygon>`;
}

function buildAnchorWrapXml(
  wrap: EditorImageFloatingLayout["wrap"],
  wrapPolygon?: EditorWrapPolygonPoint[],
): string {
  switch (wrap) {
    case "square":
      return '<wp:wrapSquare wrapText="bothSides"/>';
    case "tight": {
      const polygon = buildWrapPolygonXml(wrapPolygon);
      return polygon
        ? `<wp:wrapTight wrapText="bothSides">${polygon}</wp:wrapTight>`
        : '<wp:wrapTight wrapText="bothSides"/>';
    }
    case "through": {
      const polygon = buildWrapPolygonXml(wrapPolygon);
      return polygon
        ? `<wp:wrapThrough wrapText="bothSides">${polygon}</wp:wrapThrough>`
        : '<wp:wrapThrough wrapText="bothSides"/>';
    }
    case "topAndBottom":
      return "<wp:wrapTopAndBottom/>";
    case "none":
    default:
      return "<wp:wrapNone/>";
  }
}

export function buildDrawingContainerXml(options: {
  cx: number;
  cy: number;
  floating: EditorImageFloatingLayout | undefined;
  docPrId: number;
  docPrName: string;
  altAttr: string;
  graphicXml: string;
  wrapPolygon?: EditorWrapPolygonPoint[];
}): string {
  const { cx, cy, floating, docPrId, docPrName, altAttr, graphicXml } = options;
  const name = escapeXml(docPrName);
  if (!floating) {
    return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="${name}"${altAttr}/>${graphicXml}</wp:inline></w:drawing>`;
  }

  const distT = floating.distT ?? 0;
  const distB = floating.distB ?? 0;
  const distL = floating.distL ?? 0;
  const distR = floating.distR ?? 0;
  const positionH = buildAnchorPositionXml(
    "positionH",
    floating.positionH,
    "column",
  );
  const positionV = buildAnchorPositionXml(
    "positionV",
    floating.positionV,
    "paragraph",
  );
  const wrap = buildAnchorWrapXml(floating.wrap, options.wrapPolygon);
  return `<w:drawing><wp:anchor distT="${distT}" distB="${distB}" distL="${distL}" distR="${distR}" simplePos="${buildAnchorBool(floating.simplePos, false)}" relativeHeight="${floating.relativeHeight ?? 0}" behindDoc="${buildAnchorBool(floating.behindDoc, false)}" locked="${buildAnchorBool(floating.locked, false)}" layoutInCell="${buildAnchorBool(floating.layoutInCell, true)}" allowOverlap="${buildAnchorBool(floating.allowOverlap, true)}"><wp:simplePos x="0" y="0"/>${positionH}${positionV}<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}<wp:docPr id="${docPrId}" name="${name}"${altAttr}/>${graphicXml}</wp:anchor></w:drawing>`;
}

export function buildDrawingXml(
  img: DocContext["images"][number],
  docPrId: number,
  altAttr: string,
  picXml: string,
): string {
  return buildDrawingContainerXml({
    cx: img.cx,
    cy: img.cy,
    floating: img.floating,
    docPrId,
    docPrName: "Picture",
    altAttr,
    graphicXml: picXml,
    wrapPolygon: img.wrapPolygon,
  });
}
