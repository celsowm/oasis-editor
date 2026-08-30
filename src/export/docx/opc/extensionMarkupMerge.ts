import type { Element as XmlElement, Node as XmlNode } from "@xmldom/xmldom";
import { OFFICE_REL_NS, WORD_NS } from "@/export/docx/xmlUtils.js";

function elementChildren(node: XmlNode): XmlElement[] {
  const children: XmlElement[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE) {
      children.push(child as XmlElement);
    }
  }
  return children;
}

function elementLocalName(element: XmlElement): string {
  return element.localName ?? element.tagName;
}

function elementKey(element: XmlElement): string {
  return `${element.namespaceURI ?? ""}\u0000${elementLocalName(element)}`;
}

function copyExtensionAttributes(
  source: XmlElement,
  generated: XmlElement,
): void {
  for (let index = 0; index < source.attributes.length; index += 1) {
    const attribute = source.attributes[index];
    if (
      !attribute ||
      attribute.namespaceURI === WORD_NS ||
      attribute.namespaceURI === OFFICE_REL_NS
    ) {
      continue;
    }
    const localName = attribute.localName ?? attribute.name;
    const hasAttribute = attribute.namespaceURI
      ? generated.hasAttributeNS(attribute.namespaceURI, localName)
      : generated.hasAttribute(attribute.name);
    if (hasAttribute) {
      continue;
    }
    if (attribute.namespaceURI) {
      generated.setAttributeNS(
        attribute.namespaceURI,
        attribute.name,
        attribute.value,
      );
    } else {
      generated.setAttribute(attribute.name, attribute.value);
    }
  }
}

function matchingChildByOccurrence(
  sourceChildren: XmlElement[],
  sourceIndex: number,
  generatedChildren: XmlElement[],
): XmlElement | undefined {
  const key = elementKey(sourceChildren[sourceIndex]!);
  let occurrence = 0;
  for (let index = 0; index < sourceIndex; index += 1) {
    if (elementKey(sourceChildren[index]!) === key) {
      occurrence += 1;
    }
  }
  return generatedChildren.filter(
    (candidate): boolean => elementKey(candidate) === key,
  )[occurrence];
}

/**
 * Recursively carries extension-namespace markup through a generated Word
 * subtree. WordprocessingML attributes/children that disappeared from the
 * generated form are never restored, so preservation cannot undo an editor
 * deletion or overwrite canonical modeled semantics.
 */
export function mergeNestedExtensionMarkup(
  source: XmlElement,
  generated: XmlElement,
): void {
  copyExtensionAttributes(source, generated);
  const sourceChildren = elementChildren(source);
  const generatedChildren = elementChildren(generated);

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const generatedChild = matchingChildByOccurrence(
      sourceChildren,
      sourceIndex,
      generatedChildren,
    );
    if (sourceChild.namespaceURI === WORD_NS) {
      if (generatedChild) {
        mergeNestedExtensionMarkup(sourceChild, generatedChild);
      }
      return;
    }

    if (generatedChild) {
      mergeNestedExtensionMarkup(sourceChild, generatedChild);
      return;
    }

    const anchor = sourceChildren
      .slice(sourceIndex + 1)
      .map((candidate, offset): XmlElement | undefined =>
        matchingChildByOccurrence(
          sourceChildren,
          sourceIndex + offset + 1,
          generatedChildren,
        ),
      )
      .find((candidate): candidate is XmlElement => Boolean(candidate));
    generated.insertBefore(sourceChild.cloneNode(true), anchor ?? null);
  });
}
