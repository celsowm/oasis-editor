import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type { EditorTextRun } from "@/core/model.js";
import {
  OFFICE_REL_NS,
  WORD14_NS,
  WORD_NS,
} from "@/export/docx/xmlUtils.js";
import { serializeRunText } from "./runTextXml.js";
import {
  createEditorRunSemanticSignature,
  createEditorRunStructureSignature,
  getEditorRunOoxmlSource,
  ooxmlSourceNeedsCanonicalRunSerialization,
} from "@/ooxml/word/sourceFragments.js";

const MARKUP_COMPATIBILITY_NS =
  "http://schemas.openxmlformats.org/markup-compatibility/2006";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

const TEXT_CONTENT_NAMES = new Set([
  "t",
  "tab",
  "br",
  "cr",
  "noBreakHyphen",
  "softHyphen",
]);

const GENERATED_RUN_CONTENT_NAMES = new Set([
  ...TEXT_CONTENT_NAMES,
  "drawing",
  "pict",
  "sym",
  "fldChar",
  "instrText",
  "footnoteReference",
  "endnoteReference",
  "separator",
  "continuationSeparator",
]);

const MODELED_WORD_RUN_PROPERTY_NAMES = new Set([
  "rStyle",
  "rFonts",
  "b",
  "bCs",
  "i",
  "iCs",
  "caps",
  "smallCaps",
  "strike",
  "dstrike",
  "outline",
  "shadow",
  "emboss",
  "imprint",
  "noProof",
  "snapToGrid",
  "vanish",
  "webHidden",
  "color",
  "spacing",
  "w",
  "kern",
  "position",
  "sz",
  "szCs",
  "highlight",
  "u",
  "effect",
  "bdr",
  "shd",
  "fitText",
  "vertAlign",
  "rtl",
  "cs",
  "em",
  "lang",
  "eastAsianLayout",
  "specVanish",
  "oMath",
]);

const MODELED_WORD14_RUN_PROPERTY_NAMES = new Set([
  "ligatures",
  "numSpacing",
  "numForm",
  "stylisticSets",
  "cntxtAlts",
  "textFill",
  "textOutline",
  "shadow",
  "glow",
  "reflection",
  "scene3d",
  "props3d",
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

function elementLocalName(element: XmlElement): string {
  return element.localName ?? element.tagName;
}

function directChild(
  element: XmlElement,
  namespaceUri: string,
  localName: string,
): XmlElement | undefined {
  return directElementChildren(element).find(
    (child): boolean =>
      child.namespaceURI === namespaceUri &&
      elementLocalName(child) === localName,
  );
}

function elementKey(element: XmlElement): string {
  return `${element.namespaceURI ?? ""}\u0000${elementLocalName(element)}`;
}

function parseSingleRunXml(xml: string): XmlElement | undefined {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement as XmlElement | undefined;
  return root && elementLocalName(root) === "r" ? root : undefined;
}

function parseGeneratedSingleRunXml(xml: string): XmlElement | undefined {
  const wrapper = new DOMParser().parseFromString(
    `<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" xmlns:r="${OFFICE_REL_NS}" xmlns:mc="${MARKUP_COMPATIBILITY_NS}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${xml}</oasis:root>`,
    "application/xml",
  ).documentElement as XmlElement | undefined;
  if (!wrapper) {
    return undefined;
  }
  const children = directElementChildren(wrapper);
  return children.length === 1 && elementLocalName(children[0]!) === "r"
    ? children[0]
    : undefined;
}

function patchTextRunSourceXml(
  run: EditorTextRun,
  sourceXml: string,
): string | undefined {
  if (run.kind !== "text") {
    return undefined;
  }

  const sourceRun = parseSingleRunXml(sourceXml);
  if (!sourceRun) {
    return undefined;
  }

  const sourceChildren = directElementChildren(sourceRun);
  const oldTextChildren = sourceChildren.filter(
    (child): boolean =>
      child.namespaceURI === WORD_NS &&
      TEXT_CONTENT_NAMES.has(elementLocalName(child)),
  );
  const insertionPoint =
    oldTextChildren[0] ??
    sourceChildren.find(
      (child): boolean =>
        !(
          child.namespaceURI === WORD_NS &&
          elementLocalName(child) === "rPr"
        ),
    ) ??
    null;

  const generatedRun = parseGeneratedSingleRunXml(
    `<w:r>${serializeRunText(run.text)}</w:r>`,
  );
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

function isNamespaceDeclaration(attribute: Attr): boolean {
  return (
    attribute.namespaceURI === XMLNS_NS ||
    attribute.prefix === "xmlns" ||
    attribute.name === "xmlns"
  );
}

function hasPreservableAttributes(element: XmlElement): boolean {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes[index];
    if (
      attribute &&
      !isNamespaceDeclaration(attribute) &&
      attribute.namespaceURI !== OFFICE_REL_NS
    ) {
      return true;
    }
  }
  return false;
}

function copySourceRunAttributes(
  sourceRun: XmlElement,
  generatedRun: XmlElement,
): void {
  for (let index = 0; index < sourceRun.attributes.length; index += 1) {
    const attribute = sourceRun.attributes[index];
    if (!attribute || attribute.namespaceURI === OFFICE_REL_NS) {
      continue;
    }
    const localName = attribute.localName ?? attribute.name;
    const hasAttribute = attribute.namespaceURI
      ? generatedRun.hasAttributeNS(attribute.namespaceURI, localName)
      : generatedRun.hasAttribute(attribute.name);
    if (hasAttribute) {
      continue;
    }
    if (attribute.namespaceURI) {
      generatedRun.setAttributeNS(
        attribute.namespaceURI,
        attribute.name,
        attribute.value,
      );
    } else {
      generatedRun.setAttribute(attribute.name, attribute.value);
    }
  }
}

function isModeledRunProperty(element: XmlElement): boolean {
  const localName = elementLocalName(element);
  if (element.namespaceURI === WORD_NS) {
    return MODELED_WORD_RUN_PROPERTY_NAMES.has(localName);
  }
  if (element.namespaceURI === WORD14_NS) {
    return MODELED_WORD14_RUN_PROPERTY_NAMES.has(localName);
  }
  return (
    element.namespaceURI === MARKUP_COMPATIBILITY_NS &&
    localName === "AlternateContent"
  );
}

function ensureGeneratedRunProperties(
  generatedRun: XmlElement,
): XmlElement {
  const existing = directChild(generatedRun, WORD_NS, "rPr");
  if (existing) {
    return existing;
  }
  const properties = generatedRun.ownerDocument!.createElementNS(
    WORD_NS,
    "w:rPr",
  );
  generatedRun.insertBefore(properties, generatedRun.firstChild);
  return properties;
}

function mergeSourceRunProperties(
  sourceRun: XmlElement,
  generatedRun: XmlElement,
): void {
  const sourceProperties = directChild(sourceRun, WORD_NS, "rPr");
  if (!sourceProperties) {
    return;
  }

  const sourceChildren = directElementChildren(sourceProperties);
  const generatedProperties = directChild(generatedRun, WORD_NS, "rPr");
  const generatedChildren = generatedProperties
    ? directElementChildren(generatedProperties)
    : [];
  const generatedKeys = new Set(generatedChildren.map(elementKey));
  const preserved = sourceChildren.filter(
    (child): boolean =>
      !isModeledRunProperty(child) && !generatedKeys.has(elementKey(child)),
  );
  if (preserved.length === 0) {
    return;
  }

  const targetProperties = ensureGeneratedRunProperties(generatedRun);
  for (const child of preserved) {
    const sourceIndex = sourceChildren.indexOf(child);
    const nextKnownSourceChild = sourceChildren
      .slice(sourceIndex + 1)
      .find((candidate): boolean => generatedKeys.has(elementKey(candidate)));
    const anchor = nextKnownSourceChild
      ? directElementChildren(targetProperties).find(
          (candidate): boolean =>
            elementKey(candidate) === elementKey(nextKnownSourceChild),
        ) ?? null
      : null;
    targetProperties.insertBefore(child.cloneNode(true), anchor);
  }
}

function isGeneratedRunContent(element: XmlElement): boolean {
  const localName = elementLocalName(element);
  return (
    element.namespaceURI === WORD_NS &&
    (localName === "rPr" || GENERATED_RUN_CONTENT_NAMES.has(localName))
  );
}

function hasPreservableSourceRunContent(sourceRun: XmlElement): boolean {
  if (hasPreservableAttributes(sourceRun)) {
    return true;
  }

  const sourceProperties = directChild(sourceRun, WORD_NS, "rPr");
  if (
    sourceProperties &&
    (hasPreservableAttributes(sourceProperties) ||
      directElementChildren(sourceProperties).some(
        (child): boolean => !isModeledRunProperty(child),
      ))
  ) {
    return true;
  }

  return directElementChildren(sourceRun).some(
    (child): boolean => !isGeneratedRunContent(child),
  );
}

function mergeSourceRunChildren(
  sourceRun: XmlElement,
  generatedRun: XmlElement,
): void {
  const sourceChildren = directElementChildren(sourceRun);
  const generatedChildren = directElementChildren(generatedRun);
  const generatedKeys = new Set(generatedChildren.map(elementKey));
  const preserved = sourceChildren.filter(
    (child): boolean =>
      !isGeneratedRunContent(child) && !generatedKeys.has(elementKey(child)),
  );

  for (const child of preserved) {
    const sourceIndex = sourceChildren.indexOf(child);
    const nextGeneratedSourceChild = sourceChildren
      .slice(sourceIndex + 1)
      .find((candidate): boolean => isGeneratedRunContent(candidate));
    const anchor = nextGeneratedSourceChild
      ? directElementChildren(generatedRun).find(
          (candidate): boolean =>
            elementKey(candidate) === elementKey(nextGeneratedSourceChild),
        ) ?? null
      : null;
    generatedRun.insertBefore(child.cloneNode(true), anchor);
  }
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
  if (
    !source ||
    hasRelationshipReference(source.xml) ||
    ooxmlSourceNeedsCanonicalRunSerialization(source.xml)
  ) {
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

/**
 * Merges source-only run attributes, run properties and direct extension
 * children into a freshly generated single `w:r`. Generated/modelled content is
 * authoritative; unknown source content remains anchored by source order.
 */
export function mergeRunOoxmlSourceIntoGeneratedXml(
  run: EditorTextRun,
  generatedXml: string,
): string {
  const source = getEditorRunOoxmlSource(run);
  if (!source || hasRelationshipReference(source.xml)) {
    return generatedXml;
  }

  const sourceRun = parseSingleRunXml(source.xml);
  if (!sourceRun || !hasPreservableSourceRunContent(sourceRun)) {
    return generatedXml;
  }

  const generatedRun = parseGeneratedSingleRunXml(generatedXml);
  if (!generatedRun) {
    return generatedXml;
  }

  copySourceRunAttributes(sourceRun, generatedRun);
  mergeSourceRunProperties(sourceRun, generatedRun);
  mergeSourceRunChildren(sourceRun, generatedRun);

  return new XMLSerializer().serializeToString(generatedRun);
}
