import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type { EditorTextRun } from "@/core/model.js";
import { WORD_NS } from "@/export/docx/xmlUtils.js";
import { serializeRunText } from "./runTextXml.js";
import {
  createEditorRunSemanticSignature,
  createEditorRunStructureSignature,
  getEditorRunOoxmlSource,
} from "@/ooxml/word/sourceFragments.js";

const TEXT_CONTENT_NAMES = new Set([
  "t",
  "tab",
  "br",
  "cr",
  "noBreakHyphen",
  "softHyphen",
]);

function hasRelationshipReference(xml: string): boolean {
  return /\br:(?:id|embed|link)\s*=/.test(xml);
}

function directElementChildren(element: XmlElement): XmlElement[] {
  const children: XmlElement[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes[index];
    if (node?.nodeType === node.ELEMENT_NODE) {
      children.push(node as XmlElement);
    }
  }
  return children;
}

function patchTextRunSourceXml(
  run: EditorTextRun,
  sourceXml: string,
): string | undefined {
  if (run.kind !== "text") {
    return undefined;
  }

  const sourceDocument = new DOMParser().parseFromString(
    sourceXml,
    "application/xml",
  );
  const sourceRun = sourceDocument.documentElement as XmlElement | undefined;
  if (!sourceRun || sourceRun.localName !== "r") {
    return undefined;
  }

  const sourceChildren = directElementChildren(sourceRun);
  const oldTextChildren = sourceChildren.filter(
    (child): boolean =>
      child.namespaceURI === WORD_NS && TEXT_CONTENT_NAMES.has(child.localName),
  );
  const insertionPoint =
    oldTextChildren[0] ??
    sourceChildren.find(
      (child): boolean =>
        !(child.namespaceURI === WORD_NS && child.localName === "rPr"),
    ) ??
    null;

  const generatedDocument = new DOMParser().parseFromString(
    `<w:r xmlns:w="${WORD_NS}">${serializeRunText(run.text)}</w:r>`,
    "application/xml",
  );
  const generatedRun = generatedDocument.documentElement as
    | XmlElement
    | undefined;
  if (!generatedRun) {
    return undefined;
  }

  const generatedChildren = directElementChildren(generatedRun);
  for (const child of generatedChildren) {
    sourceRun.insertBefore(child.cloneNode(true), insertionPoint);
  }
  for (const child of oldTextChildren) {
    sourceRun.removeChild(child);
  }

  return new XMLSerializer().serializeToString(sourceRun);
}

/**
 * Returns the original run subtree when its editor semantics are unchanged.
 * For a text-only edit with otherwise identical structure, patches the original
 * subtree's text nodes so unknown attributes/properties/children remain ordered.
 */
export function serializeRunFromOoxmlSource(
  run: EditorTextRun,
): string | undefined {
  const source = getEditorRunOoxmlSource(run);
  if (!source || hasRelationshipReference(source.xml)) {
    return undefined;
  }

  if (source.semanticSignature === createEditorRunSemanticSignature(run)) {
    return source.xml;
  }

  if (source.structureSignature !== createEditorRunStructureSignature(run)) {
    return undefined;
  }

  return patchTextRunSourceXml(run, source.xml);
}
