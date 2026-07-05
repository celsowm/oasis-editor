import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorImageFloatingLayout,
  EditorImageFloatingPosition,
} from "@/core/model.js";
import { findElementDeep } from "@/import/docx/xmlHelpers.js";
import { parseOptionalInt } from "./units.js";

/** Shared by `<w:drawing>` images and text boxes: both nest an `inline` or `anchor` element. */
export function findDrawingContainer(
  drawing: XmlElement,
): { element: XmlElement; kind: "inline" | "anchor" } | undefined {
  for (let index = 0; index < drawing.childNodes.length; index += 1) {
    const node = drawing.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    const element = node as XmlElement;
    if (element.localName === "inline" || element.localName === "anchor") {
      return { element, kind: element.localName };
    }
  }
  return undefined;
}

export function parseAnchorBoolean(
  value: string | null | undefined,
): boolean | undefined {
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }
  return undefined;
}

export function parseAnchorPosition(
  anchor: XmlElement,
  localName: "positionH" | "positionV",
): EditorImageFloatingPosition | undefined {
  const element = findElementDeep(anchor, localName);
  if (!element) {
    return undefined;
  }
  const align = findElementDeep(element, "align")?.textContent?.trim();
  const offsetText = findElementDeep(element, "posOffset")?.textContent?.trim();
  const offset = parseOptionalInt(offsetText);
  const position = {
    relativeFrom: element.getAttribute("relativeFrom") ?? undefined,
    ...(align ? { align } : {}),
    ...(offset !== undefined ? { offset } : {}),
  };
  if (
    position.relativeFrom === undefined &&
    position.align === undefined &&
    position.offset === undefined
  ) {
    return undefined;
  }
  return position;
}

export function parseAnchorWrap(
  anchor: XmlElement,
): EditorImageFloatingLayout["wrap"] {
  if (findElementDeep(anchor, "wrapSquare")) return "square";
  if (findElementDeep(anchor, "wrapTight")) return "tight";
  if (findElementDeep(anchor, "wrapThrough")) return "through";
  if (findElementDeep(anchor, "wrapTopAndBottom")) return "topAndBottom";
  if (findElementDeep(anchor, "wrapNone")) return "none";
  return undefined;
}

export function parseFloatingLayout(
  anchor: XmlElement,
): EditorImageFloatingLayout | undefined {
  const positionH = parseAnchorPosition(anchor, "positionH");
  const positionV = parseAnchorPosition(anchor, "positionV");
  const wrap = parseAnchorWrap(anchor);
  const distT = parseOptionalInt(anchor.getAttribute("distT"));
  const distB = parseOptionalInt(anchor.getAttribute("distB"));
  const distL = parseOptionalInt(anchor.getAttribute("distL"));
  const distR = parseOptionalInt(anchor.getAttribute("distR"));
  const simplePos = parseAnchorBoolean(anchor.getAttribute("simplePos"));
  const relativeHeight = parseOptionalInt(
    anchor.getAttribute("relativeHeight"),
  );
  const behindDoc = parseAnchorBoolean(anchor.getAttribute("behindDoc"));
  const locked = parseAnchorBoolean(anchor.getAttribute("locked"));
  const layoutInCell = parseAnchorBoolean(anchor.getAttribute("layoutInCell"));
  const allowOverlap = parseAnchorBoolean(anchor.getAttribute("allowOverlap"));
  return {
    type: "floating",
    ...(distT !== undefined ? { distT } : {}),
    ...(distB !== undefined ? { distB } : {}),
    ...(distL !== undefined ? { distL } : {}),
    ...(distR !== undefined ? { distR } : {}),
    ...(simplePos !== undefined ? { simplePos } : {}),
    ...(relativeHeight !== undefined ? { relativeHeight } : {}),
    ...(behindDoc !== undefined ? { behindDoc } : {}),
    ...(locked !== undefined ? { locked } : {}),
    ...(layoutInCell !== undefined ? { layoutInCell } : {}),
    ...(allowOverlap !== undefined ? { allowOverlap } : {}),
    ...(positionH ? { positionH } : {}),
    ...(positionV ? { positionV } : {}),
    ...(wrap ? { wrap } : {}),
  };
}
