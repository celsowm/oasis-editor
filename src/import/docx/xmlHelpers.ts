import { type Element as XmlElement } from "@xmldom/xmldom";

export const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const DRAWINGML_NS =
  "http://schemas.openxmlformats.org/drawingml/2006/main";
export const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const WORD14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";
const MARKUP_COMPAT_NS =
  "http://schemas.openxmlformats.org/markup-compatibility/2006";

export function getChildrenByTagNameNS(
  element: XmlElement | null | undefined,
  namespace: string,
  localName: string,
): XmlElement[] {
  if (!element) {
    return [];
  }

  const result: XmlElement[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) continue;
    const el = node as XmlElement;

    // mc:AlternateContent: select the mc:Fallback child so that versioned
    // extension blocks degrade transparently to their standard fallback.
    if (
      el.namespaceURI === MARKUP_COMPAT_NS &&
      el.localName === "AlternateContent"
    ) {
      for (let j = 0; j < el.childNodes.length; j += 1) {
        const child = el.childNodes[j];
        if (child?.nodeType !== child.ELEMENT_NODE) continue;
        const childEl = child as XmlElement;
        if (
          childEl.namespaceURI === MARKUP_COMPAT_NS &&
          childEl.localName === "Fallback"
        ) {
          result.push(...getChildrenByTagNameNS(childEl, namespace, localName));
          break;
        }
      }
      continue;
    }

    if (el.namespaceURI === namespace && el.localName === localName) {
      result.push(el);
    }
  }
  return result;
}

export type DocxTextDirection = "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV";

const DOCX_TEXT_DIRECTIONS: readonly DocxTextDirection[] = [
  "lrTb",
  "tbRl",
  "btLr",
  "lrTbV",
  "tbRlV",
];

/** Validate a raw `w:textDirection/@w:val` token, or return undefined. */
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

/**
 * Finds a direct `w14:localName` child of `element`, also searching inside
 * `mc:AlternateContent/mc:Choice` branches (which carry w14 markup in files
 * produced by modern Word). The `mc:Fallback` branch used by
 * `getChildrenByTagNameNS` would not contain w14 elements, so a separate
 * helper is needed for these extension elements.
 */
export function getFirstW14Child(
  element: XmlElement | null | undefined,
  localName: string,
): XmlElement | null {
  if (!element) return null;
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    if (node?.nodeType !== node.ELEMENT_NODE) continue;
    const el = node as XmlElement;
    if (el.namespaceURI === WORD14_NS && el.localName === localName) {
      return el;
    }
    if (
      el.namespaceURI === MARKUP_COMPAT_NS &&
      el.localName === "AlternateContent"
    ) {
      for (let j = 0; j < el.childNodes.length; j++) {
        const child = el.childNodes[j];
        if (child?.nodeType !== child.ELEMENT_NODE) continue;
        const choiceEl = child as XmlElement;
        if (
          choiceEl.namespaceURI === MARKUP_COMPAT_NS &&
          choiceEl.localName === "Choice"
        ) {
          for (let k = 0; k < choiceEl.childNodes.length; k++) {
            const gc = choiceEl.childNodes[k];
            if (gc?.nodeType !== gc.ELEMENT_NODE) continue;
            const gcEl = gc as XmlElement;
            if (
              gcEl.namespaceURI === WORD14_NS &&
              gcEl.localName === localName
            ) {
              return gcEl;
            }
          }
        }
      }
    }
  }
  return null;
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
    element.getAttribute(`w:${localName}`) ??
    element.getAttribute(`w14:${localName}`) ??
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

/**
 * Collects non-WORD_NS extension attributes (e.g. `w14:paraId`, `w15:*`) from
 * a table/row/cell element for round-trip preservation.
 */
export function collectExtAttributes(
  element: XmlElement,
): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  const attrs = element.attributes;
  for (let i = 0; i < attrs.length; i += 1) {
    const attr = attrs[i];
    if (!attr) continue;
    const ns = attr.namespaceURI;
    if (!ns || ns === WORD_NS) continue;
    // Skip namespace declarations and markup-compat attributes
    if (attr.prefix === "xmlns" || attr.localName === "xmlns") continue;
    result[`${attr.prefix}:${attr.localName}`] = attr.value;
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
    await new Promise<void>((resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, 0));
  }
}
