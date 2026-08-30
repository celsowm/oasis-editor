import { DOMParser, XMLSerializer, type Element as XmlElement, type Document as XmlDocument } from "@xmldom/xmldom";
import type { EditorSdtDataBinding } from "@/core/model.js";

export interface CustomXmlItem {
  id: string;
  partPath: string;
  xmlDoc: XmlDocument;
}

export class CustomXmlDataStore {
  private items: Map<string, CustomXmlItem> = new Map();

  public registerItem(id: string, partPath: string, xmlContent: string): void {
    const xmlDoc = new DOMParser().parseFromString(xmlContent, "application/xml");
    this.items.set(id, { id, partPath, xmlDoc });
  }

  public getItem(id: string): CustomXmlItem | undefined {
    return this.items.get(id);
  }

  public evaluateXPath(binding: EditorSdtDataBinding): string | undefined {
    if (!binding.storeItemID || !binding.xpath) return undefined;
    const item = this.items.get(binding.storeItemID);
    if (!item) return undefined;

    // Simple XPath evaluation for single element node or attribute name matching
    const cleanPath = binding.xpath.replace(/^\/+/, "");
    const parts = cleanPath.split("/").filter(Boolean);

    let current: XmlElement | null = item.xmlDoc.documentElement;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      if (!current) break;

      if (part.startsWith("@")) {
        const attrName = part.slice(1);
        return current.getAttribute(attrName) ?? undefined;
      }

      const localPart = part.includes(":") ? part.split(":")[1]! : part;
      if (i === 0 && (current.localName === localPart || current.tagName === part)) {
        continue;
      }

      let found: XmlElement | null = null;
      for (let j = 0; j < current.childNodes.length; j++) {
        const child = current.childNodes[j];
        if (child && child.nodeType === child.ELEMENT_NODE) {
          const elem = child as XmlElement;
          if (elem.localName === localPart || elem.tagName === part) {
            found = elem;
            break;
          }
        }
      }
      current = found;
    }

    if (current) {
      return current.textContent ?? undefined;
    }
    return undefined;
  }

  public updateXPathValue(binding: EditorSdtDataBinding, newValue: string): boolean {
    if (!binding.storeItemID || !binding.xpath) return false;
    const item = this.items.get(binding.storeItemID);
    if (!item) return false;

    const cleanPath = binding.xpath.replace(/^\/+/, "");
    const parts = cleanPath.split("/").filter(Boolean);

    let current: XmlElement | null = item.xmlDoc.documentElement;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      if (!current) break;

      if (part.startsWith("@")) {
        const attrName = part.slice(1);
        current.setAttribute(attrName, newValue);
        return true;
      }

      const localPart = part.includes(":") ? part.split(":")[1]! : part;
      if (i === 0 && (current.localName === localPart || current.tagName === part)) {
        continue;
      }

      let found: XmlElement | null = null;
      for (let j = 0; j < current.childNodes.length; j++) {
        const child = current.childNodes[j];
        if (child && child.nodeType === child.ELEMENT_NODE) {
          const elem = child as XmlElement;
          if (elem.localName === localPart || elem.tagName === part) {
            found = elem;
            break;
          }
        }
      }
      current = found;
    }

    if (current) {
      current.textContent = newValue;
      return true;
    }
    return false;
  }

  public serializeItem(id: string): string | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;
    return new XMLSerializer().serializeToString(item.xmlDoc);
  }
}
