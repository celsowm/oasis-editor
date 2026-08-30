import {
  DOMParser,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import { WORD_NS } from "@/export/docx/xmlUtils.js";

export type HeaderFooterStoryKind = "header" | "footer";

export interface HeaderFooterStoryReference {
  kind: HeaderFooterStoryKind;
  type: string;
  occurrence: number;
  relationshipId: string;
}

function elementChildren(node: XmlNode): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE)
      result.push(child as XmlElement);
  }
  return result;
}

function localName(element: XmlElement): string {
  return element.localName ?? element.tagName;
}

function attributeByLocalName(
  element: XmlElement,
  name: string,
): string | undefined {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute?.localName === name) return attribute.value;
  }
  return undefined;
}

/**
 * Reads active section header/footer references without assuming `w` or `r`
 * prefix spellings. The semantic identity is namespace URI + local name; the
 * relationship id is intentionally read by local name so Transitional, Strict
 * and producer-chosen relationship prefixes all remain discoverable.
 */
export function collectHeaderFooterStoryReferences(
  xml: string,
): HeaderFooterStoryReference[] {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement as XmlElement | undefined;
  if (!root) return [];

  const result: HeaderFooterStoryReference[] = [];
  const occurrenceByKindAndType = new Map<string, number>();

  const visit = (element: XmlElement): void => {
    if (
      element.namespaceURI === WORD_NS &&
      localName(element) === "sectPr" &&
      !(
        element.parentNode?.nodeType === element.ELEMENT_NODE &&
        localName(element.parentNode as XmlElement) === "sectPrChange"
      )
    ) {
      for (const child of elementChildren(element)) {
        if (child.namespaceURI !== WORD_NS) continue;
        const childName = localName(child);
        const kind: HeaderFooterStoryKind | undefined =
          childName === "headerReference"
            ? "header"
            : childName === "footerReference"
              ? "footer"
              : undefined;
        if (!kind) continue;
        const relationshipId = attributeByLocalName(child, "id");
        if (!relationshipId) continue;
        const type = attributeByLocalName(child, "type") ?? "default";
        const occurrenceKey = `${kind}:${type}`;
        const occurrence = occurrenceByKindAndType.get(occurrenceKey) ?? 0;
        occurrenceByKindAndType.set(occurrenceKey, occurrence + 1);
        result.push({ kind, type, occurrence, relationshipId });
      }
    }

    for (const child of elementChildren(element)) {
      // A historical sectPr stored inside sectPrChange is revision metadata,
      // not an active section definition and must not participate in pairing.
      if (
        child.namespaceURI === WORD_NS &&
        localName(child) === "sectPrChange"
      ) {
        continue;
      }
      visit(child);
    }
  };

  visit(root);
  return result;
}
