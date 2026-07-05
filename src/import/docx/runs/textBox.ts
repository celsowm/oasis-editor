import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorTextBoxBody,
  EditorTextBoxData,
  EditorTextBoxShape,
} from "@/core/model.js";
import {
  getAttributeValue,
  findElementDeep,
} from "@/import/docx/xmlHelpers.js";
import type { ParseNestedBlocks } from "./types.js";
import {
  EMU_PER_PT,
  OOXML_ROTATION_UNITS,
  emuToPx,
  parseOptionalInt,
  normalizeHexColor,
} from "./units.js";
import {
  findDrawingContainer,
  parseFloatingLayout,
} from "./drawingAnchorLayout.js";
import { roundTo } from "@/utils/round.js";

const EMU_DEFAULT_TEXTBOX_SIZE_PX = 300;

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
        shape.borderWidthPt = roundTo(width / EMU_PER_PT, 2);
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

  const txbxContent = findElementDeep(wsp, "txbxContent");
  const blocks =
    txbxContent && parseNestedBlocks
      ? await parseNestedBlocks(txbxContent)
      : [];
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
