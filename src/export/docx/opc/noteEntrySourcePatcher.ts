import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import type { EditorDocument, EditorDocxSourcePackage } from "@/core/model.js";
import { WORD_NS } from "@/export/docx/xmlUtils.js";

interface NotePartSpec {
  kind: "footnote" | "endnote";
  relationshipSuffix: "/footnotes" | "/endnotes";
  rebuiltPath: "word/footnotes.xml" | "word/endnotes.xml";
  rootName: "footnotes" | "endnotes";
  entryName: "footnote" | "endnote";
}

const SPECS: NotePartSpec[] = [
  {
    kind: "footnote",
    relationshipSuffix: "/footnotes",
    rebuiltPath: "word/footnotes.xml",
    rootName: "footnotes",
    entryName: "footnote",
  },
  {
    kind: "endnote",
    relationshipSuffix: "/endnotes",
    rebuiltPath: "word/endnotes.xml",
    rootName: "endnotes",
    entryName: "endnote",
  },
];

const MODELED_BLOCK_NAMES = new Set(["p", "tbl"]);
const SPECIAL_TYPES = new Set([
  "separator",
  "continuationSeparator",
  "continuationNotice",
]);

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

function key(element: XmlElement): string {
  return `${element.namespaceURI ?? ""}\u0000${name(element)}`;
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

function sourcePartXml(
  sourcePackage: EditorDocxSourcePackage,
  suffix: string,
): string | undefined {
  const mainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  const relationship = mainPart?.relationships?.find(
    (candidate): boolean =>
      candidate.targetMode !== "External" &&
      candidate.type.endsWith(suffix) &&
      Boolean(candidate.resolvedTarget),
  );
  const part = relationship?.resolvedTarget
    ? sourcePackage.parts[relationship.resolvedTarget]
    : undefined;
  return part?.kind === "xml" ? part.data : undefined;
}

function parseRoot(xml: string, rootName: string): XmlElement | undefined {
  const root = new DOMParser().parseFromString(xml, "application/xml")
    .documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD_NS && name(root) === rootName
    ? root
    : undefined;
}

function entryIdentity(element: XmlElement): string | undefined {
  const type = attr(element, "type");
  if (type && SPECIAL_TYPES.has(type)) return `type:${type}`;
  const id = attr(element, "id");
  return id ? `id:${id}` : undefined;
}

function isModeledBlock(element: XmlElement): boolean {
  return (
    element.namespaceURI === WORD_NS && MODELED_BLOCK_NAMES.has(name(element))
  );
}

function blockIdentity(element: XmlElement): string | undefined {
  if (element.namespaceURI !== WORD_NS || name(element) !== "p")
    return undefined;
  const paraId = attr(element, "paraId");
  return paraId ? `p:${paraId}` : undefined;
}

function topologyStable(source: XmlElement[], target: XmlElement[]): boolean {
  const sourceBlocks = source.filter(isModeledBlock);
  const targetBlocks = target.filter(isModeledBlock);
  return (
    sourceBlocks.length === targetBlocks.length &&
    sourceBlocks.every(
      (block, index): boolean => name(block) === name(targetBlocks[index]!),
    )
  );
}

function anchorForOpaqueChild(
  sourceChildren: XmlElement[],
  sourceIndex: number,
  targetChildren: XmlElement[],
  stable: boolean,
): XmlElement | undefined {
  const nextSourceBlock = sourceChildren
    .slice(sourceIndex + 1)
    .find(isModeledBlock);
  if (!nextSourceBlock) return undefined;

  const identity = blockIdentity(nextSourceBlock);
  if (identity) {
    const byIdentity = targetChildren
      .filter(isModeledBlock)
      .find((candidate): boolean => blockIdentity(candidate) === identity);
    if (byIdentity) return byIdentity;
  }
  if (!stable) return undefined;

  const sourceBlocks = sourceChildren.filter(isModeledBlock);
  const targetBlocks = targetChildren.filter(isModeledBlock);
  const index = sourceBlocks.indexOf(nextSourceBlock);
  return index >= 0 ? targetBlocks[index] : undefined;
}

function mergeRegularEntry(source: XmlElement, target: XmlElement): void {
  copyMissingAttributes(source, target);
  const sourceChildren = children(source);
  const targetChildren = children(target);
  const stable = topologyStable(sourceChildren, targetChildren);
  const occurrences = new Map<string, number>();

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    if (isModeledBlock(sourceChild)) return;
    const childKey = key(sourceChild);
    const occurrence = occurrences.get(childKey) ?? 0;
    occurrences.set(childKey, occurrence + 1);
    if (
      children(target).filter(
        (candidate): boolean => key(candidate) === childKey,
      )[occurrence]
    ) {
      return;
    }

    const anchor = anchorForOpaqueChild(
      sourceChildren,
      sourceIndex,
      targetChildren,
      stable,
    );
    if (sourceChild.namespaceURI === WORD_NS && !anchor && !stable) {
      return;
    }
    target.insertBefore(sourceChild.cloneNode(true), anchor ?? null);
  });
}

function liveSourceIds(
  document: EditorDocument,
  kind: NotePartSpec["kind"],
): Set<string> {
  const items =
    kind === "footnote" ? document.footnotes?.items : document.endnotes?.items;
  const result = new Set<string>();
  for (const note of Object.values(items ?? {})) {
    if (
      note.docxId !== undefined &&
      Number.isSafeInteger(note.docxId) &&
      note.docxId >= 1
    ) {
      result.add(String(note.docxId));
    }
  }
  return result;
}

function mergeNotePart(
  document: EditorDocument,
  sourceXml: string,
  rebuiltXml: string,
  spec: NotePartSpec,
): string {
  const sourceRoot = parseRoot(sourceXml, spec.rootName);
  const rebuiltRoot = parseRoot(rebuiltXml, spec.rootName);
  if (!sourceRoot || !rebuiltRoot) return rebuiltXml;

  const sourceEntries = children(sourceRoot).filter(
    (entry): boolean =>
      entry.namespaceURI === WORD_NS && name(entry) === spec.entryName,
  );
  const targetByIdentity = new Map<string, XmlElement>();
  for (const entry of children(rebuiltRoot)) {
    if (entry.namespaceURI !== WORD_NS || name(entry) !== spec.entryName)
      continue;
    const identity = entryIdentity(entry);
    if (identity) targetByIdentity.set(identity, entry);
  }
  const liveIds = liveSourceIds(document, spec.kind);

  for (const sourceEntry of sourceEntries) {
    const identity = entryIdentity(sourceEntry);
    if (!identity) continue;
    const targetEntry = targetByIdentity.get(identity);
    const type = attr(sourceEntry, "type");

    if (targetEntry) {
      if (type && SPECIAL_TYPES.has(type)) {
        // Separator stories are not currently editable/serialized from their
        // imported model, so source is the authoritative preservation copy.
        rebuiltRoot.replaceChild(sourceEntry.cloneNode(true), targetEntry);
      } else {
        mergeRegularEntry(sourceEntry, targetEntry);
      }
      continue;
    }

    if (type === "continuationNotice") {
      rebuiltRoot.appendChild(sourceEntry.cloneNode(true));
      continue;
    }

    const id = attr(sourceEntry, "id");
    if (id && liveIds.has(id)) {
      // Registry item still exists but is temporarily unreferenced, so keep its
      // source body. Explicit registry deletion removes it on the next export.
      rebuiltRoot.appendChild(sourceEntry.cloneNode(true));
    }
  }

  return new XMLSerializer().serializeToString(rebuiltRoot.ownerDocument!);
}

export async function patchRebuiltNoteEntriesFromSource(
  document: EditorDocument,
  sourcePackage: EditorDocxSourcePackage,
  rebuilt: JSZip,
): Promise<boolean> {
  let changed = false;
  for (const spec of SPECS) {
    const sourceXml = sourcePartXml(sourcePackage, spec.relationshipSuffix);
    const rebuiltEntry = rebuilt.file(spec.rebuiltPath);
    if (!sourceXml || !rebuiltEntry) continue;
    const rebuiltXml = await rebuiltEntry.async("string");
    const mergedXml = mergeNotePart(document, sourceXml, rebuiltXml, spec);
    if (mergedXml !== rebuiltXml) {
      rebuilt.file(spec.rebuiltPath, mergedXml);
      changed = true;
    }
  }
  return changed;
}
