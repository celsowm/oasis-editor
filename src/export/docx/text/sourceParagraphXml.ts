import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type { EditorParagraphNode } from "@/core/model.js";
import {
  OFFICE_REL_NS,
  WORD14_NS,
  WORD_NS,
} from "@/export/docx/xmlUtils.js";
import { getEditorParagraphOoxmlSource } from "@/ooxml/word/sourceFragments.js";

const MARKUP_COMPATIBILITY_NS =
  "http://schemas.openxmlformats.org/markup-compatibility/2006";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

const STANDARD_PARAGRAPH_CHILD_NAMES = new Set([
  "pPr",
  "r",
  "hyperlink",
  "fldSimple",
  "bookmarkStart",
  "bookmarkEnd",
  "commentRangeStart",
  "commentRangeEnd",
]);

interface XmlAttributeLike {
  namespaceURI: string | null;
  prefix: string | null;
  name: string;
}

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

function directWordChild(
  element: XmlElement,
  localName: string,
): XmlElement | undefined {
  return directElementChildren(element).find(
    (child): boolean =>
      child.namespaceURI === WORD_NS &&
      elementLocalName(child) === localName,
  );
}

function collectInlineRuns(paragraph: XmlElement): XmlElement[] {
  const runs: XmlElement[] = [];
  const visit = (container: XmlElement): void => {
    for (const child of directElementChildren(container)) {
      const localName = elementLocalName(child);
      if (child.namespaceURI === WORD_NS && localName === "r") {
        runs.push(child);
        continue;
      }
      if (
        child.namespaceURI === WORD_NS &&
        (localName === "pPr" ||
          localName === "p" ||
          localName === "tbl" ||
          localName === "txbxContent")
      ) {
        continue;
      }
      visit(child);
    }
  };
  visit(paragraph);
  return runs;
}

function parseSourceParagraph(xml: string): XmlElement | undefined {
  const root = new DOMParser().parseFromString(xml, "application/xml")
    .documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD_NS && elementLocalName(root) === "p"
    ? root
    : undefined;
}

function parseGeneratedElement(
  xml: string,
  expectedLocalName: string,
): XmlElement | undefined {
  const wrapper = new DOMParser().parseFromString(
    `<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" xmlns:r="${OFFICE_REL_NS}" xmlns:mc="${MARKUP_COMPATIBILITY_NS}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${xml}</oasis:root>`,
    "application/xml",
  ).documentElement as XmlElement | undefined;
  if (!wrapper) {
    return undefined;
  }
  const children = directElementChildren(wrapper);
  return children.length === 1 &&
    children[0]!.namespaceURI === WORD_NS &&
    elementLocalName(children[0]!) === expectedLocalName
    ? children[0]
    : undefined;
}

function isNamespaceDeclaration(attribute: XmlAttributeLike): boolean {
  return (
    attribute.namespaceURI === XMLNS_NS ||
    attribute.prefix === "xmlns" ||
    attribute.name === "xmlns"
  );
}

function sourceParagraphNeedsOverlay(paragraph: XmlElement): boolean {
  for (let index = 0; index < paragraph.attributes.length; index += 1) {
    const attribute = paragraph.attributes[index];
    if (
      attribute &&
      !isNamespaceDeclaration(attribute) &&
      attribute.namespaceURI !== OFFICE_REL_NS
    ) {
      return true;
    }
  }

  return directElementChildren(paragraph).some((child): boolean => {
    const localName = elementLocalName(child);
    return (
      child.namespaceURI !== WORD_NS ||
      !STANDARD_PARAGRAPH_CHILD_NAMES.has(localName)
    );
  });
}

function replaceParagraphProperties(
  sourceParagraph: XmlElement,
  generatedPropertiesXml: string,
): boolean {
  const sourceProperties = directWordChild(sourceParagraph, "pPr");
  if (!generatedPropertiesXml) {
    if (sourceProperties) {
      sourceParagraph.removeChild(sourceProperties);
    }
    return true;
  }

  const generatedProperties = parseGeneratedElement(
    generatedPropertiesXml,
    "pPr",
  );
  if (!generatedProperties) {
    return false;
  }

  const replacement = generatedProperties.cloneNode(true);
  if (sourceProperties) {
    sourceParagraph.replaceChild(replacement, sourceProperties);
  } else {
    sourceParagraph.insertBefore(replacement, sourceParagraph.firstChild);
  }
  return true;
}

/**
 * Overlays edited paragraph properties and one-to-one generated runs onto the
 * original source paragraph only when the paragraph envelope contains source-
 * only attributes, children or wrappers. Ordinary paragraphs use the canonical
 * serializer directly, avoiding unnecessary DOM normalization.
 */
export function overlayEditorParagraphOnOoxmlSource(
  paragraph: EditorParagraphNode,
  generatedParagraphPropertiesXml: string,
  generatedRunXml: string[],
  options: {
    hasOverrides: boolean;
    hasBoundaryTokens: boolean;
  },
): string | undefined {
  const sourceXml = getEditorParagraphOoxmlSource(paragraph)?.xml;
  if (
    !sourceXml ||
    options.hasOverrides ||
    options.hasBoundaryTokens ||
    paragraph.dropCap ||
    hasRelationshipReference(sourceXml)
  ) {
    return undefined;
  }

  const sourceParagraph = parseSourceParagraph(sourceXml);
  if (!sourceParagraph || !sourceParagraphNeedsOverlay(sourceParagraph)) {
    return undefined;
  }

  const sourceRuns = collectInlineRuns(sourceParagraph);
  if (sourceRuns.length !== generatedRunXml.length) {
    return undefined;
  }
  const generatedRuns = generatedRunXml.map((xml) =>
    parseGeneratedElement(xml, "r"),
  );
  if (generatedRuns.some((run): boolean => !run)) {
    return undefined;
  }

  if (
    !replaceParagraphProperties(
      sourceParagraph,
      generatedParagraphPropertiesXml,
    )
  ) {
    return undefined;
  }

  for (let index = 0; index < sourceRuns.length; index += 1) {
    sourceRuns[index]!.parentNode?.replaceChild(
      generatedRuns[index]!.cloneNode(true),
      sourceRuns[index]!,
    );
  }

  return new XMLSerializer().serializeToString(sourceParagraph);
}
