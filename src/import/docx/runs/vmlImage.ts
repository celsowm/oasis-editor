import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorImageRunData } from "../../../core/model.js";
import { getAttributeValue, findElementDeep } from "../xmlHelpers.js";
import { type AssetRegistry } from "../assetRegistry.js";
import {
  VML_FRACTION_DENOMINATOR,
  parseCssLengthToPx,
  parseOptionalInt,
} from "./units.js";
import { parseRelationshipId, loadEmbeddedImage } from "./relationships.js";

function parseVmlStyleDimensions(style: string | null | undefined): {
  width?: number;
  height?: number;
} {
  const result: { width?: number; height?: number } = {};
  if (!style) {
    return result;
  }
  for (const declaration of style.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 0) {
      continue;
    }
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    if (property === "width") {
      const width = parseCssLengthToPx(value);
      if (width !== null) {
        result.width = width;
      }
    } else if (property === "height") {
      const height = parseCssLengthToPx(value);
      if (height !== null) {
        result.height = height;
      }
    }
  }
  return result;
}

function parseVmlCropValue(
  value: string | null | undefined,
): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.endsWith("%")) {
    const percent = Number(trimmed.slice(0, -1));
    return Number.isFinite(percent) && percent !== 0
      ? percent / 100
      : undefined;
  }
  if (/f$/i.test(trimmed)) {
    const fraction = Number(trimmed.slice(0, -1));
    return Number.isFinite(fraction) && fraction !== 0
      ? fraction / VML_FRACTION_DENOMINATOR
      : undefined;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric !== 0
    ? numeric / VML_FRACTION_DENOMINATOR
    : undefined;
}

function parseVmlCrop(imageData: XmlElement): EditorImageRunData["crop"] {
  const crop = {
    left: parseVmlCropValue(getAttributeValue(imageData, "cropleft")),
    top: parseVmlCropValue(getAttributeValue(imageData, "croptop")),
    right: parseVmlCropValue(getAttributeValue(imageData, "cropright")),
    bottom: parseVmlCropValue(getAttributeValue(imageData, "cropbottom")),
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

export async function parseVmlImage(
  pictElement: XmlElement,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
): Promise<EditorImageRunData | undefined> {
  const imageData = findElementDeep(pictElement, "imagedata");
  if (!imageData) {
    return undefined;
  }
  const relId = parseRelationshipId(imageData);
  const target = relId ? relsMap.get(relId) : undefined;
  if (!target) {
    return undefined;
  }
  const shape = findElementDeep(pictElement, "shape");
  const dimensions = parseVmlStyleDimensions(
    shape?.getAttribute("style"),
  );
  const crop = parseVmlCrop(imageData);
  const alt =
    getAttributeValue(imageData, "title") ??
    imageData.getAttribute("o:title");
  const assetSrc = await loadEmbeddedImage(zip, assets, target);
  if (!assetSrc) {
    return undefined;
  }
  return {
    src: assetSrc,
    width: dimensions.width ?? 300,
    height: dimensions.height ?? 300,
    ...(alt ? { alt } : {}),
    ...(crop ? { crop } : {}),
  };
}
