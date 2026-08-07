import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type { EditorTextRun } from "@/core/model.js";
import { mergeNestedExtensionMarkup } from "@/export/docx/opc/extensionMarkupMerge.js";
import {
  WORD14_NS,
  WORD_NS,
} from "@/export/docx/xmlUtils.js";
import {
  mergeRunOoxmlSourceIntoGeneratedXml,
} from "./sourceRunXml.js";
import { setEditorRunOoxmlSource } from "@/ooxml/word/sourceFragments.js";

const STYLE_SOURCE_RUN_ID = "ooxml-style-rpr-source";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

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

function parseRunProperties(xml: string): XmlElement | undefined {
  if (!xml) {
    return undefined;
  }
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD_NS && elementLocalName(root) === "rPr"
    ? root
    : undefined;
}

function parseSyntheticRun(xml: string): XmlElement | undefined {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD_NS && elementLocalName(root) === "r"
    ? root
    : undefined;
}

function directRunProperties(run: XmlElement): XmlElement | undefined {
  return directElementChildren(run).find(
    (child): boolean =>
      child.namespaceURI === WORD_NS && elementLocalName(child) === "rPr",
  );
}

function hasExtensionAttribute(element: XmlElement): boolean {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes[index];
    if (
      attribute &&
      attribute.namespaceURI !== WORD_NS &&
      attribute.namespaceURI !== XMLNS_NS &&
      attribute.prefix !== "xmlns" &&
      attribute.name !== "xmlns"
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Reuses the run serializer's canonical modeled-property vocabulary for a
 * standalone style `w:rPr`. Unknown Word children are handled by the existing
 * run merge; extension attributes/children nested inside modeled descendants
 * are then layered back without restoring missing Word semantics.
 */
export function mergeRunPropertiesXmlSource(
  sourceXml: string,
  generatedXml: string,
): string {
  const sourceProperties = parseRunProperties(sourceXml);
  if (!sourceProperties) {
    return generatedXml;
  }

  const sourceRunXml =
    `<w:r xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}">` +
    `${sourceXml}<w:t/></w:r>`;
  const generatedRunXml =
    `<w:r xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}">` +
    `${generatedXml}<w:t/></w:r>`;
  const syntheticRun: EditorTextRun = {
    id: STYLE_SOURCE_RUN_ID,
    kind: "text",
    text: "",
  };
  setEditorRunOoxmlSource(syntheticRun, sourceRunXml);

  const mergedRunXml = mergeRunOoxmlSourceIntoGeneratedXml(
    syntheticRun,
    generatedRunXml,
  );
  const mergedRun = parseSyntheticRun(mergedRunXml);
  if (!mergedRun) {
    return generatedXml;
  }

  let mergedProperties = directRunProperties(mergedRun);
  if (!mergedProperties && hasExtensionAttribute(sourceProperties)) {
    mergedProperties = mergedRun.ownerDocument!.createElementNS(
      WORD_NS,
      "w:rPr",
    ) as XmlElement;
    mergedRun.insertBefore(mergedProperties, mergedRun.firstChild);
  }
  if (!mergedProperties) {
    return "";
  }

  mergeNestedExtensionMarkup(sourceProperties, mergedProperties);
  if (
    directElementChildren(mergedProperties).length === 0 &&
    !hasExtensionAttribute(mergedProperties)
  ) {
    return "";
  }
  return new XMLSerializer().serializeToString(mergedProperties);
}
