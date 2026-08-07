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

function bodyTopologyIsStable(
  sourceChildren: XmlElement[],
  rebuiltChildren: XmlElement[],
): boolean {
  const sourceAnchors = sourceChildren.filter(isModeledBodyWordChild);
  const rebuiltAnchors = rebuiltChildren.filter(isModeledBodyWordChild);
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
  const sourceAnchors = sourceChildren.filter(isModeledBodyWordChild);
  const rebuiltAnchors = rebuiltChildren.filter(isModeledBodyWordChild);
  const nextSourceAnchor = sourceChildren
    .slice(sourceIndex + 1)
    .find(isModeledBodyWordChild);
  if (!nextSourceAnchor) {
    return undefined;
  }
  const anchorIndex = sourceAnchors.indexOf(nextSourceAnchor);
  return anchorIndex >= 0 ? rebuiltAnchors[anchorIndex] : undefined;
}

function mergeDocumentWordSiblings(
  sourceRoot: XmlElement,
  rebuiltRoot: XmlElement,
): void {
  const sourceChildren = elementChildren(sourceRoot);
  const rebuiltChildren = elementChildren(rebuiltRoot);
  const body = directWordChild(rebuiltRoot, "body");
  if (!body) {
    return;
  }

  for (const sourceChild of sourceChildren) {
    if (
      sourceChild.namespaceURI !== WORD_NS ||
      elementLocalName(sourceChild) === "body"
    ) {
      continue;
    }
    const alreadyPresent = rebuiltChildren.some(
      (candidate): boolean => elementKey(candidate) === elementKey(sourceChild),
    );
    if (!alreadyPresent) {
      // `w:document` has one modeled structural child (`w:body`), so Word
      // siblings such as `w:background` have an unambiguous source position.
      rebuiltRoot.insertBefore(sourceChild.cloneNode(true), body);
    }
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

  mergeDocumentWordSiblings(sourceRoot, rebuiltRoot);

  const sourceBody = directWordChild(sourceRoot, "body");
  const rebuiltBody = directWordChild(rebuiltRoot, "body");
  if (!sourceBody || !rebuiltBody) {
    return rebuiltXml;
  }

  copyMissingAttributes(sourceBody, rebuiltBody);
  const sourceChildren = elementChildren(sourceBody);
  const rebuiltChildren = elementChildren(rebuiltBody);
  const rebuiltKeys = new Set(rebuiltChildren.map(elementKey));
  const stableTopology = bodyTopologyIsStable(sourceChildren, rebuiltChildren);

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    if (isModeledBodyWordChild(sourceChild)) {
      return;
    }

    if (sourceChild.namespaceURI === WORD_NS) {
      if (!stableTopology) {
        return;
      }
      // Unsupported Word flow children (e.g. altChunk/customXml/revision
      // wrappers) are restored only when the modeled p/tbl/sdt/sectPr sequence
      // is unchanged. Their source gap is then unambiguous.
      const alreadyPresent = rebuiltChildren.some(
        (candidate): boolean => elementKey(candidate) === elementKey(sourceChild),
      );
      if (!alreadyPresent) {
        rebuiltBody.insertBefore(
          sourceChild.cloneNode(true),
          anchorForSourceGap(sourceChildren, sourceIndex, rebuiltChildren) ?? null,
        );
      }
      return;
    }

    if (rebuiltKeys.has(elementKey(sourceChild))) {
      return;
    }
    const anchor = sourceChildren
      .slice(sourceIndex + 1)
      .map((candidate): XmlElement | undefined =>
        rebuiltChildren.find(
          (rebuiltChild): boolean =>
            elementKey(rebuiltChild) === elementKey(candidate),
        ),
      )
      .find((candidate): candidate is XmlElement => Boolean(candidate));
    rebuiltBody.insertBefore(sourceChild.cloneNode(true), anchor ?? null);
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
