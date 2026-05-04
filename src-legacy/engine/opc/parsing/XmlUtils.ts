import { DOMParser } from "@xmldom/xmldom";

export function parseXml(buffer: Uint8Array): any {
  const parser = new DOMParser();
  const text = new TextDecoder().decode(buffer);
  return parser.parseFromString(text, "application/xml");
}

export function childElements(parent: Element, localName: string): Element[] {
  const result: Element[] = [];
  if (!parent || !parent.childNodes) return result;
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i] as Element;
    if (child.nodeType === 1 && child.localName === localName) {
      result.push(child);
    }
  }
  return result;
}

export function firstChild(parent: Element | null, localName: string): Element | null {
  if (!parent || !parent.childNodes) return null;
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i] as Element;
    if (child.nodeType === 1 && child.localName === localName) return child;
  }
  return null;
}

export function getAttr(el: Element | null, name: string): string | null {
  if (!el) return null;
  const direct = el.getAttribute?.(name);
  if (direct !== null && direct !== undefined) return direct;
  if (el.attributes) {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (attr.localName === name || attr.name === name || attr.name.endsWith(":" + name)) {
        return attr.value;
      }
    }
  }
  return null;
}

export function hasChild(parent: Element | null, localName: string): boolean {
  return firstChild(parent, localName) !== null;
}

export function findDeep(el: Element | null, localName: string): Element | null {
  if (!el || el.nodeType !== 1) return null;
  if (el.localName === localName) return el;
  for (let i = 0; i < el.childNodes.length; i++) {
    const found = findDeep(el.childNodes[i] as Element, localName);
    if (found) return found;
  }
  return null;
}

export function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}
