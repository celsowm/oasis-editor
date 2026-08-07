import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import type { EditorDocxSourcePackage } from "@/core/model.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const REBUILT_NUMBERING_PATH = "word/numbering.xml";

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
    const exists = attribute.namespaceURI
      ? target.hasAttributeNS(attribute.namespaceURI, localName)
      : target.hasAttribute(attribute.name);
    if (exists) {
      continue;
    }
    if (attribute.namespaceURI) {
      target.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
    } else {
      target.setAttribute(attribute.name, attribute.value);
    }
  }
}

function mergeExtensionChildrenOnly(
  source: XmlElement,
  target: XmlElement,
): void {
  const targetKeys = new Set(elementChildren(target).map(elementKey));
  for (const child of elementChildren(source)) {
    if (child.namespaceURI === WORD_NS || targetKeys.has(elementKey(child))) {
      continue;
    }
    target.appendChild(child.cloneNode(true));
  }
}

function insertSourceChildInOrder(
  sourceChildren: XmlElement[],
  sourceIndex: number,
  sourceChild: XmlElement,
  target: XmlElement,
  findTarget: (source: XmlElement) => XmlElement | undefined,
): void {
  const anchor = sourceChildren
    .slice(sourceIndex + 1)
    .map(findTarget)
    .find((candidate): candidate is XmlElement => Boolean(candidate));
  target.insertBefore(sourceChild.cloneNode(true), anchor ?? null);
}

function parseNumberingRoots(
  sourceXml: string,
  rebuiltXml: string,
): { sourceRoot: XmlElement; rebuiltRoot: XmlElement } | undefined {
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
    elementLocalName(sourceRoot) !== "numbering" ||
    elementLocalName(rebuiltRoot) !== "numbering"
  ) {
    return undefined;
  }
  return { sourceRoot, rebuiltRoot };
}

function levelKey(element: XmlElement): string {
  if (element.namespaceURI === WORD_NS && elementLocalName(element) === "lvl") {
    return `${elementKey(element)}\u0000${getAttributeByLocalName(element, "ilvl") ?? "0"}`;
  }
  return elementKey(element);
}

const MODELED_LEVEL_CHILDREN = new Set([
  "start",
  "numFmt",
  "lvlRestart",
  "pStyle",
  "lvlText",
  "lvlJc",
  "suff",
  "isLgl",
]);

function filteredSourceRunProperties(source: XmlElement): XmlElement | undefined {
  const clone = source.cloneNode(false) as XmlElement;
  let preserved = false;
  for (const child of elementChildren(source)) {
    if (
      child.namespaceURI === WORD_NS &&
      elementLocalName(child) === "rFonts"
    ) {
      continue;
    }
    clone.appendChild(child.cloneNode(true));
    preserved = true;
  }
  return preserved ? clone : undefined;
}

function mergeLevelRunProperties(source: XmlElement, target: XmlElement): void {
  copyMissingAttributes(source, target);
  const sourceChildren = elementChildren(source);
  const targetByKey = new Map<string, XmlElement>(
    elementChildren(target).map(
      (child): [string, XmlElement] => [elementKey(child), child],
    ),
  );
  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const key = elementKey(sourceChild);
    const targetChild = targetByKey.get(key);
    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      mergeExtensionChildrenOnly(sourceChild, targetChild);
      return;
    }
    if (
      sourceChild.namespaceURI === WORD_NS &&
      elementLocalName(sourceChild) === "rFonts"
    ) {
      return;
    }
    insertSourceChildInOrder(
      sourceChildren,
      sourceIndex,
      sourceChild,
      target,
      (candidate): XmlElement | undefined => targetByKey.get(elementKey(candidate)),
    );
  });
}

function mergeLevelElement(source: XmlElement, target: XmlElement): void {
  copyMissingAttributes(source, target);
  const sourceChildren = elementChildren(source);
  const targetByKey = new Map<string, XmlElement>(
    elementChildren(target).map(
      (child): [string, XmlElement] => [elementKey(child), child],
    ),
  );

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const key = elementKey(sourceChild);
    const targetChild = targetByKey.get(key);
    const localName = elementLocalName(sourceChild);
    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      if (sourceChild.namespaceURI === WORD_NS && localName === "rPr") {
        mergeLevelRunProperties(sourceChild, targetChild);
      } else {
        mergeExtensionChildrenOnly(sourceChild, targetChild);
      }
      return;
    }

    if (
      sourceChild.namespaceURI === WORD_NS &&
      MODELED_LEVEL_CHILDREN.has(localName)
    ) {
      return;
    }

    if (sourceChild.namespaceURI === WORD_NS && localName === "rPr") {
      const filtered = filteredSourceRunProperties(sourceChild);
      if (filtered) {
        target.appendChild(filtered);
      }
      return;
    }

    // pPr and unrecognized Word children are currently not generated by the
    // typed numbering serializer, so retaining them is preservation rather
    // than overriding an editor-visible value.
    insertSourceChildInOrder(
      sourceChildren,
      sourceIndex,
      sourceChild,
      target,
      (candidate): XmlElement | undefined => targetByKey.get(elementKey(candidate)),
    );
  });
}

function abstractChildKey(element: XmlElement): string {
  return levelKey(element);
}

function mergeAbstractNumElement(source: XmlElement, target: XmlElement): void {
  copyMissingAttributes(source, target);
  const sourceChildren = elementChildren(source);
  const targetByKey = new Map<string, XmlElement>(
    elementChildren(target).map(
      (child): [string, XmlElement] => [abstractChildKey(child), child],
    ),
  );

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const key = abstractChildKey(sourceChild);
    const targetChild = targetByKey.get(key);
    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      if (
        sourceChild.namespaceURI === WORD_NS &&
        elementLocalName(sourceChild) === "lvl"
      ) {
        mergeLevelElement(sourceChild, targetChild);
      } else {
        mergeExtensionChildrenOnly(sourceChild, targetChild);
      }
      return;
    }

    // Source-only levels and abstract numbering metadata are inert unless a
    // paragraph references them. Keeping them avoids destroying valid template
    // definitions while the generated active levels stay authoritative.
    insertSourceChildInOrder(
      sourceChildren,
      sourceIndex,
      sourceChild,
      target,
      (candidate): XmlElement | undefined =>
        targetByKey.get(abstractChildKey(candidate)),
    );
  });
}

function mergeNumElement(source: XmlElement, target: XmlElement): void {
  copyMissingAttributes(source, target);
  const targetChildren = elementChildren(target);
  const abstractNumIdTarget = targetChildren.find(
    (child): boolean =>
      child.namespaceURI === WORD_NS &&
      elementLocalName(child) === "abstractNumId",
  );

  for (const sourceChild of elementChildren(source)) {
    const localName = elementLocalName(sourceChild);
    if (sourceChild.namespaceURI === WORD_NS && localName === "abstractNumId") {
      if (abstractNumIdTarget) {
        copyMissingAttributes(sourceChild, abstractNumIdTarget);
        mergeExtensionChildrenOnly(sourceChild, abstractNumIdTarget);
      }
      continue;
    }
    if (sourceChild.namespaceURI === WORD_NS && localName === "lvlOverride") {
      // Overrides are partially projected into the editor's list semantics.
      // Restoring the original override here could silently win over an edit to
      // start/format, so keep it out until override identity is modeled fully.
      continue;
    }
    if (
      sourceChild.namespaceURI !== WORD_NS &&
      !targetChildren.some(
        (candidate): boolean => elementKey(candidate) === elementKey(sourceChild),
      )
    ) {
      target.appendChild(sourceChild.cloneNode(true));
    }
  }
}

function rootChildKey(element: XmlElement): string {
  if (element.namespaceURI !== WORD_NS) {
    return elementKey(element);
  }
  const localName = elementLocalName(element);
  if (localName === "abstractNum") {
    return `${elementKey(element)}\u0000${getAttributeByLocalName(element, "abstractNumId") ?? ""}`;
  }
  if (localName === "num") {
    return `${elementKey(element)}\u0000${getAttributeByLocalName(element, "numId") ?? ""}`;
  }
  return elementKey(element);
}

export function mergeNumberingOoxmlSource(
  sourceXml: string,
  rebuiltXml: string,
): string {
  const roots = parseNumberingRoots(sourceXml, rebuiltXml);
  if (!roots) {
    return rebuiltXml;
  }
  const { sourceRoot, rebuiltRoot } = roots;
  copyMissingAttributes(sourceRoot, rebuiltRoot);
  const sourceChildren = elementChildren(sourceRoot);
  const targetByKey = new Map<string, XmlElement>(
    elementChildren(rebuiltRoot).map(
      (child): [string, XmlElement] => [rootChildKey(child), child],
    ),
  );

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const key = rootChildKey(sourceChild);
    const targetChild = targetByKey.get(key);
    const localName = elementLocalName(sourceChild);
    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      if (sourceChild.namespaceURI === WORD_NS && localName === "abstractNum") {
        mergeAbstractNumElement(sourceChild, targetChild);
      } else if (sourceChild.namespaceURI === WORD_NS && localName === "num") {
        mergeNumElement(sourceChild, targetChild);
      } else {
        mergeExtensionChildrenOnly(sourceChild, targetChild);
      }
      return;
    }

    // New editor-created numbering ids are allocated above the source maximum,
    // so a source-only definition cannot collide with a new active definition.
    insertSourceChildInOrder(
      sourceChildren,
      sourceIndex,
      sourceChild,
      rebuiltRoot,
      (candidate): XmlElement | undefined => targetByKey.get(rootChildKey(candidate)),
    );
  });

  return new XMLSerializer().serializeToString(rebuiltRoot.ownerDocument!);
}

function sourceNumberingXml(
  sourcePackage: EditorDocxSourcePackage,
): string | undefined {
  const mainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  const relationship = mainPart?.relationships?.find(
    (candidate): boolean =>
      candidate.targetMode !== "External" &&
      candidate.type.endsWith("/numbering") &&
      Boolean(candidate.resolvedTarget),
  );
  const part = relationship?.resolvedTarget
    ? sourcePackage.parts[relationship.resolvedTarget]
    : undefined;
  return part?.kind === "xml" ? part.data : undefined;
}

export async function patchRebuiltNumberingFromSource(
  sourcePackage: EditorDocxSourcePackage,
  rebuilt: JSZip,
): Promise<boolean> {
  const sourceXml = sourceNumberingXml(sourcePackage);
  const rebuiltEntry = rebuilt.file(REBUILT_NUMBERING_PATH);
  if (!sourceXml || !rebuiltEntry) {
    return false;
  }
  const rebuiltXml = await rebuiltEntry.async("string");
  const mergedXml = mergeNumberingOoxmlSource(sourceXml, rebuiltXml);
  if (mergedXml === rebuiltXml) {
    return false;
  }
  rebuilt.file(REBUILT_NUMBERING_PATH, mergedXml);
  return true;
}
