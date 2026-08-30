import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const MODELED_SECTION_PROPERTY_NAMES = new Set([
  "headerReference",
  "footerReference",
  "type",
  "pgSz",
  "pgMar",
  "pgNumType",
  "cols",
  "vAlign",
  "bidi",
]);

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

function collectActiveSectionProperties(document: XmlNode): XmlElement[] {
  const result: XmlElement[] = [];
  const visit = (node: XmlNode): void => {
    for (const child of elementChildren(node)) {
      if (
        child.namespaceURI === WORD_NS &&
        elementLocalName(child) === "sectPr" &&
        (child.parentNode as XmlElement | null)?.localName !== "sectPrChange"
      ) {
        result.push(child);
      }
      visit(child);
    }
  };
  visit(document);
  return result;
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
      target.setAttributeNS(
        attribute.namespaceURI,
        attribute.name,
        attribute.value,
      );
    } else {
      target.setAttribute(attribute.name, attribute.value);
    }
  }
}

function isModeledSectionProperty(element: XmlElement): boolean {
  return (
    element.namespaceURI === WORD_NS &&
    MODELED_SECTION_PROPERTY_NAMES.has(elementLocalName(element))
  );
}

function mergeSectionProperties(source: XmlElement, target: XmlElement): void {
  copyMissingAttributes(source, target);

  const sourceChildren = elementChildren(source);
  const targetChildren = elementChildren(target);
  const targetByKey = new Map<string, XmlElement[]>();
  for (const child of targetChildren) {
    const key = elementKey(child);
    const existing = targetByKey.get(key);
    if (existing) {
      existing.push(child);
    } else {
      targetByKey.set(key, [child]);
    }
  }

  const seenSourceOccurrences = new Map<string, number>();
  for (
    let sourceIndex = 0;
    sourceIndex < sourceChildren.length;
    sourceIndex += 1
  ) {
    const sourceChild = sourceChildren[sourceIndex]!;
    const key = elementKey(sourceChild);
    const occurrence = seenSourceOccurrences.get(key) ?? 0;
    seenSourceOccurrences.set(key, occurrence + 1);
    const matchingTarget = targetByKey.get(key)?.[occurrence];

    if (matchingTarget) {
      // Canonical generated values remain authoritative, but producer-specific
      // attributes on a modeled child still survive when Oasis does not emit
      // an equivalent attribute itself.
      copyMissingAttributes(sourceChild, matchingTarget);
      continue;
    }

    if (isModeledSectionProperty(sourceChild)) {
      // A missing modeled child can be intentional (for example, changing a
      // multi-column section back to one column). Do not resurrect stale
      // source semantics merely for byte-level preservation.
      continue;
    }

    // Preserve source-only children in their original relative position. Find
    // the next source sibling that has a generated counterpart and insert
    // before it; otherwise append at the end of sectPr.
    const nextTargetAnchor = sourceChildren
      .slice(sourceIndex + 1)
      .map(
        (candidate): XmlElement | undefined =>
          targetByKey.get(elementKey(candidate))?.[0],
      )
      .find((candidate): candidate is XmlElement => Boolean(candidate));
    target.insertBefore(sourceChild.cloneNode(true), nextTargetAnchor ?? null);
  }
}

/**
 * Overlays source-only document/section markup onto a rebuilt document.xml.
 *
 * The rebuilt document remains authoritative for the OOXML surface Oasis
 * models. Unknown root attributes, unknown sectPr attributes/children, and
 * producer-specific extensions are retained as long as section topology is
 * unchanged. Relationship/content-type preservation is handled by the outer
 * source-package patcher.
 */
export function mergeRebuiltDocumentSectionPropertiesFromSource(
  sourceXml: string,
  rebuiltXml: string,
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
  if (!sourceRoot || !rebuiltRoot) {
    return rebuiltXml;
  }

  const sourceSections = collectActiveSectionProperties(sourceDocument);
  const rebuiltSections = collectActiveSectionProperties(rebuiltDocument);
  if (
    sourceSections.length === 0 ||
    sourceSections.length !== rebuiltSections.length
  ) {
    return rebuiltXml;
  }

  // Carry namespace declarations and compatibility attributes required by
  // preserved extension markup (for example xmlns:w15 + mc:Ignorable).
  copyMissingAttributes(sourceRoot, rebuiltRoot);

  sourceSections.forEach((sourceSection, index): void => {
    mergeSectionProperties(sourceSection, rebuiltSections[index]!);
  });

  return new XMLSerializer().serializeToString(rebuiltDocument);
}
