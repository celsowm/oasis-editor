import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorBlockNode,
  EditorImageFloatingLayout,
  EditorTextBoxBody,
  EditorTextBoxData,
  EditorTextBoxShape,
} from "../../../core/model.js";
import { getAttributeValue, findElementDeep } from "../xmlHelpers.js";
import type { ParseNestedBlocks } from "./types.js";
import {
  EMU_PER_PT,
  OOXML_ROTATION_UNITS,
  emuToPx,
  parseOptionalInt,
  normalizeHexColor,
} from "./units.js";

const EMU_DEFAULT_TEXTBOX_SIZE_PX = 300;

function findDrawingContainer(
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

function parseAnchorBoolean(
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

function parseAnchorPosition(
  anchor: XmlElement,
  localName: "positionH" | "positionV",
): { relativeFrom?: string; align?: string; offset?: number } | undefined {
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

function parseAnchorWrap(
  anchor: XmlElement,
): EditorImageFloatingLayout["wrap"] {
  if (findElementDeep(anchor, "wrapSquare")) return "square";
  if (findElementDeep(anchor, "wrapTight")) return "tight";
  if (findElementDeep(anchor, "wrapThrough")) return "through";
  if (findElementDeep(anchor, "wrapTopAndBottom")) return "topAndBottom";
  if (findElementDeep(anchor, "wrapNone")) return "none";
  return undefined;
}

function parseFloatingLayout(
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

function parseTextBoxShape(wsp: XmlElement): EditorTextBoxShape | undefined {
  const spPr = findElementDeep(wsp, "spPr");
  if (!spPr) {
    return undefined;
  }
  const shape: EditorTextBoxShape = {};
  const prstGeom = findElementDeep(spPr, "prstGeom");
  const preset = prstGeom?.getAttribute("prst");
  if (preset) {
    shape.preset = preset;
  }
  for (let i = 0; i < spPr.childNodes.length; i += 1) {
    const child = spPr.childNodes[i];
    if (child?.nodeType !== child.ELEMENT_NODE) continue;
    const el = child as XmlElement;
    if (el.localName === "solidFill") {
      const fill = normalizeHexColor(
        findElementDeep(el, "srgbClr")?.getAttribute("val"),
      );
      if (fill) shape.fill = fill;
    } else if (el.localName === "ln") {
      const width = parseOptionalInt(el.getAttribute("w"));
      if (width !== undefined) {
        shape.borderWidthPt = Math.round((width / EMU_PER_PT) * 100) / 100;
      }
      const color = normalizeHexColor(
        findElementDeep(el, "srgbClr")?.getAttribute("val"),
      );
      if (color) shape.borderColor = color;
    }
  }
  return Object.keys(shape).length > 0 ? shape : undefined;
}

/** Read shape rotation from `wps:spPr/a:xfrm/@rot` (1/60000°), in degrees. */
function parseTextBoxRotation(wsp: XmlElement): number | undefined {
  const spPr = findElementDeep(wsp, "spPr");
  if (!spPr) {
    return undefined;
  }
  const xfrm = findElementDeep(spPr, "xfrm");
  const rot = parseOptionalInt(xfrm?.getAttribute("rot"));
  if (rot === undefined || rot === 0) {
    return undefined;
  }
  return (
    ((Math.round(rot / OOXML_ROTATION_UNITS) % 360) + 360) % 360 || undefined
  );
}

function parseTextBoxBody(wsp: XmlElement): EditorTextBoxBody | undefined {
  const bodyPr = findElementDeep(wsp, "bodyPr");
  if (!bodyPr) {
    return undefined;
  }
  const body: EditorTextBoxBody = {};
  const left = emuToPx(bodyPr.getAttribute("lIns"));
  const top = emuToPx(bodyPr.getAttribute("tIns"));
  const right = emuToPx(bodyPr.getAttribute("rIns"));
  const bottom = emuToPx(bodyPr.getAttribute("bIns"));
  if (left !== undefined) body.paddingLeft = left;
  if (top !== undefined) body.paddingTop = top;
  if (right !== undefined) body.paddingRight = right;
  if (bottom !== undefined) body.paddingBottom = bottom;
  const anchor = bodyPr.getAttribute("anchor");
  if (anchor) body.anchor = anchor;
  const wrap = bodyPr.getAttribute("wrap");
  if (wrap) body.wrap = wrap;
  const vert = bodyPr.getAttribute("vert");
  if (vert === "vert" || vert === "vert270" || vert === "wordArtVert") {
    body.vert = vert;
  }
  if (findElementDeep(bodyPr, "spAutoFit")) body.autoFit = true;
  return Object.keys(body).length > 0 ? body : undefined;
}

export async function parseTextBox(
  drawing: XmlElement,
  parseNestedBlocks: ParseNestedBlocks | undefined,
): Promise<EditorTextBoxData | undefined> {
  const wsp = findElementDeep(drawing, "wsp");
  if (!wsp) {
    return undefined;
  }
  const txbxContent = findElementDeep(wsp, "txbxContent");
  if (!txbxContent) {
    return undefined;
  }

  const container = findDrawingContainer(drawing);
  const drawingBox = container?.element ?? drawing;
  const extent = findElementDeep(drawingBox, "extent");
  const width =
    emuToPx(extent?.getAttribute("cx")) ?? EMU_DEFAULT_TEXTBOX_SIZE_PX;
  const height =
    emuToPx(extent?.getAttribute("cy")) ?? EMU_DEFAULT_TEXTBOX_SIZE_PX;

  const docPr = findElementDeep(drawingBox, "docPr");
  const name = docPr ? getAttributeValue(docPr, "name") : null;
  const alt = docPr
    ? (getAttributeValue(docPr, "descr") ?? getAttributeValue(docPr, "title"))
    : null;

  const floating =
    container?.kind === "anchor"
      ? parseFloatingLayout(container.element)
      : undefined;

  const blocks = parseNestedBlocks ? await parseNestedBlocks(txbxContent) : [];
  const shape = parseTextBoxShape(wsp);
  const body = parseTextBoxBody(wsp);
  const rotation = parseTextBoxRotation(wsp);

  return {
    width,
    height,
    blocks,
    ...(floating ? { floating } : {}),
    ...(rotation !== undefined ? { rotation } : {}),
    ...(name ? { name } : {}),
    ...(alt ? { alt } : {}),
    ...(shape ? { shape } : {}),
    ...(body ? { body } : {}),
  };
}

export function resolveAlternateContentDrawing(
  alternateContent: XmlElement,
): XmlElement | undefined {
  let firstChoiceDrawing: XmlElement | undefined;
  for (let i = 0; i < alternateContent.childNodes.length; i += 1) {
    const node = alternateContent.childNodes[i];
    if (node?.nodeType !== node.ELEMENT_NODE) continue;
    const el = node as XmlElement;
    if (el.localName !== "Choice") continue;
    const drawing = findElementDeep(el, "drawing");
    if (!drawing) continue;
    if (firstChoiceDrawing === undefined) {
      firstChoiceDrawing = drawing;
    }
    const requires = el.getAttribute("Requires") ?? "";
    if (/\bwps\b/.test(requires)) {
      return drawing;
    }
  }
  return firstChoiceDrawing;
}
