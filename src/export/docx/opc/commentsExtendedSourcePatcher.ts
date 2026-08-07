import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import type { EditorDocxSourcePackage } from "@/core/model.js";
import { WORD_NS } from "@/export/docx/xmlUtils.js";

const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";
const REBUILT_COMMENTS_PATH = "word/comments.xml";
const REBUILT_COMMENTS_EXTENDED_PATH = "word/commentsExtended.xml";

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

function getAttributeByLocalName(
  element: XmlElement,
  localName: string,
): string | undefined {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute?.localName === localName) {
      return attribute.value;
    }
  }
  return undefined;
}

function setAttributeLike(
  target: XmlElement,
  sourceAttribute: Attr,
  value: string,
): void {
  if (sourceAttribute.namespaceURI) {
    target.setAttributeNS(
      sourceAttribute.namespaceURI,
      sourceAttribute.name,
      value,
    );
  } else {
    target.setAttribute(sourceAttribute.name, value);
  }
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
    if (!exists) {
      setAttributeLike(target, attribute, attribute.value);
    }
  }
}

function sourcePartXml(
  sourcePackage: EditorDocxSourcePackage,
  relationshipSuffix: string,
): string | undefined {
  const mainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  const relationship = mainPart?.relationships?.find(
    (candidate): boolean =>
      candidate.targetMode !== "External" &&
      candidate.type.endsWith(relationshipSuffix) &&
      Boolean(candidate.resolvedTarget),
  );
  const part = relationship?.resolvedTarget
    ? sourcePackage.parts[relationship.resolvedTarget]
    : undefined;
  return part?.kind === "xml" ? part.data : undefined;
}

function commentParaIdsByWId(xml: string): Map<string, string> {
  const result = new Map<string, string>();
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement as XmlElement | undefined;
  if (!root) {
    return result;
  }
  for (const comment of Array.from(
    root.getElementsByTagNameNS(WORD_NS, "comment"),
  )) {
    const wId = getAttributeByLocalName(comment, "id");
    const paragraph = comment.getElementsByTagNameNS(WORD_NS, "p").item(0) as
      | XmlElement
      | null;
    const paraId = paragraph
      ? getAttributeByLocalName(paragraph, "paraId")
      : undefined;
    if (wId !== undefined && paraId) {
      result.set(wId, paraId);
    }
  }
  return result;
}

function parseCommentsExRoot(xml: string): XmlElement | undefined {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD15_NS && elementLocalName(root) === "commentsEx"
    ? root
    : undefined;
}

function commentExByParaId(root: XmlElement): Map<string, XmlElement> {
  const result = new Map<string, XmlElement>();
  for (const child of elementChildren(root)) {
    if (
      child.namespaceURI !== WORD15_NS ||
      elementLocalName(child) !== "commentEx"
    ) {
      continue;
    }
    const paraId = getAttributeByLocalName(child, "paraId");
    if (paraId) {
      result.set(paraId, child);
    }
  }
  return result;
}

function mergeCommentEx(
  source: XmlElement,
  target: XmlElement,
  sourceParaToRebuiltPara: ReadonlyMap<string, string>,
): void {
  for (let index = 0; index < source.attributes.length; index += 1) {
    const attribute = source.attributes.item(index);
    if (!attribute) {
      continue;
    }
    const localName = attribute.localName ?? attribute.name;
    if (localName === "paraId") {
      continue;
    }
    const exists = attribute.namespaceURI
      ? target.hasAttributeNS(attribute.namespaceURI, localName)
      : target.hasAttribute(attribute.name);
    if (exists) {
      // `done` is generated from EditorComment.resolved and must win.
      continue;
    }
    const value =
      localName === "paraIdParent"
        ? (sourceParaToRebuiltPara.get(attribute.value) ?? attribute.value)
        : attribute.value;
    setAttributeLike(target, attribute, value);
  }

  const targetKeys = new Set(elementChildren(target).map(elementKey));
  for (const child of elementChildren(source)) {
    if (!targetKeys.has(elementKey(child))) {
      target.appendChild(child.cloneNode(true));
    }
  }
}

export function mergeCommentsExtendedOoxmlSource(
  sourceCommentsXml: string,
  sourceExtendedXml: string,
  rebuiltCommentsXml: string,
  rebuiltExtendedXml: string,
): string {
  const sourceRoot = parseCommentsExRoot(sourceExtendedXml);
  const rebuiltRoot = parseCommentsExRoot(rebuiltExtendedXml);
  if (!sourceRoot || !rebuiltRoot) {
    return rebuiltExtendedXml;
  }

  copyMissingAttributes(sourceRoot, rebuiltRoot);

  const sourceParaByWId = commentParaIdsByWId(sourceCommentsXml);
  const rebuiltParaByWId = commentParaIdsByWId(rebuiltCommentsXml);
  const sourceParaToRebuiltPara = new Map<string, string>();
  for (const [wId, sourceParaId] of sourceParaByWId) {
    const rebuiltParaId = rebuiltParaByWId.get(wId);
    if (rebuiltParaId) {
      sourceParaToRebuiltPara.set(sourceParaId, rebuiltParaId);
    }
  }

  const rebuiltExByParaId = commentExByParaId(rebuiltRoot);
  const sourceChildren = elementChildren(sourceRoot);
  const rebuiltOtherKeys = new Set(
    elementChildren(rebuiltRoot)
      .filter(
        (child): boolean =>
          !(
            child.namespaceURI === WORD15_NS &&
            elementLocalName(child) === "commentEx"
          ),
      )
      .map(elementKey),
  );

  for (const sourceChild of sourceChildren) {
    if (
      sourceChild.namespaceURI === WORD15_NS &&
      elementLocalName(sourceChild) === "commentEx"
    ) {
      const sourceParaId = getAttributeByLocalName(sourceChild, "paraId");
      const rebuiltParaId = sourceParaId
        ? sourceParaToRebuiltPara.get(sourceParaId)
        : undefined;
      const target = rebuiltParaId
        ? rebuiltExByParaId.get(rebuiltParaId)
        : undefined;
      if (target) {
        mergeCommentEx(sourceChild, target, sourceParaToRebuiltPara);
      }
      // Source-only commentEx entries correspond to comments no longer present
      // in the generated comment registry and are intentionally not resurrected.
      continue;
    }

    if (!rebuiltOtherKeys.has(elementKey(sourceChild))) {
      rebuiltRoot.appendChild(sourceChild.cloneNode(true));
      rebuiltOtherKeys.add(elementKey(sourceChild));
    }
  }

  return new XMLSerializer().serializeToString(rebuiltRoot.ownerDocument!);
}

export async function patchRebuiltCommentsExtendedFromSource(
  sourcePackage: EditorDocxSourcePackage,
  rebuilt: JSZip,
): Promise<boolean> {
  const sourceCommentsXml = sourcePartXml(sourcePackage, "/comments");
  const sourceExtendedXml = sourcePartXml(sourcePackage, "/commentsExtended");
  const rebuiltCommentsEntry = rebuilt.file(REBUILT_COMMENTS_PATH);
  const rebuiltExtendedEntry = rebuilt.file(REBUILT_COMMENTS_EXTENDED_PATH);
  if (
    !sourceCommentsXml ||
    !sourceExtendedXml ||
    !rebuiltCommentsEntry ||
    !rebuiltExtendedEntry
  ) {
    return false;
  }

  const rebuiltCommentsXml = await rebuiltCommentsEntry.async("string");
  const rebuiltExtendedXml = await rebuiltExtendedEntry.async("string");
  const mergedXml = mergeCommentsExtendedOoxmlSource(
    sourceCommentsXml,
    sourceExtendedXml,
    rebuiltCommentsXml,
    rebuiltExtendedXml,
  );
  if (mergedXml === rebuiltExtendedXml) {
    return false;
  }
  rebuilt.file(REBUILT_COMMENTS_EXTENDED_PATH, mergedXml);
  return true;
}
