import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type { EditorParagraphNode } from "@/core/model.js";
import { OFFICE_REL_NS, WORD_NS } from "@/export/docx/xmlUtils.js";
import {
  createEditorParagraphPropertiesSignature,
  getEditorParagraphOoxmlSource,
} from "@/ooxml/word/sourceFragments.js";

const MODELED_PARAGRAPH_PROPERTY_NAMES = new Set([
  "pStyle",
  "keepNext",
  "keepLines",
  "pageBreakBefore",
  "framePr",
  "widowControl",
  "numPr",
  "suppressLineNumbers",
  "pBdr",
  "shd",
  "tabs",
  "suppressAutoHyphens",
  "kinsoku",
  "wordWrap",
  "overflowPunct",
  "topLinePunct",
  "autoSpaceDE",
  "autoSpaceDN",
  "bidi",
  "adjustRightInd",
  "snapToGrid",
  "spacing",
  "ind",
  "contextualSpacing",
  "mirrorIndents",
  "suppressOverlap",
  "jc",
  "textDirection",
  "textAlignment",
  "textboxTightWrap",
  "outlineLvl",
  "divId",
  "cnfStyle",
  "rPr",
  "sectPr",
  "pPrChange",
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

function elementKey(element: XmlElement): string {
  return `${element.namespaceURI ?? ""}\u0000${element.localName}`;
}

function parseParagraphPropertiesXml(xml: string): XmlElement | undefined {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD_NS && root.localName === "pPr"
    ? root
    : undefined;
}

function createGeneratedParagraphProperties(xml: string): XmlElement | undefined {
  if (xml) {
    const wrapper = new DOMParser().parseFromString(
      `<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${WORD_NS}">${xml}</oasis:root>`,
      "application/xml",
    ).documentElement as XmlElement | undefined;
    const children = wrapper ? directElementChildren(wrapper) : [];
    if (
      children.length === 1 &&
      children[0]!.namespaceURI === WORD_NS &&
      children[0]!.localName === "pPr"
    ) {
      return children[0];
    }
  }

  return new DOMParser().parseFromString(
    `<w:pPr xmlns:w="${WORD_NS}"/>`,
    "application/xml",
  ).documentElement as XmlElement | undefined;
}

function copySourceAttributes(
  source: XmlElement,
  generated: XmlElement,
): void {
  for (let index = 0; index < source.attributes.length; index += 1) {
    const attribute = source.attributes[index];
    if (!attribute || attribute.namespaceURI === OFFICE_REL_NS) {
      continue;
    }
    const hasAttribute = attribute.namespaceURI
      ? generated.hasAttributeNS(attribute.namespaceURI, attribute.localName)
      : generated.hasAttribute(attribute.name);
    if (hasAttribute) {
      continue;
    }
    if (attribute.namespaceURI) {
      generated.setAttributeNS(
        attribute.namespaceURI,
        attribute.name,
        attribute.value,
      );
    } else {
      generated.setAttribute(attribute.name, attribute.value);
    }
  }
}

function isModeledParagraphProperty(element: XmlElement): boolean {
  return (
    element.namespaceURI === WORD_NS &&
    MODELED_PARAGRAPH_PROPERTY_NAMES.has(element.localName)
  );
}

/**
 * Preserves source-only `w:pPr` children while keeping the freshly generated
 * paragraph properties authoritative. Unknown children are inserted before the
 * next generated source sibling when possible, preserving source order.
 */
export function mergeParagraphPropertiesOoxmlSource(
  paragraph: EditorParagraphNode,
  generatedXml: string,
  hasOverrides: boolean,
): string {
  const source = getEditorParagraphOoxmlSource(paragraph)?.paragraphProperties;
  if (!source || hasRelationshipReference(source.xml)) {
    return generatedXml;
  }

  if (
    !hasOverrides &&
    !paragraph.list &&
    source.semanticSignature ===
      createEditorParagraphPropertiesSignature(paragraph)
  ) {
    return source.xml;
  }

  const sourceProperties = parseParagraphPropertiesXml(source.xml);
  const generatedProperties = createGeneratedParagraphProperties(generatedXml);
  if (!sourceProperties || !generatedProperties) {
    return generatedXml;
  }

  copySourceAttributes(sourceProperties, generatedProperties);

  const sourceChildren = directElementChildren(sourceProperties);
  const generatedChildren = directElementChildren(generatedProperties);
  const generatedKeys = new Set(generatedChildren.map(elementKey));
  const preserved = sourceChildren.filter(
    (child): boolean =>
      !isModeledParagraphProperty(child) &&
      !generatedKeys.has(elementKey(child)),
  );

  for (const child of preserved) {
    const sourceIndex = sourceChildren.indexOf(child);
    const nextGeneratedSourceChild = sourceChildren
      .slice(sourceIndex + 1)
      .find((candidate): boolean => generatedKeys.has(elementKey(candidate)));
    const anchor = nextGeneratedSourceChild
      ? directElementChildren(generatedProperties).find(
          (candidate): boolean =>
            elementKey(candidate) === elementKey(nextGeneratedSourceChild),
        ) ?? null
      : null;
    generatedProperties.insertBefore(child.cloneNode(true), anchor);
  }

  if (
    !generatedXml &&
    generatedProperties.attributes.length === 1 &&
    directElementChildren(generatedProperties).length === 0
  ) {
    return "";
  }

  return new XMLSerializer().serializeToString(generatedProperties);
}
