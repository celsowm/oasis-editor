import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

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

function elementKey(element: XmlElement): string {
  return `${element.namespaceURI ?? ""}\u0000${elementLocalName(element)}`;
}

function copyMissingAttributes(source: XmlElement, target: XmlElement): void {
  for (let index = 0; index < source.attributes.length; index += 1) {
    const attribute = source.attributes.item(index);
    if (!attribute) {
      continue;
    }
    const localName = attribute.localName ?? attribute.name;
    const alreadyPresent = attribute.namespaceURI
      ? target.hasAttributeNS(attribute.namespaceURI, localName)
      : target.hasAttribute(attribute.name);
    if (alreadyPresent) {
      continue;
    }
    if (attribute.namespaceURI) {
      target.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
    } else {
      target.setAttribute(attribute.name, attribute.value);
    }
  }
}

/**
 * Preserves root-level producer/extension markup for a rewritten Word part.
 *
 * Word-namespace children are deliberately left to the semantic story model:
 * copying them here could resurrect a paragraph/table/content control that the
 * user intentionally removed. Non-Word children are opaque extension markup;
 * preserving them is safe because Oasis does not currently expose semantic
 * deletion/editing for those nodes. Namespace declarations and compatibility
 * attributes on the root are preserved as well.
 */
export function mergeWordPartRootExtensionsFromSource(
  sourceXml: string,
  rebuiltXml: string,
  expectedRootLocalName: string,
): string {
  const sourceDocument = new DOMParser().parseFromString(
    sourceXml,
    "application/xml",
  );
  const rebuiltDocument = new DOMParser().parseFromString(
    rebuiltXml,
    "application/xml",
  );
  const sourceRoot = sourceDocument.documentElement as XmlElement | undefined;
  const rebuiltRoot = rebuiltDocument.documentElement as XmlElement | undefined;
  if (
    !sourceRoot ||
    !rebuiltRoot ||
    sourceRoot.namespaceURI !== WORD_NS ||
    rebuiltRoot.namespaceURI !== WORD_NS ||
    elementLocalName(sourceRoot) !== expectedRootLocalName ||
    elementLocalName(rebuiltRoot) !== expectedRootLocalName
  ) {
    return rebuiltXml;
  }

  copyMissingAttributes(sourceRoot, rebuiltRoot);

  const sourceChildren = elementChildren(sourceRoot);
  const rebuiltChildren = elementChildren(rebuiltRoot);
  const rebuiltKeys = new Set(rebuiltChildren.map(elementKey));

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    if (
      sourceChild.namespaceURI === WORD_NS ||
      rebuiltKeys.has(elementKey(sourceChild))
    ) {
      return;
    }

    const nextRebuiltAnchor = sourceChildren
      .slice(sourceIndex + 1)
      .map((candidate): XmlElement | undefined =>
        rebuiltChildren.find(
          (rebuiltChild): boolean =>
            elementKey(rebuiltChild) === elementKey(candidate),
        ),
      )
      .find((candidate): candidate is XmlElement => Boolean(candidate));
    rebuiltRoot.insertBefore(sourceChild.cloneNode(true), nextRebuiltAnchor ?? null);
  });

  return new XMLSerializer().serializeToString(rebuiltDocument);
}
