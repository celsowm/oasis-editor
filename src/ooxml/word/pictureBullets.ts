/**
 * `w:numPicBullet` parsing (ECMA-376 §17.9.27). A picture bullet is a VML
 * `w:pict` or DrawingML `w:drawing` stored in numbering.xml and referenced by
 * `w:lvlPicBulletId`. The relationship id is kept here so the importer can
 * resolve the image payload into `document.assets` before paragraphs are read.
 *
 * Pure: no DOM parser creation, no zip access, no UI and no clock.
 */
import type { Element as XmlElement } from "@xmldom/xmldom";
import type { EditorPictureBullet } from "@/core/model/types/primitives.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const VML_NS = "urn:schemas-microsoft-com:vml";
const DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const WP_NS =
  "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";

export interface ParsedPictureBullet {
  numPicBulletId: string;
  /** Relationship id from `r:id` / `r:embed`, unresolved at parse time. */
  relationshipId?: string;
  widthPx?: number;
  heightPx?: number;
  altText?: string;
}

function children(
  element: XmlElement | null,
  namespace: string,
  local: string,
): XmlElement[] {
  if (!element) return [];
  return Array.from(element.getElementsByTagNameNS(namespace, local));
}

function firstChild(
  element: XmlElement | null,
  namespace: string,
  local: string,
): XmlElement | null {
  return children(element, namespace, local)[0] ?? null;
}

function attribute(
  element: XmlElement | null,
  local: string,
): string | undefined {
  if (!element) return undefined;
  for (let index = 0; index < element.attributes.length; index += 1) {
    const candidate = element.attributes.item(index);
    if (candidate?.localName === local) return candidate.value;
  }
  return undefined;
}

function readVmlSize(node: XmlElement | null): {
  widthPx?: number;
  heightPx?: number;
} {
  const raw = attribute(node, "style") ?? "";
  const width = /(?:^|;)\s*width\s*:\s*([\d.]+)\s*px/i.exec(raw)?.[1];
  const height = /(?:^|;)\s*height\s*:\s*([\d.]+)\s*px/i.exec(raw)?.[1];
  return {
    ...(width && Number.isFinite(Number(width))
      ? { widthPx: Number(width) }
      : {}),
    ...(height && Number.isFinite(Number(height))
      ? { heightPx: Number(height) }
      : {}),
  };
}

function readDrawingSize(node: XmlElement | null): {
  widthPx?: number;
  heightPx?: number;
} {
  const extent = firstChild(node, WP_NS, "extent");
  const cx = Number(attribute(extent, "cx"));
  const cy = Number(attribute(extent, "cy"));
  return {
    ...(Number.isFinite(cx) && cx > 0 ? { widthPx: cx / 9525 } : {}),
    ...(Number.isFinite(cy) && cy > 0 ? { heightPx: cy / 9525 } : {}),
  };
}

export function parsePictureBullets(
  numbering: XmlElement,
): Map<string, ParsedPictureBullet> {
  const result = new Map<string, ParsedPictureBullet>();
  for (const definition of children(numbering, WORD_NS, "numPicBullet")) {
    const id = attribute(definition, "numPicBulletId");
    if (!id) continue;
    const pict = firstChild(definition, WORD_NS, "pict");
    const drawing = firstChild(definition, WORD_NS, "drawing");
    const relationshipId =
      attribute(firstChild(pict, VML_NS, "imagedata"), "id") ??
      attribute(firstChild(drawing, DRAWING_NS, "blip"), "embed");
    if (!relationshipId) continue;
    const shape = firstChild(pict, VML_NS, "shape");
    const alt = attribute(shape, "alt");
    result.set(id, {
      numPicBulletId: id,
      relationshipId,
      ...readVmlSize(shape),
      ...readDrawingSize(drawing),
      ...(alt ? { altText: alt } : {}),
    });
  }
  return result;
}

/** Attach the resolved asset reference to the parsed bullet definition. */
export function withResolvedPictureBullet(
  parsed: ParsedPictureBullet,
  src: string,
): EditorPictureBullet {
  return {
    numPicBulletId: parsed.numPicBulletId,
    src,
    ...(parsed.widthPx ? { widthPx: parsed.widthPx } : {}),
    ...(parsed.heightPx ? { heightPx: parsed.heightPx } : {}),
    ...(parsed.altText ? { altText: parsed.altText } : {}),
  };
}
