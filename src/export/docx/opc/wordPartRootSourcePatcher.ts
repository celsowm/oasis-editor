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

function getAttributeByLocalName(
  element: XmlElement,
  localName: string,
): string | undefined {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute?.localName === localName) {
      return attribute.value;
    }
  }
  return undefined;
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

function directWordChild(
  element: XmlElement,
  localName: string,
): XmlElement | undefined {
  return elementChildren(element).find(
    (child): boolean =>
      child.namespaceURI === WORD_NS &&
      elementLocalName(child) === localName,
  );
}

function modeledChildren(
  elements: XmlElement[],
  modeledNames: ReadonlySet<string>,
): XmlElement[] {
  return elements.filter(
    (element): boolean =>
      element.namespaceURI === WORD_NS &&
      modeledNames.has(elementLocalName(element)),
  );
}

function storyAnchorIdentity(element: XmlElement): string | undefined {
  if (element.namespaceURI !== WORD_NS) {
    return undefined;
  }
  const localName = elementLocalName(element);
  if (localName === "p") {
    const paraId = getAttributeByLocalName(element, "paraId");
    return paraId ? `p:${paraId}` : undefined;
  }
  if (localName === "sdt") {
    const properties = directWordChild(element, "sdtPr");
    const idElement = properties ? directWordChild(properties, "id") : undefined;
    const id = idElement ? getAttributeByLocalName(idElement, "val") : undefined;
    return id ? `sdt:${id}` : undefined;
  }
  return undefined;
}

function storyTopologyStable(
  sourceChildren: XmlElement[],
  rebuiltChildren: XmlElement[],
  modeledNames: ReadonlySet<string>,
): boolean {
  const sourceModeled = modeledChildren(sourceChildren, modeledNames);
  const rebuiltModeled = modeledChildren(rebuiltChildren, modeledNames);
  return (
    sourceModeled.length === rebuiltModeled.length &&
    sourceModeled.every(
      (sourceChild, index): boolean =>
        elementLocalName(sourceChild) ===
        elementLocalName(rebuiltModeled[index]!),
    )
  );
}

function sourceGapAnchor(
  sourceChildren: XmlElement[],
  sourceIndex: number,
  rebuiltChildren: XmlElement[],
  modeledNames: ReadonlySet<string>,
  stableTopology: boolean,
): XmlElement | undefined {
  const nextSourceModeled = sourceChildren
    .slice(sourceIndex + 1)
    .find(
      (candidate): boolean =>
        candidate.namespaceURI === WORD_NS &&
        modeledNames.has(elementLocalName(candidate)),
    );
  if (!nextSourceModeled) {
    return undefined;
  }

  const identity = storyAnchorIdentity(nextSourceModeled);
  if (identity) {
    const identityMatch = modeledChildren(rebuiltChildren, modeledNames).find(
      (candidate): boolean => storyAnchorIdentity(candidate) === identity,
    );
    if (identityMatch) {
      return identityMatch;
    }
  }

  if (!stableTopology) {
    return undefined;
  }
  const sourceModeled = modeledChildren(sourceChildren, modeledNames);
  const rebuiltModeled = modeledChildren(rebuiltChildren, modeledNames);
  const ordinal = sourceModeled.indexOf(nextSourceModeled);
  return ordinal >= 0 ? rebuiltModeled[ordinal] : undefined;
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

/**
 * Extends root preservation to unsupported WordprocessingML flow wrappers in a
 * story (`customXml`, revision wrappers, `altChunk`, future Word children).
 *
 * The wrapper is restored only when its source gap is unambiguous: preferably
 * through the next original paragraph's `w14:paraId` or SDT id, otherwise via
 * an unchanged p/tbl/sdt topology. This keeps non-structural edits lossless
 * without using raw child indexes after structural changes.
 */
export function mergeWordStoryRootAndFlowFromSource(
  sourceXml: string,
  rebuiltXml: string,
  expectedRootLocalName: string,
  modeledChildNames: ReadonlySet<string> = new Set(["p", "tbl", "sdt"]),
): string {
  const rootMergedXml = mergeWordPartRootExtensionsFromSource(
    sourceXml,
    rebuiltXml,
    expectedRootLocalName,
  );
  const sourceDocument = new DOMParser().parseFromString(
    sourceXml,
    "application/xml",
  );
  const rebuiltDocument = new DOMParser().parseFromString(
    rootMergedXml,
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
    return rootMergedXml;
  }

  const sourceChildren = elementChildren(sourceRoot);
  const rebuiltChildren = elementChildren(rebuiltRoot);
  const stableTopology = storyTopologyStable(
    sourceChildren,
    rebuiltChildren,
    modeledChildNames,
  );
  const occurrences = new Map<string, number>();

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    if (
      sourceChild.namespaceURI !== WORD_NS ||
      modeledChildNames.has(elementLocalName(sourceChild))
    ) {
      return;
    }

    const key = elementKey(sourceChild);
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    const currentMatches = elementChildren(rebuiltRoot).filter(
      (candidate): boolean => elementKey(candidate) === key,
    );
    if (currentMatches[occurrence]) {
      return;
    }

    const anchor = sourceGapAnchor(
      sourceChildren,
      sourceIndex,
      rebuiltChildren,
      modeledChildNames,
      stableTopology,
    );
    if (!anchor && !stableTopology) {
      return;
    }
    rebuiltRoot.insertBefore(sourceChild.cloneNode(true), anchor ?? null);
  });

  return new XMLSerializer().serializeToString(rebuiltDocument);
}
