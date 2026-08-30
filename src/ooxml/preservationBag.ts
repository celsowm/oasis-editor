import { XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import { getOrderIndex } from "./schemaOrder.js";

export interface PreservedXmlAttribute {
  name: string;
  value: string;
}

export interface PreservedXmlElement {
  tagName: string;
  localName: string;
  prefix?: string;
  xml: string;
  schemaIndex: number;
}

export class PreservationBag {
  public attributes: PreservedXmlAttribute[] = [];
  public children: PreservedXmlElement[] = [];

  public captureAttributes(
    element: XmlElement,
    knownAttributeNames: ReadonlySet<string> = new Set(),
  ): void {
    if (!element.attributes) return;
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (!attr) continue;
      const name = attr.name;
      if (
        name.startsWith("xmlns") ||
        knownAttributeNames.has(name) ||
        knownAttributeNames.has(attr.localName ?? name)
      ) {
        continue;
      }
      this.attributes.push({ name: attr.name, value: attr.value });
    }
  }

  public captureUnmappedChildren(
    element: XmlElement,
    knownChildNames: ReadonlySet<string>,
    schemaOrder: readonly string[],
  ): void {
    const serializer = new XMLSerializer();
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      if (!child || child.nodeType !== child.ELEMENT_NODE) continue;
      const elem = child as XmlElement;
      const localName =
        elem.localName ??
        (elem.tagName.includes(":")
          ? elem.tagName.split(":")[1]!
          : elem.tagName);
      const prefix = elem.tagName.includes(":")
        ? elem.tagName.split(":")[0]
        : undefined;

      if (
        !knownChildNames.has(localName) &&
        !knownChildNames.has(elem.tagName)
      ) {
        const xml = serializer.serializeToString(elem);
        const schemaIndex = getOrderIndex(localName, schemaOrder);
        this.children.push({
          tagName: elem.tagName,
          localName,
          prefix,
          xml,
          schemaIndex,
        });
      }
    }
  }

  public serializeAttributes(): string {
    if (this.attributes.length === 0) return "";
    return this.attributes.map((a) => `${a.name}="${a.value}"`).join(" ");
  }

  public getChildrenForInsertion(
    schemaOrder: readonly string[],
    currentLocalName: string,
  ): PreservedXmlElement[] {
    const currentIndex = getOrderIndex(currentLocalName, schemaOrder);
    return this.children.filter((child) => child.schemaIndex <= currentIndex);
  }
}
