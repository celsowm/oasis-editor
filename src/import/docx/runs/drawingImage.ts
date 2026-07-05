import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorImageRunData } from "@/core/model.js";
import {
  getAttributeValue,
  findElementDeep,
} from "@/import/docx/xmlHelpers.js";
import { type AssetRegistry } from "@/import/docx/assetRegistry.js";
import {
  EMU_PER_PX,
  OOXML_PERCENT_DENOMINATOR,
  OOXML_ROTATION_UNITS,
  parseOptionalInt,
} from "./units.js";
import {
  isAbsoluteUri,
  parseBlipRels,
  loadEmbeddedImage,
} from "./relationships.js";
import {
  findDrawingContainer,
  parseFloatingLayout,
} from "./drawingAnchorLayout.js";

function parseSrcRect(picPic: XmlElement): EditorImageRunData["crop"] {
  const srcRect = findElementDeep(picPic, "srcRect");
  if (!srcRect) {
    return undefined;
  }
  const toFraction = (name: string): number | undefined => {
    const raw = srcRect.getAttribute(name);
    if (raw === null || raw === "") {
      return undefined;
    }
    const value = parseInt(raw, 10);
    if (!Number.isFinite(value) || value === 0) {
      return undefined;
    }
    return value / OOXML_PERCENT_DENOMINATOR;
  };
  const crop = {
    left: toFraction("l"),
    top: toFraction("t"),
    right: toFraction("r"),
    bottom: toFraction("b"),
  };
  if (
    crop.left === undefined &&
    crop.top === undefined &&
    crop.right === undefined &&
    crop.bottom === undefined
  ) {
    return undefined;
  }
  return crop;
}

/** OOXML wrap polygons use a 0..21600 normalized coordinate space. */
const WRAP_POLYGON_DENOMINATOR = 21600;

function parseWrapPolygon(
  anchor: XmlElement,
): EditorImageRunData["wrapPolygon"] | undefined {
  const polygon = findElementDeep(anchor, "wrapPolygon");
  if (!polygon) {
    return undefined;
  }
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < polygon.childNodes.length; index += 1) {
    const node = polygon.childNodes[index];
    if (node?.nodeType !== 1) continue;
    const el = node as XmlElement;
    if (el.localName !== "start" && el.localName !== "lineTo") continue;
    const x = parseOptionalInt(el.getAttribute("x"));
    const y = parseOptionalInt(el.getAttribute("y"));
    if (x === undefined || y === undefined) continue;
    points.push({
      x: x / WRAP_POLYGON_DENOMINATOR,
      y: y / WRAP_POLYGON_DENOMINATOR,
    });
  }
  // OOXML closes the loop by repeating the start point as the final lineTo.
  if (points.length >= 2) {
    const first = points[0]!;
    const last = points[points.length - 1]!;
    if (
      Math.abs(first.x - last.x) < 1e-6 &&
      Math.abs(first.y - last.y) < 1e-6
    ) {
      points.pop();
    }
  }
  return points.length >= 3 ? points : undefined;
}

function parseFillMode(picPic: XmlElement): EditorImageRunData["fillMode"] {
  if (findElementDeep(picPic, "tile")) {
    return "tile";
  }
  return undefined;
}

function parseXfrm(picPic: XmlElement): {
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
} {
  const xfrm = findElementDeep(picPic, "xfrm");
  if (!xfrm) {
    return {};
  }
  const result: { rotation?: number; flipH?: boolean; flipV?: boolean } = {};
  const rot = xfrm.getAttribute("rot");
  if (rot) {
    const value = parseInt(rot, 10);
    if (Number.isFinite(value) && value !== 0) {
      result.rotation = value / OOXML_ROTATION_UNITS;
    }
  }
  const flipH = xfrm.getAttribute("flipH");
  if (flipH === "1" || flipH === "true") {
    result.flipH = true;
  }
  const flipV = xfrm.getAttribute("flipV");
  if (flipV === "1" || flipV === "true") {
    result.flipV = true;
  }
  return result;
}

export async function parseDrawingImage(
  drawing: XmlElement,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
): Promise<
  | { image: EditorImageRunData; text: string }
  | { image: undefined; text: string; textBox?: undefined }
> {
  const blip = findElementDeep(drawing, "blip");
  if (!blip) {
    return { text: "", image: undefined };
  }

  const { embed, link } = parseBlipRels(blip);
  const container = findDrawingContainer(drawing);
  const drawingBox = container?.element ?? drawing;
  const extent = findElementDeep(drawingBox, "extent");
  const docPr = findElementDeep(drawingBox, "docPr");

  let width = 300;
  let height = 300;
  if (extent) {
    const cx = extent.getAttribute("cx");
    const cy = extent.getAttribute("cy");
    if (cx) width = Math.round(parseInt(cx, 10) / EMU_PER_PX);
    if (cy) height = Math.round(parseInt(cy, 10) / EMU_PER_PX);
  }

  const alt = docPr
    ? (getAttributeValue(docPr, "descr") ?? getAttributeValue(docPr, "title"))
    : null;

  const crop = parseSrcRect(drawing);
  const fillMode = parseFillMode(drawing);
  const xfrm = parseXfrm(drawing);
  const floating =
    container?.kind === "anchor"
      ? parseFloatingLayout(container.element)
      : undefined;
  const wrapPolygon =
    container?.kind === "anchor"
      ? parseWrapPolygon(container.element)
      : undefined;

  const common = {
    width,
    height,
    ...(alt !== null ? { alt } : {}),
    ...(crop ? { crop } : {}),
    ...(fillMode ? { fillMode } : {}),
    ...(xfrm.rotation !== undefined ? { rotation: xfrm.rotation } : {}),
    ...(xfrm.flipH ? { flipH: true } : {}),
    ...(xfrm.flipV ? { flipV: true } : {}),
    ...(floating ? { floating } : {}),
    ...(wrapPolygon ? { wrapPolygon } : {}),
  };

  const embedTarget = embed ? relsMap.get(embed) : undefined;
  const linkTarget = link ? relsMap.get(link) : undefined;

  if (linkTarget && isAbsoluteUri(linkTarget)) {
    return {
      text: "\uFFFC",
      image: { src: "", linkedSrc: linkTarget, ...common },
    };
  }

  const target = embedTarget ?? linkTarget;
  if (target) {
    const assetSrc = await loadEmbeddedImage(zip, assets, target);
    if (assetSrc) {
      return {
        text: "\uFFFC",
        image: { src: assetSrc, ...common },
      };
    }
  }

  return { text: "", image: undefined };
}
