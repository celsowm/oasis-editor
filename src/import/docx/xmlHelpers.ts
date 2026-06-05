import { type Element as XmlElement } from "@xmldom/xmldom";

export const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const DRAWINGML_NS =
  "http://schemas.openxmlformats.org/drawingml/2006/main";
export const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const WORD14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";

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
    if (
      node?.nodeType === node.ELEMENT_NODE &&
      (node as XmlElement).namespaceURI === namespace &&
      (node as XmlElement).localName === localName
    ) {
      result.push(node as XmlElement);
    }
  }
  return result;
}

export function getFirstChildByTagNameNS(
  element: XmlElement | null | undefined,
  namespace: string,
  localName: string,
): XmlElement | null {
  return getChildrenByTagNameNS(element, namespace, localName)[0] ?? null;
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
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}
