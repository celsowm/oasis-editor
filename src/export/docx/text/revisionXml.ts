import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type {
  EditorRevision,
  EditorRevisionMetadata,
  EditorRunBase,
} from "@/core/model.js";
import { escapeXml, WORD_NS } from "@/export/docx/xmlUtils.js";

const WRAPPER_XMLNS =
  `xmlns:oasis="urn:oasis:docx" xmlns:w="${WORD_NS}" ` +
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ' +
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" ' +
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';

function elementChildren(element: XmlElement): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE) {
      result.push(child as XmlElement);
    }
  }
  return result;
}

function parseSingleRun(xml: string): XmlElement | undefined {
  const wrapper = new DOMParser().parseFromString(
    `<oasis:root ${WRAPPER_XMLNS}>${xml}</oasis:root>`,
    "application/xml",
  ).documentElement as XmlElement | undefined;
  if (!wrapper) return undefined;
  const children = elementChildren(wrapper);
  if (children.length !== 1) return undefined;
  const run = children[0]!;
  return run.namespaceURI === WORD_NS && run.localName === "r"
    ? run
    : undefined;
}

function replaceWordChildName(
  parent: XmlElement,
  source: XmlElement,
  targetLocalName: string,
): void {
  const ownerDocument = parent.ownerDocument;
  if (!ownerDocument) return;
  const replacement = ownerDocument.createElementNS(
    WORD_NS,
    `w:${targetLocalName}`,
  );
  for (let index = 0; index < source.attributes.length; index += 1) {
    const attribute = source.attributes.item(index);
    if (!attribute) continue;
    if (attribute.namespaceURI) {
      replacement.setAttributeNS(
        attribute.namespaceURI,
        attribute.name,
        attribute.value,
      );
    } else {
      replacement.setAttribute(attribute.name, attribute.value);
    }
  }
  while (source.firstChild) {
    replacement.appendChild(source.firstChild);
  }
  parent.replaceChild(replacement, source);
}

/**
 * Word stores visible text from deletion-like revisions in `w:delText` and
 * deleted field instructions in `w:delInstrText`. Canonical run generation uses
 * the ordinary tags, so normalize only direct run children here. If a source
 * overlay retained stale deleted-text children after an edit, the generated
 * ordinary child is authoritative and the stale counterpart is removed first.
 */
export function serializeDeletionRunContent(xml: string): string {
  const run = parseSingleRun(xml);
  if (!run) return xml;

  const children = elementChildren(run);
  const generatedText = children.filter(
    (child): boolean =>
      child.namespaceURI === WORD_NS && child.localName === "t",
  );
  if (generatedText.length > 0) {
    for (const child of children) {
      if (child.namespaceURI === WORD_NS && child.localName === "delText") {
        run.removeChild(child);
      }
    }
    for (const child of generatedText) {
      replaceWordChildName(run, child, "delText");
    }
  }

  const refreshed = elementChildren(run);
  const generatedInstructions = refreshed.filter(
    (child): boolean =>
      child.namespaceURI === WORD_NS && child.localName === "instrText",
  );
  if (generatedInstructions.length > 0) {
    for (const child of refreshed) {
      if (
        child.namespaceURI === WORD_NS &&
        child.localName === "delInstrText"
      ) {
        run.removeChild(child);
      }
    }
    for (const child of generatedInstructions) {
      replaceWordChildName(run, child, "delInstrText");
    }
  }

  return new XMLSerializer().serializeToString(run);
}

function revisionNumericId(id: string): string {
  if (/^\d+$/.test(id)) return id;
  return String(
    Array.from(id).reduce(
      (hash, character): number => (hash * 31 + character.charCodeAt(0)) >>> 0,
      0,
    ),
  );
}

export function serializeRevisionMetadataAttributes(
  revision: EditorRevisionMetadata,
): string {
  const date = Number.isFinite(revision.date)
    ? new Date(revision.date).toISOString()
    : new Date(0).toISOString();
  return (
    `w:id="${revisionNumericId(revision.id)}" ` +
    `w:author="${escapeXml(revision.author)}" ` +
    `w:date="${date}"`
  );
}

function revisionElementName(revision: EditorRevision): string {
  if (revision.move === "from") return "moveFrom";
  if (revision.move === "to") return "moveTo";
  return revision.type === "delete" ? "del" : "ins";
}

export function serializeRunRevisionWrapper(
  innerXml: string,
  revision: EditorRevision,
): string {
  const attributes = serializeRevisionMetadataAttributes(revision);
  const element = revisionElementName(revision);
  return `<w:${element} ${attributes}>${innerXml}</w:${element}>`;
}

type MoveRangeMarker = NonNullable<EditorRunBase["revisionRangeMarker"]>;

/** Serializes a zero-length move source/destination container boundary. */
export function serializeMoveRangeMarker(marker: MoveRangeMarker): string {
  const element = `move${marker.move === "from" ? "From" : "To"}Range${
    marker.edge === "start" ? "Start" : "End"
  }`;
  const attributes: string[] = [`w:id="${revisionNumericId(marker.id)}"`];

  if (marker.displacedByCustomXml !== undefined) {
    attributes.push(
      `w:displacedByCustomXml="${escapeXml(marker.displacedByCustomXml)}"`,
    );
  }
  if (marker.edge === "start") {
    if (marker.name !== undefined) {
      attributes.push(`w:name="${escapeXml(marker.name)}"`);
    }
    if (marker.author !== undefined) {
      attributes.push(`w:author="${escapeXml(marker.author)}"`);
    }
    if (marker.date !== undefined && Number.isFinite(marker.date)) {
      attributes.push(`w:date="${new Date(marker.date).toISOString()}"`);
    }
    if (marker.columnFirst !== undefined) {
      attributes.push(`w:colFirst="${Math.trunc(marker.columnFirst)}"`);
    }
    if (marker.columnLast !== undefined) {
      attributes.push(`w:colLast="${Math.trunc(marker.columnLast)}"`);
    }
  }

  return `<w:${element} ${attributes.join(" ")}/>`;
}
