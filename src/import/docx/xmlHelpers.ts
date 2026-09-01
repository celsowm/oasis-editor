import { type Element as XmlElement } from "@xmldom/xmldom";
import {
  DEFAULT_MARKUP_COMPATIBILITY_CAPABILITIES,
  MARKUP_COMPATIBILITY_NS,
  extendMarkupCompatibilityCapabilities,
  getMarkupCompatibleChildren,
} from "./markupCompatibility.js";

export const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const DRAWINGML_NS =
  "http://schemas.openxmlformats.org/drawingml/2006/main";
export const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const WORD14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";
export const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";

const WORD14_MARKUP_COMPATIBILITY_CAPABILITIES =
  extendMarkupCompatibilityCapabilities(
    DEFAULT_MARKUP_COMPATIBILITY_CAPABILITIES,
    WORD14_NS,
  );
const WORD15_MARKUP_COMPATIBILITY_CAPABILITIES =
  extendMarkupCompatibilityCapabilities(
    DEFAULT_MARKUP_COMPATIBILITY_CAPABILITIES,
    WORD15_NS,
  );

export function getChildrenByTagNameNS(
  element: XmlElement | null | undefined,
  namespace: string,
  localName: string,
): XmlElement[] {
  if (!element) {
    return [];
  }

  return getMarkupCompatibleChildren(element).filter(
    (child): boolean =>
      child.namespaceURI === namespace && child.localName === localName,
  );
}

export type DocxTextDirection = "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV";

const DOCX_TEXT_DIRECTIONS: readonly DocxTextDirection[] = [
  "lrTb",
  "tbRl",
  "btLr",
  "lrTbV",
  "tbRlV",
];

export function parseTextDirection(
  value: string | null | undefined,
): DocxTextDirection | undefined {
  return DOCX_TEXT_DIRECTIONS.includes(value as DocxTextDirection)
    ? (value as DocxTextDirection)
    : undefined;
}

export function getFirstChildByTagNameNS(
  element: XmlElement | null | undefined,
  namespace: string,
  localName: string,
): XmlElement | null {
  return getChildrenByTagNameNS(element, namespace, localName)[0] ?? null;
}

export function getFirstW14Child(
  element: XmlElement | null | undefined,
  localName: string,
): XmlElement | null {
  if (!element) {
    return null;
  }
  return (
    getMarkupCompatibleChildren(
      element,
      WORD14_MARKUP_COMPATIBILITY_CAPABILITIES,
    ).find(
      (child): boolean =>
        child.namespaceURI === WORD14_NS && child.localName === localName,
    ) ?? null
  );
}

/** Finds a direct Word 2013 (`w15`) child while honoring MC choice semantics. */
export function getFirstW15Child(
  element: XmlElement | null | undefined,
  localName: string,
): XmlElement | null {
  if (!element) {
    return null;
  }
  return (
    getMarkupCompatibleChildren(
      element,
      WORD15_MARKUP_COMPATIBILITY_CAPABILITIES,
    ).find(
      (child): boolean =>
        child.namespaceURI === WORD15_NS && child.localName === localName,
    ) ?? null
  );
}

export function getAttributeValue(
  element: XmlElement | null,
  localName: string,
): string | null {
  if (!element) {
    return null;
  }
  return (
    element.getAttributeNS(WORD_NS, localName) ??
    element.getAttributeNS(WORD14_NS, localName) ??
    element.getAttributeNS(WORD15_NS, localName) ??
    element.getAttribute(`w:${localName}`) ??
    element.getAttribute(`w14:${localName}`) ??
    element.getAttribute(`w15:${localName}`) ??
    element.getAttribute(localName)
  );
}

export function findElementDeep(
  element: XmlElement,
  localName: string,
): XmlElement | null {
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes[index];
    if (node?.nodeType === 1) {
      const el = node as XmlElement;
      if (el.localName === localName) return el;
      const found = findElementDeep(el, localName);
      if (found) return found;
    }
  }
  return null;
}

export function collectExtAttributes(
  element: XmlElement,
): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  const attrs = element.attributes;
  for (let i = 0; i < attrs.length; i += 1) {
    const attr = attrs[i];
    if (!attr) continue;
    const ns = attr.namespaceURI;
    if (!ns || ns === WORD_NS || ns === MARKUP_COMPATIBILITY_NS) continue;
    if (attr.prefix === "xmlns" || attr.localName === "xmlns") continue;
    const localName = attr.localName ?? attr.name;
    if (!localName) continue;
    const name = attr.prefix ? `${attr.prefix}:${localName}` : localName;
    result[name] = attr.value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function isWordTrue(value: string | null | undefined): boolean {
  return value === "1" || value === "true" || value === "on";
}

export function parseOnOffProperty(
  parent: XmlElement,
  localName: string,
): boolean | undefined {
  const element = getFirstChildByTagNameNS(parent, WORD_NS, localName);
  if (!element) {
    return undefined;
  }

  const value = getAttributeValue(element, "val");
  if (value === null || value === undefined) {
    return true;
  }
  if (value === "0" || value === "false" || value === "off") {
    return false;
  }
  return isWordTrue(value);
}

export function parseStyleIdProperty(
  parent: XmlElement | null,
  localName: "pStyle" | "rStyle",
): string | undefined {
  const styleElement = getFirstChildByTagNameNS(parent, WORD_NS, localName);
  return getAttributeValue(styleElement, "val") ?? undefined;
}

export async function yieldToEventLoop(
  every: number,
  counter: number,
): Promise<void> {
  if (counter > 0 && counter % every === 0) {
    await new Promise<void>(
      (resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, 0),
    );
  }
}
