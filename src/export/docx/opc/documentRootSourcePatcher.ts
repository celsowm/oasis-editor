import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import type { EditorDocxSourcePackage } from "@/core/model.js";
import { WORD_NS } from "@/export/docx/xmlUtils.js";
import { mergeWordPartRootExtensionsFromSource } from "./wordPartRootSourcePatcher.js";

const REBUILT_MAIN_DOCUMENT_PATH = "word/document.xml";
const MODELED_BODY_WORD_CHILDREN = new Set(["p", "tbl", "sdt", "sectPr"]);

function elementChildren(node: XmlNode): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE) {
      result.push(child as XmlElement);
    }
  }
  return result;
}

function elementLocalName(element: XmlElement): string {
  return element.localName ?? element.tagName;
}

function elementKey(element: XmlElement): string {
  return `${element.namespaceURI ?? ""}\u0000${elementLocalName(element)}`;
}

function directWordChild(
  element: XmlElement,
  localName: string,
): XmlElement | undefined {
  return elementChildren(element).find(
    (child): boolean =>
      child.namespaceURI === WORD_NS && elementLocalName(child) === localName,
  );
}

function copyMissingAttributes(source: XmlElement, target: XmlElement): void {
  for (let index = 0; index < source.attributes.length; index += 1) {
    const attribute = source.attributes.item(index);
    if (!attribute) {
      continue;
    }
    const localName = attribute.localName ?? attribute.name;
    const exists = attribute.namespaceURI
      ? target.hasAttributeNS(attribute.namespaceURI, localName)
      : target.hasAttribute(attribute.name);
    if (exists) {
      continue;
    }
    if (attribute.namespaceURI) {
      target.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
    } else {
      target.setAttribute(attribute.name, attribute.value);
    }
  }
}

function isModeledBodyWordChild(element: XmlElement): boolean {
  return (
    element.namespaceURI === WORD_NS &&
    MODELED_BODY_WORD_CHILDREN.has(elementLocalName(element))
  );
}

function modeledBodyChildren(elements: XmlElement[]): XmlElement[] {
  return elements.filter(isModeledBodyWordChild);
}

function bodyTopologyIsStable(
  sourceChildren: XmlElement[],
  rebuiltChildren: XmlElement[],
): boolean {
  const sourceAnchors = modeledBodyChildren(sourceChildren);
  const rebuiltAnchors = modeledBodyChildren(rebuiltChildren);
  return (
    sourceAnchors.length === rebuiltAnchors.length &&
    sourceAnchors.every(
      (sourceAnchor, index): boolean =>
        elementLocalName(sourceAnchor) ===
        elementLocalName(rebuiltAnchors[index]!),
    )
  );
}

function anchorForSourceGap(
  sourceChildren: XmlElement[],
  sourceIndex: number,
  rebuiltChildren: XmlElement[],
): XmlElement | undefined {
  const sourceAnchors = modeledBodyChildren(sourceChildren);
  const rebuiltAnchors = modeledBodyChildren(rebuiltChildren);
  const nextSourceAnchor = sourceChildren
    .slice(sourceIndex + 1)
    .find(isModeledBodyWordChild);
  if (nextSourceAnchor) {
    const anchorIndex = sourceAnchors.indexOf(nextSourceAnchor);
    if (anchorIndex >= 0) {
      return rebuiltAnchors[anchorIndex];
    }
  }

  // `w:sectPr` must remain the last Word body child. If an opaque source node
  // has no following modeled anchor, place it immediately before the final
  // section properties rather than appending invalid markup after sectPr.
  return [...rebuiltChildren].reverse().find(
    (candidate): boolean =>
      candidate.namespaceURI === WORD_NS &&
      elementLocalName(candidate) === "sectPr",
  );
}

function mergeDocumentSiblings(
  sourceRoot: XmlElement,
  rebuiltRoot: XmlElement,
): void {
  const sourceChildren = elementChildren(sourceRoot);
  const body = directWordChild(rebuiltRoot, "body");
  if (!body) {
    return;
  }

  // The document root has a single modeled structural anchor (`w:body`). Move
  // or clone every source sibling back before it in exact source order. This
  // covers valid Word siblings such as `w:background` and extension children.
  let anchor: XmlNode = body;
  const sourceSiblings = sourceChildren.filter(
    (sourceChild): boolean =>
      !(sourceChild.namespaceURI === WORD_NS && elementLocalName(sourceChild) === "body"),
  );
  for (let index = sourceSiblings.length - 1; index >= 0; index -= 1) {
    const sourceChild = sourceSiblings[index]!;
    const currentChildren = elementChildren(rebuiltRoot);
    const existing = currentChildren.find(
      (candidate): boolean => elementKey(candidate) === elementKey(sourceChild),
    );
    const node = existing ?? sourceChild.cloneNode(true);
    rebuiltRoot.insertBefore(node, anchor);
    anchor = node;
  }
}

function mergeBodyExtensions(
  sourceXml: string,
  rebuiltXml: string,
): string {
  const sourceDocument = new DOMParser().parseFromString(
    sourceXml,
    "application/xml",
  );
  const rebuiltDocument = new DOMParser().parseFromString(
    rebuiltXml,
    "application/xml",
  );
  const sourceRoot = sourceDocument.documentElement as XmlElement | undefined;
  const rebuiltRoot = rebuiltDocument.documentElement as XmlElement | undefined;
  if (
    !sourceRoot ||
    !rebuiltRoot ||
    sourceRoot.namespaceURI !== WORD_NS ||
    rebuiltRoot.namespaceURI !== WORD_NS ||
    elementLocalName(sourceRoot) !== "document" ||
    elementLocalName(rebuiltRoot) !== "document"
  ) {
    return rebuiltXml;
  }

  mergeDocumentSiblings(sourceRoot, rebuiltRoot);

  const sourceBody = directWordChild(sourceRoot, "body");
  const rebuiltBody = directWordChild(rebuiltRoot, "body");
  if (!sourceBody || !rebuiltBody) {
    return rebuiltXml;
  }

  copyMissingAttributes(sourceBody, rebuiltBody);
  const sourceChildren = elementChildren(sourceBody);
  const rebuiltChildren = elementChildren(rebuiltBody);
  const stableTopology = bodyTopologyIsStable(sourceChildren, rebuiltChildren);
  const opaqueKeyOccurrences = new Map<string, number>();

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    if (isModeledBodyWordChild(sourceChild)) {
      return;
    }

    const key = elementKey(sourceChild);
    const occurrence = opaqueKeyOccurrences.get(key) ?? 0;
    opaqueKeyOccurrences.set(key, occurrence + 1);
    const existingSameKey = elementChildren(rebuiltBody).filter(
      (candidate): boolean => elementKey(candidate) === key,
    )[occurrence];
    if (existingSameKey) {
      return;
    }

    if (sourceChild.namespaceURI === WORD_NS && !stableTopology) {
      // Word flow wrappers need stable block topology to determine their gap.
      // Non-Word extension nodes remain safe to preserve even after structural
      // edits because Oasis has no semantic editing surface for them.
      return;
    }

    rebuiltBody.insertBefore(
      sourceChild.cloneNode(true),
      stableTopology
        ? (anchorForSourceGap(sourceChildren, sourceIndex, rebuiltChildren) ?? null)
        : (anchorForSourceGap([], 0, rebuiltChildren) ?? null),
    );
  });

  return new XMLSerializer().serializeToString(rebuiltDocument);
}

export function mergeDocumentRootAndBodyExtensionsFromSource(
  sourceXml: string,
  rebuiltXml: string,
): string {
  const rootMerged = mergeWordPartRootExtensionsFromSource(
    sourceXml,
    rebuiltXml,
    "document",
  );
  return mergeBodyExtensions(sourceXml, rootMerged);
}

export async function patchRebuiltDocumentRootFromSource(
  sourcePackage: EditorDocxSourcePackage,
  rebuilt: JSZip,
): Promise<boolean> {
  const sourcePart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  const rebuiltEntry = rebuilt.file(REBUILT_MAIN_DOCUMENT_PATH);
  if (sourcePart?.kind !== "xml" || !rebuiltEntry) {
    return false;
  }
  const rebuiltXml = await rebuiltEntry.async("string");
  const mergedXml = mergeDocumentRootAndBodyExtensionsFromSource(
    sourcePart.data,
    rebuiltXml,
  );
  if (mergedXml === rebuiltXml) {
    return false;
  }
  rebuilt.file(REBUILT_MAIN_DOCUMENT_PATH, mergedXml);
  return true;
}
