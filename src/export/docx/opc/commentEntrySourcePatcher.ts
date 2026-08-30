import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import type { EditorDocxSourcePackage } from "@/core/model.js";
import { WORD14_NS, WORD_NS } from "@/export/docx/xmlUtils.js";
import { mergeNestedExtensionMarkup } from "./extensionMarkupMerge.js";

const REBUILT_COMMENTS_PATH = "word/comments.xml";

function children(node: XmlNode): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE)
      result.push(child as XmlElement);
  }
  return result;
}

function name(element: XmlElement): string {
  return element.localName ?? element.tagName;
}

function attr(element: XmlElement, localName: string): string | undefined {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute?.localName === localName) return attribute.value;
  }
  return undefined;
}

function copyMissingAttributes(source: XmlElement, target: XmlElement): void {
  for (let index = 0; index < source.attributes.length; index += 1) {
    const attribute = source.attributes.item(index);
    if (!attribute) continue;
    const localName = attribute.localName ?? attribute.name;
    const exists = attribute.namespaceURI
      ? target.hasAttributeNS(attribute.namespaceURI, localName)
      : target.hasAttribute(attribute.name);
    if (exists) continue;
    if (attribute.namespaceURI) {
      target.setAttributeNS(
        attribute.namespaceURI,
        attribute.name,
        attribute.value,
      );
    } else {
      target.setAttribute(attribute.name, attribute.value);
    }
  }
}

function flattenText(element: XmlElement): string {
  let out = "";
  for (const child of children(element)) {
    if (child.namespaceURI === WORD_NS) {
      if (name(child) === "t") {
        out += child.textContent ?? "";
        continue;
      }
      if (name(child) === "tab") {
        out += "\t";
        continue;
      }
      if (name(child) === "br" || name(child) === "cr") {
        out += "\n";
        continue;
      }
    }
    out += flattenText(child);
  }
  return out;
}

function commentParagraphs(comment: XmlElement): XmlElement[] {
  return children(comment).filter(
    (child): boolean => child.namespaceURI === WORD_NS && name(child) === "p",
  );
}

function commentText(comment: XmlElement): string {
  return commentParagraphs(comment).map(flattenText).join("\n").trim();
}

function parseCommentsRoot(xml: string): XmlElement | undefined {
  const root = new DOMParser().parseFromString(xml, "application/xml")
    .documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD_NS && name(root) === "comments"
    ? root
    : undefined;
}

function sourceCommentsXml(
  sourcePackage: EditorDocxSourcePackage,
): string | undefined {
  const mainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  const relationship = mainPart?.relationships?.find(
    (candidate): boolean =>
      candidate.targetMode !== "External" &&
      candidate.type.endsWith("/comments") &&
      Boolean(candidate.resolvedTarget),
  );
  const part = relationship?.resolvedTarget
    ? sourcePackage.parts[relationship.resolvedTarget]
    : undefined;
  return part?.kind === "xml" ? part.data : undefined;
}

function replaceBodyChildren(source: XmlElement, target: XmlElement): void {
  // `commentsExtended.xml` is generated against the target comment's paraId.
  // Preserve that identity even when the richer source body is otherwise reused.
  const generatedParaId = attr(
    commentParagraphs(target)[0] ?? target,
    "paraId",
  );

  while (target.firstChild) target.removeChild(target.firstChild);
  for (let index = 0; index < source.childNodes.length; index += 1) {
    const child = source.childNodes[index];
    if (child) target.appendChild(child.cloneNode(true));
  }

  const firstRestoredParagraph = commentParagraphs(target)[0];
  if (generatedParaId && firstRestoredParagraph) {
    firstRestoredParagraph.setAttributeNS(
      WORD14_NS,
      "w14:paraId",
      generatedParaId,
    );
  }
}

function mergeChangedBodyExtensions(
  source: XmlElement,
  target: XmlElement,
): void {
  const sourceParagraphs = commentParagraphs(source);
  const targetParagraphs = commentParagraphs(target);
  if (sourceParagraphs[0] && targetParagraphs[0]) {
    mergeNestedExtensionMarkup(sourceParagraphs[0], targetParagraphs[0]);
  }

  const targetExtensionKeys = new Set(
    children(target)
      .filter((child): boolean => child.namespaceURI !== WORD_NS)
      .map(
        (child): string => `${child.namespaceURI ?? ""}\u0000${name(child)}`,
      ),
  );
  for (const child of children(source)) {
    if (child.namespaceURI === WORD_NS) continue;
    const key = `${child.namespaceURI ?? ""}\u0000${name(child)}`;
    if (!targetExtensionKeys.has(key)) {
      target.appendChild(child.cloneNode(true));
      targetExtensionKeys.add(key);
    }
  }
}

export function mergeCommentEntriesOoxmlSource(
  sourceXml: string,
  rebuiltXml: string,
): string {
  const sourceRoot = parseCommentsRoot(sourceXml);
  const rebuiltRoot = parseCommentsRoot(rebuiltXml);
  if (!sourceRoot || !rebuiltRoot) return rebuiltXml;

  const targetById = new Map<string, XmlElement>();
  for (const entry of children(rebuiltRoot)) {
    if (entry.namespaceURI !== WORD_NS || name(entry) !== "comment") continue;
    const id = attr(entry, "id");
    if (id !== undefined) targetById.set(id, entry);
  }

  let changed = false;
  for (const sourceEntry of children(sourceRoot)) {
    if (sourceEntry.namespaceURI !== WORD_NS || name(sourceEntry) !== "comment")
      continue;
    const id = attr(sourceEntry, "id");
    const target = id !== undefined ? targetById.get(id) : undefined;
    if (!target) continue;

    const before = new XMLSerializer().serializeToString(target);
    copyMissingAttributes(sourceEntry, target);
    if (commentText(sourceEntry) === commentText(target)) {
      replaceBodyChildren(sourceEntry, target);
    } else {
      mergeChangedBodyExtensions(sourceEntry, target);
    }
    if (new XMLSerializer().serializeToString(target) !== before)
      changed = true;
  }

  return changed
    ? new XMLSerializer().serializeToString(rebuiltRoot.ownerDocument!)
    : rebuiltXml;
}

export async function patchRebuiltCommentEntriesFromSource(
  sourcePackage: EditorDocxSourcePackage,
  rebuilt: JSZip,
): Promise<boolean> {
  const sourceXml = sourceCommentsXml(sourcePackage);
  const rebuiltEntry = rebuilt.file(REBUILT_COMMENTS_PATH);
  if (!sourceXml || !rebuiltEntry) return false;
  const rebuiltXml = await rebuiltEntry.async("string");
  const mergedXml = mergeCommentEntriesOoxmlSource(sourceXml, rebuiltXml);
  if (mergedXml === rebuiltXml) return false;
  rebuilt.file(REBUILT_COMMENTS_PATH, mergedXml);
  return true;
}
