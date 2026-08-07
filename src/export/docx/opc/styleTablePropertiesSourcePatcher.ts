import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import type { EditorDocxSourcePackage } from "@/core/model.js";
import { mergeParagraphPropertiesXmlSource } from "@/export/docx/text/sourceParagraphPropertiesXml.js";
import { mergeRunPropertiesXmlSource } from "@/export/docx/text/sourceRunPropertiesXml.js";
import {
  mergeTableCellPropertiesXmlSource,
  mergeTablePropertiesXmlSource,
  mergeTableRowPropertiesXmlSource,
} from "@/export/docx/tableSourcePropertiesXml.js";
import { WORD_NS } from "@/export/docx/xmlUtils.js";

const REBUILT_STYLES_PATH = "word/styles.xml";
const CONDITIONAL_PROPERTY_NAMES = new Set(["pPr", "rPr", "tblPr", "trPr", "tcPr"]);

function elementChildren(node: XmlNode): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE) result.push(child as XmlElement);
  }
  return result;
}

function localName(element: XmlElement): string {
  return element.localName ?? element.tagName;
}

function key(element: XmlElement): string {
  return `${element.namespaceURI ?? ""}\u0000${localName(element)}`;
}

function attr(element: XmlElement, name: string): string | undefined {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute?.localName === name) return attribute.value;
  }
  return undefined;
}

function copyMissingAttributes(source: XmlElement, target: XmlElement): void {
  for (let index = 0; index < source.attributes.length; index += 1) {
    const attribute = source.attributes.item(index);
    if (!attribute) continue;
    const name = attribute.localName ?? attribute.name;
    const exists = attribute.namespaceURI
      ? target.hasAttributeNS(attribute.namespaceURI, name)
      : target.hasAttribute(attribute.name);
    if (exists) continue;
    if (attribute.namespaceURI) {
      target.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
    } else {
      target.setAttribute(attribute.name, attribute.value);
    }
  }
}

function directWordChild(parent: XmlElement, name: string): XmlElement | undefined {
  return elementChildren(parent).find(
    (child): boolean => child.namespaceURI === WORD_NS && localName(child) === name,
  );
}

function serialize(element: XmlElement | undefined): string {
  return element ? new XMLSerializer().serializeToString(element) : "";
}

function parseWordElement(xml: string, expected: string): XmlElement | undefined {
  if (!xml) return undefined;
  const root = new DOMParser().parseFromString(xml, "application/xml")
    .documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD_NS && localName(root) === expected
    ? root
    : undefined;
}

function mergePropertyXml(name: string, sourceXml: string, generatedXml: string): string {
  switch (name) {
    case "pPr":
      return mergeParagraphPropertiesXmlSource(sourceXml, generatedXml);
    case "rPr":
      return mergeRunPropertiesXmlSource(sourceXml, generatedXml);
    case "tblPr":
      return mergeTablePropertiesXmlSource(sourceXml, generatedXml);
    case "trPr":
      return mergeTableRowPropertiesXmlSource(sourceXml, generatedXml);
    case "tcPr":
      return mergeTableCellPropertiesXmlSource(sourceXml, generatedXml);
    default:
      return generatedXml;
  }
}

function firstConditionalStyleBlock(container: XmlElement): XmlElement | undefined {
  return elementChildren(container).find(
    (child): boolean =>
      child.namespaceURI === WORD_NS && localName(child) === "tblStylePr",
  );
}

function propertyInsertionAnchor(
  sourceContainer: XmlElement,
  targetContainer: XmlElement,
  source: XmlElement,
  propertyName: string,
): XmlElement | null {
  const sourceChildren = elementChildren(sourceContainer);
  const sourceIndex = sourceChildren.indexOf(source);
  const nextSourceProperty = sourceChildren
    .slice(sourceIndex + 1)
    .find(
      (candidate): boolean =>
        candidate.namespaceURI === WORD_NS &&
        CONDITIONAL_PROPERTY_NAMES.has(localName(candidate)),
    );
  if (nextSourceProperty) {
    return directWordChild(targetContainer, localName(nextSourceProperty)) ?? null;
  }

  // CT_Style requires direct pPr/rPr/tblPr/trPr/tcPr properties before the
  // repeating tblStylePr conditional blocks. A source-only opaque tblPr can be
  // absent from the canonical rebuild, so appending it would produce the right
  // data in the wrong schema position. Anchor the direct property before the
  // first conditional block when the source container is a named style.
  if (
    sourceContainer.namespaceURI === WORD_NS &&
    localName(sourceContainer) === "style" &&
    CONDITIONAL_PROPERTY_NAMES.has(propertyName)
  ) {
    return firstConditionalStyleBlock(targetContainer) ?? null;
  }

  return null;
}

function replaceOrInsertProperty(
  sourceContainer: XmlElement,
  targetContainer: XmlElement,
  name: string,
): boolean {
  const source = directWordChild(sourceContainer, name);
  if (!source) return false;
  const target = directWordChild(targetContainer, name);
  const generatedXml = serialize(target);
  const mergedXml = mergePropertyXml(name, serialize(source), generatedXml);
  if (mergedXml === generatedXml) return false;

  if (!mergedXml) {
    if (target) {
      targetContainer.removeChild(target);
      return true;
    }
    return false;
  }
  const replacement = parseWordElement(mergedXml, name);
  if (!replacement) return false;
  const clone = replacement.cloneNode(true) as XmlElement;
  if (target) {
    targetContainer.replaceChild(clone, target);
    return true;
  }

  targetContainer.insertBefore(
    clone,
    propertyInsertionAnchor(sourceContainer, targetContainer, source, name),
  );
  return true;
}

function mergeConditionalContainer(source: XmlElement, target: XmlElement): boolean {
  copyMissingAttributes(source, target);
  let changed = false;
  for (const name of CONDITIONAL_PROPERTY_NAMES) {
    changed = replaceOrInsertProperty(source, target, name) || changed;
  }

  const targetKeys = new Set(elementChildren(target).map(key));
  for (const sourceChild of elementChildren(source)) {
    if (
      sourceChild.namespaceURI === WORD_NS &&
      CONDITIONAL_PROPERTY_NAMES.has(localName(sourceChild))
    ) {
      continue;
    }
    if (!targetKeys.has(key(sourceChild))) {
      target.appendChild(sourceChild.cloneNode(true));
      targetKeys.add(key(sourceChild));
      changed = true;
    }
  }
  return changed;
}

function filteredOpaqueConditional(source: XmlElement): XmlElement | undefined {
  const document = source.ownerDocument;
  if (!document) return undefined;
  const result = document.createElementNS(WORD_NS, "w:tblStylePr") as XmlElement;
  copyMissingAttributes(source, result);
  let preserved = false;

  for (const sourceChild of elementChildren(source)) {
    const name = localName(sourceChild);
    if (sourceChild.namespaceURI === WORD_NS && CONDITIONAL_PROPERTY_NAMES.has(name)) {
      const filteredXml = mergePropertyXml(name, serialize(sourceChild), "");
      const filtered = parseWordElement(filteredXml, name);
      if (filtered) {
        result.appendChild(filtered.cloneNode(true));
        preserved = true;
      }
      continue;
    }
    result.appendChild(sourceChild.cloneNode(true));
    preserved = true;
  }

  // `w:type` only identifies the conditional block. Do not resurrect an empty
  // block merely because that required identity attribute exists.
  return preserved ? result : undefined;
}

function conditionalKey(element: XmlElement): string | undefined {
  if (element.namespaceURI !== WORD_NS || localName(element) !== "tblStylePr") {
    return undefined;
  }
  const type = attr(element, "type");
  return type ? `tblStylePr:${type}` : undefined;
}

function mergeOneTableStyle(sourceStyle: XmlElement, targetStyle: XmlElement): boolean {
  let changed = false;

  // Direct table properties on the named table style.
  changed = replaceOrInsertProperty(sourceStyle, targetStyle, "tblPr") || changed;

  const sourceConditionals = elementChildren(sourceStyle).filter(
    (child): boolean => conditionalKey(child) !== undefined,
  );
  const targetByKey = new Map<string, XmlElement>();
  for (const child of elementChildren(targetStyle)) {
    const childKey = conditionalKey(child);
    if (childKey) targetByKey.set(childKey, child);
  }

  for (const sourceConditional of sourceConditionals) {
    const sourceKey = conditionalKey(sourceConditional)!;
    const targetConditional = targetByKey.get(sourceKey);
    if (targetConditional) {
      changed = mergeConditionalContainer(sourceConditional, targetConditional) || changed;
      continue;
    }

    const opaqueOnly = filteredOpaqueConditional(sourceConditional);
    if (!opaqueOnly) continue;
    const sourceChildren = elementChildren(sourceStyle);
    const sourceIndex = sourceChildren.indexOf(sourceConditional);
    const nextConditional = sourceChildren
      .slice(sourceIndex + 1)
      .find((candidate): boolean => conditionalKey(candidate) !== undefined);
    const anchor = nextConditional
      ? targetByKey.get(conditionalKey(nextConditional)!) ?? null
      : null;
    targetStyle.insertBefore(opaqueOnly.cloneNode(true), anchor);
    changed = true;
  }
  return changed;
}

function stylesRoot(xml: string): XmlElement | undefined {
  const root = new DOMParser().parseFromString(xml, "application/xml")
    .documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD_NS && localName(root) === "styles" ? root : undefined;
}

function sourceStylesXml(sourcePackage: EditorDocxSourcePackage): string | undefined {
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

export function mergeTableStylePropertiesOoxmlSource(
  sourceXml: string,
  rebuiltXml: string,
): string {
  const sourceRoot = stylesRoot(sourceXml);
  const rebuiltRoot = stylesRoot(rebuiltXml);
  if (!sourceRoot || !rebuiltRoot) return rebuiltXml;

  const rebuiltStyles = new Map<string, XmlElement>();
  for (const style of elementChildren(rebuiltRoot)) {
    if (style.namespaceURI === WORD_NS && localName(style) === "style") {
      const id = attr(style, "styleId");
      if (id) rebuiltStyles.set(id, style);
    }
  }

  let changed = false;
  for (const sourceStyle of elementChildren(sourceRoot)) {
    if (sourceStyle.namespaceURI !== WORD_NS || localName(sourceStyle) !== "style") continue;
    if (attr(sourceStyle, "type") !== "table") continue;
    const id = attr(sourceStyle, "styleId");
    const target = id ? rebuiltStyles.get(id) : undefined;
    if (target) changed = mergeOneTableStyle(sourceStyle, target) || changed;
  }

  return changed
    ? new XMLSerializer().serializeToString(rebuiltRoot.ownerDocument!)
    : rebuiltXml;
}

export async function patchRebuiltTableStylePropertiesFromSource(
  sourcePackage: EditorDocxSourcePackage,
  rebuilt: JSZip,
): Promise<boolean> {
  const sourceXml = sourceStylesXml(sourcePackage);
  const rebuiltEntry = rebuilt.file(REBUILT_STYLES_PATH);
  if (!sourceXml || !rebuiltEntry) return false;
  const rebuiltXml = await rebuiltEntry.async("string");
  const mergedXml = mergeTableStylePropertiesOoxmlSource(sourceXml, rebuiltXml);
  if (mergedXml === rebuiltXml) return false;
  rebuilt.file(REBUILT_STYLES_PATH, mergedXml);
  return true;
}
