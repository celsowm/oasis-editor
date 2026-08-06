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

function directWordChild(
  element: XmlElement,
  localName: string,
): XmlElement | undefined {
  return directElementChildren(element).find(
    (child): boolean =>
      child.namespaceURI === WORD_NS && child.localName === localName,
  );
}

function collectInlineRuns(paragraph: XmlElement): XmlElement[] {
  const runs: XmlElement[] = [];
  const visit = (container: XmlElement): void => {
    for (const child of directElementChildren(container)) {
      if (child.namespaceURI === WORD_NS && child.localName === "r") {
        runs.push(child);
        continue;
      }
      if (
        child.namespaceURI === WORD_NS &&
        (child.localName === "pPr" ||
          child.localName === "p" ||
          child.localName === "tbl" ||
          child.localName === "txbxContent")
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
  return root?.namespaceURI === WORD_NS && root.localName === "p"
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
    children[0]!.localName === expectedLocalName
    ? children[0]
    : undefined;
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
 * original source paragraph. Every unmodelled direct child or wrapper remains
 * in place. The operation declines unsafe cases (relationships, regenerated
 * boundaries, table-cell overrides, drop caps, run-count changes, or generated
 * wrappers that are not a single w:r), letting the normal serializer take over.
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
  if (!sourceParagraph) {
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
