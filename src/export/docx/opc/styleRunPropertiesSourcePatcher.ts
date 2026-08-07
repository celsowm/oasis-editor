import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import type { EditorDocxSourcePackage } from "@/core/model.js";
import { mergeRunPropertiesXmlSource } from "@/export/docx/text/sourceRunPropertiesXml.js";
import { WORD_NS } from "@/export/docx/xmlUtils.js";

const REBUILT_STYLES_PATH = "word/styles.xml";

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

function directWordChild(
  element: XmlElement,
  localName: string,
): XmlElement | undefined {
  return elementChildren(element).find(
    (child): boolean =>
      child.namespaceURI === WORD_NS && elementLocalName(child) === localName,
  );
}

function parseStylesRoot(xml: string): XmlElement | undefined {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD_NS && elementLocalName(root) === "styles"
    ? root
    : undefined;
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

function sourceStylesXml(
  sourcePackage: EditorDocxSourcePackage,
): string | undefined {
  const mainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  const relationship = mainPart?.relationships?.find(
    (candidate): boolean =>
      candidate.targetMode !== "External" &&
      candidate.type.endsWith("/styles") &&
      Boolean(candidate.resolvedTarget),
  );
  const part = relationship?.resolvedTarget
    ? sourcePackage.parts[relationship.resolvedTarget]
    : undefined;
  return part?.kind === "xml" ? part.data : undefined;
}

function insertAtSourcePosition(
  sourceStyle: XmlElement,
  targetStyle: XmlElement,
  sourceProperties: XmlElement,
  replacement: XmlElement,
): void {
  const sourceChildren = elementChildren(sourceStyle);
  const sourceIndex = sourceChildren.indexOf(sourceProperties);
  const targetChildren = elementChildren(targetStyle);
  const anchor = sourceChildren
    .slice(sourceIndex + 1)
    .map((sourceChild): XmlElement | undefined =>
      targetChildren.find(
        (targetChild): boolean =>
          targetChild.namespaceURI === sourceChild.namespaceURI &&
          elementLocalName(targetChild) === elementLocalName(sourceChild),
      ),
    )
    .find((candidate): candidate is XmlElement => Boolean(candidate));
  targetStyle.insertBefore(replacement, anchor ?? null);
}

function mergeOneStyleRunProperties(
  sourceStyle: XmlElement,
  targetStyle: XmlElement,
): boolean {
  const sourceProperties = directWordChild(sourceStyle, "rPr");
  if (!sourceProperties) {
    return false;
  }
  const targetProperties = directWordChild(targetStyle, "rPr");
  const serializer = new XMLSerializer();
  const sourceXml = serializer.serializeToString(sourceProperties);
  const generatedXml = targetProperties
    ? serializer.serializeToString(targetProperties)
    : "";
  const mergedXml = mergeRunPropertiesXmlSource(sourceXml, generatedXml);
  if (mergedXml === generatedXml) {
    return false;
  }

  if (!mergedXml) {
    if (targetProperties) {
      targetStyle.removeChild(targetProperties);
      return true;
    }
    return false;
  }

  const mergedProperties = parseRunProperties(mergedXml);
  if (!mergedProperties) {
    return false;
  }
  const replacement = mergedProperties.cloneNode(true) as XmlElement;
  if (targetProperties) {
    targetStyle.replaceChild(replacement, targetProperties);
  } else {
    insertAtSourcePosition(
      sourceStyle,
      targetStyle,
      sourceProperties,
      replacement,
    );
  }
  return true;
}

export function mergeStyleRunPropertiesOoxmlSource(
  sourceXml: string,
  rebuiltXml: string,
): string {
  const sourceRoot = parseStylesRoot(sourceXml);
  const rebuiltRoot = parseStylesRoot(rebuiltXml);
  if (!sourceRoot || !rebuiltRoot) {
    return rebuiltXml;
  }

  const rebuiltStylesById = new Map<string, XmlElement>();
  for (const style of elementChildren(rebuiltRoot)) {
    if (style.namespaceURI !== WORD_NS || elementLocalName(style) !== "style") {
      continue;
    }
    const styleId = getAttributeByLocalName(style, "styleId");
    if (styleId) {
      rebuiltStylesById.set(styleId, style);
    }
  }

  let changed = false;
  for (const sourceStyle of elementChildren(sourceRoot)) {
    if (
      sourceStyle.namespaceURI !== WORD_NS ||
      elementLocalName(sourceStyle) !== "style"
    ) {
      continue;
    }
    const styleId = getAttributeByLocalName(sourceStyle, "styleId");
    const targetStyle = styleId ? rebuiltStylesById.get(styleId) : undefined;
    if (targetStyle) {
      changed = mergeOneStyleRunProperties(sourceStyle, targetStyle) || changed;
    }
  }

  return changed
    ? new XMLSerializer().serializeToString(rebuiltRoot.ownerDocument!)
    : rebuiltXml;
}

export async function patchRebuiltStyleRunPropertiesFromSource(
  sourcePackage: EditorDocxSourcePackage,
  rebuilt: JSZip,
): Promise<boolean> {
  const sourceXml = sourceStylesXml(sourcePackage);
  const rebuiltEntry = rebuilt.file(REBUILT_STYLES_PATH);
  if (!sourceXml || !rebuiltEntry) {
    return false;
  }
  const rebuiltXml = await rebuiltEntry.async("string");
  const mergedXml = mergeStyleRunPropertiesOoxmlSource(sourceXml, rebuiltXml);
  if (mergedXml === rebuiltXml) {
    return false;
  }
  rebuilt.file(REBUILT_STYLES_PATH, mergedXml);
  return true;
}
