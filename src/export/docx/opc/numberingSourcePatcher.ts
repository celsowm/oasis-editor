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
    if (child?.nodeType === child.ELEMENT_NODE) children.push(child as XmlElement);
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
    if (attribute?.localName === localName) return attribute.value;
  }
  return undefined;
}

function setWordAttributeByLocalName(
  element: XmlElement,
  localName: string,
  value: string,
): void {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute?.localName === localName) {
      element.setAttribute(attribute.name, value);
      return;
    }
  }
  element.setAttributeNS(WORD_NS, `w:${localName}`, value);
}

function directWordChild(
  element: XmlElement,
  localName: string,
): XmlElement | undefined {
  return elementChildren(element).find(
    (child): boolean =>
      child.namespaceURI === WORD_NS && elementLocalName(child) === localName,
  );
}

function copyMissingAttributes(source: XmlElement, target: XmlElement): void {
  for (let index = 0; index < source.attributes.length; index += 1) {
    const attribute = source.attributes.item(index);
    if (!attribute) continue;
    const localName = attribute.localName ?? attribute.name;
    const exists = attribute.namespaceURI
      ? target.hasAttributeNS(attribute.namespaceURI, localName)
      : target.hasAttribute(attribute.name);
    if (exists) continue;
    if (attribute.namespaceURI) {
      target.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
    } else {
      target.setAttribute(attribute.name, attribute.value);
    }
  }
}

function mergeExtensionChildrenOnly(source: XmlElement, target: XmlElement): void {
  const targetKeys = new Set(elementChildren(target).map(elementKey));
  for (const child of elementChildren(source)) {
    if (child.namespaceURI === WORD_NS || targetKeys.has(elementKey(child))) continue;
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
  const sourceRoot = new DOMParser().parseFromString(sourceXml, "application/xml")
    .documentElement as XmlElement | undefined;
  const rebuiltRoot = new DOMParser().parseFromString(rebuiltXml, "application/xml")
    .documentElement as XmlElement | undefined;
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
    if (child.namespaceURI === WORD_NS && elementLocalName(child) === "rFonts") continue;
    clone.appendChild(child.cloneNode(true));
    preserved = true;
  }
  return preserved ? clone : undefined;
}

function mergeLevelRunProperties(source: XmlElement, target: XmlElement): void {
  copyMissingAttributes(source, target);
  const sourceChildren = elementChildren(source);
  const targetByKey = new Map<string, XmlElement>(
    elementChildren(target).map((child): [string, XmlElement] => [elementKey(child), child]),
  );
  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const childKey = elementKey(sourceChild);
    const targetChild = targetByKey.get(childKey);
    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      mergeExtensionChildrenOnly(sourceChild, targetChild);
      return;
    }
    if (sourceChild.namespaceURI === WORD_NS && elementLocalName(sourceChild) === "rFonts") return;
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
    elementChildren(target).map((child): [string, XmlElement] => [elementKey(child), child]),
  );

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const childKey = elementKey(sourceChild);
    const targetChild = targetByKey.get(childKey);
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

    if (sourceChild.namespaceURI === WORD_NS && MODELED_LEVEL_CHILDREN.has(localName)) return;

    if (sourceChild.namespaceURI === WORD_NS && localName === "rPr") {
      const filtered = filteredSourceRunProperties(sourceChild);
      if (filtered) target.appendChild(filtered);
      return;
    }

    // `pPr` and other unmodeled Word children are source preservation data.
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
    const childKey = abstractChildKey(sourceChild);
    const targetChild = targetByKey.get(childKey);
    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      if (sourceChild.namespaceURI === WORD_NS && elementLocalName(sourceChild) === "lvl") {
        mergeLevelElement(sourceChild, targetChild);
      } else {
        mergeExtensionChildrenOnly(sourceChild, targetChild);
      }
      return;
    }

    insertSourceChildInOrder(
      sourceChildren,
      sourceIndex,
      sourceChild,
      target,
      (candidate): XmlElement | undefined => targetByKey.get(abstractChildKey(candidate)),
    );
  });
}

function findAbstractLevelForNum(
  numberingRoot: XmlElement,
  num: XmlElement,
  ilvl: string,
): XmlElement | undefined {
  const abstractRef = directWordChild(num, "abstractNumId");
  const abstractId = abstractRef ? getAttributeByLocalName(abstractRef, "val") : undefined;
  if (!abstractId) return undefined;

  const abstractNum = elementChildren(numberingRoot).find(
    (candidate): boolean =>
      candidate.namespaceURI === WORD_NS &&
      elementLocalName(candidate) === "abstractNum" &&
      getAttributeByLocalName(candidate, "abstractNumId") === abstractId,
  );
  return abstractNum
    ? elementChildren(abstractNum).find(
        (candidate): boolean =>
          candidate.namespaceURI === WORD_NS &&
          elementLocalName(candidate) === "lvl" &&
          (getAttributeByLocalName(candidate, "ilvl") ?? "0") === ilvl,
      )
    : undefined;
}

function canonicalizeOverrideLevel(
  sourceLevel: XmlElement,
  effectiveLevel: XmlElement,
): XmlElement {
  const canonical = effectiveLevel.cloneNode(true) as XmlElement;
  mergeLevelElement(sourceLevel, canonical);

  // An override-level pPr belongs to the override itself and may intentionally
  // differ from the base abstract level. It is not emitted by the canonical
  // serializer today, so retain the source override pPr rather than inheriting
  // a base pPr that happened to be preserved on the effective abstract level.
  const sourcePPr = directWordChild(sourceLevel, "pPr");
  const canonicalPPr = directWordChild(canonical, "pPr");
  if (sourcePPr) {
    if (canonicalPPr) {
      canonical.replaceChild(sourcePPr.cloneNode(true), canonicalPPr);
    } else {
      canonical.appendChild(sourcePPr.cloneNode(true));
    }
  } else if (canonicalPPr) {
    canonical.removeChild(canonicalPPr);
  }
  return canonical;
}

function canonicalizeLevelOverride(
  sourceOverride: XmlElement,
  effectiveLevel: XmlElement | undefined,
): XmlElement {
  if (!effectiveLevel) return sourceOverride.cloneNode(true) as XmlElement;

  const result = sourceOverride.cloneNode(false) as XmlElement;
  const currentStart = getAttributeByLocalName(
    directWordChild(effectiveLevel, "start") ?? effectiveLevel,
    "val",
  ) ?? "1";

  for (const sourceChild of elementChildren(sourceOverride)) {
    const localName = elementLocalName(sourceChild);
    if (sourceChild.namespaceURI === WORD_NS && localName === "startOverride") {
      const start = sourceChild.cloneNode(true) as XmlElement;
      setWordAttributeByLocalName(start, "val", currentStart);
      result.appendChild(start);
      continue;
    }
    if (sourceChild.namespaceURI === WORD_NS && localName === "lvl") {
      result.appendChild(canonicalizeOverrideLevel(sourceChild, effectiveLevel));
      continue;
    }
    result.appendChild(sourceChild.cloneNode(true));
  }
  return result;
}

function mergeNumElement(
  source: XmlElement,
  target: XmlElement,
  numberingRoot: XmlElement,
): void {
  copyMissingAttributes(source, target);
  const abstractNumIdTarget = directWordChild(target, "abstractNumId");
  const existingOverrides = new Map<string, XmlElement>();
  for (const child of elementChildren(target)) {
    if (child.namespaceURI === WORD_NS && elementLocalName(child) === "lvlOverride") {
      existingOverrides.set(getAttributeByLocalName(child, "ilvl") ?? "0", child);
    }
  }

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
      const ilvl = getAttributeByLocalName(sourceChild, "ilvl") ?? "0";
      const effectiveLevel = findAbstractLevelForNum(numberingRoot, target, ilvl);
      const canonical = canonicalizeLevelOverride(sourceChild, effectiveLevel);
      const existing = existingOverrides.get(ilvl);
      if (existing) {
        target.replaceChild(canonical, existing);
      } else {
        target.appendChild(canonical);
      }
      existingOverrides.set(ilvl, canonical);
      continue;
    }

    if (
      sourceChild.namespaceURI !== WORD_NS &&
      !elementChildren(target).some(
        (candidate): boolean => elementKey(candidate) === elementKey(sourceChild),
      )
    ) {
      target.appendChild(sourceChild.cloneNode(true));
    }
  }
}

function rootChildKey(element: XmlElement): string {
  if (element.namespaceURI !== WORD_NS) return elementKey(element);
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
  if (!roots) return rebuiltXml;
  const { sourceRoot, rebuiltRoot } = roots;
  copyMissingAttributes(sourceRoot, rebuiltRoot);
  const sourceChildren = elementChildren(sourceRoot);
  const targetByKey = new Map<string, XmlElement>(
    elementChildren(rebuiltRoot).map(
      (child): [string, XmlElement] => [rootChildKey(child), child],
    ),
  );

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const childKey = rootChildKey(sourceChild);
    const targetChild = targetByKey.get(childKey);
    const localName = elementLocalName(sourceChild);
    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      if (sourceChild.namespaceURI === WORD_NS && localName === "abstractNum") {
        mergeAbstractNumElement(sourceChild, targetChild);
      } else if (sourceChild.namespaceURI === WORD_NS && localName === "num") {
        mergeNumElement(sourceChild, targetChild, rebuiltRoot);
      } else {
        mergeExtensionChildrenOnly(sourceChild, targetChild);
      }
      return;
    }

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
  if (!sourceXml || !rebuiltEntry) return false;
  const rebuiltXml = await rebuiltEntry.async("string");
  const mergedXml = mergeNumberingOoxmlSource(sourceXml, rebuiltXml);
  if (mergedXml === rebuiltXml) return false;
  rebuilt.file(REBUILT_NUMBERING_PATH, mergedXml);
  return true;
}
