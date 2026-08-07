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

interface SingletonSourceSpec {
  relationshipSuffix: string;
  rebuiltPath: string;
  merge?: (sourceXml: string, rebuiltXml: string) => string;
}

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

function parseMatchingRoots(
  sourceXml: string,
  rebuiltXml: string,
  localName: string,
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
    elementLocalName(sourceRoot) !== localName ||
    elementLocalName(rebuiltRoot) !== localName
  ) {
    return undefined;
  }
  return { sourceRoot, rebuiltRoot };
}

function insertSourceChildInOrder(
  sourceChildren: XmlElement[],
  sourceIndex: number,
  sourceChild: XmlElement,
  target: XmlElement,
  findTarget: (source: XmlElement) => XmlElement | undefined,
): void {
  const nextTargetAnchor = sourceChildren
    .slice(sourceIndex + 1)
    .map(findTarget)
    .find((candidate): candidate is XmlElement => Boolean(candidate));
  target.insertBefore(sourceChild.cloneNode(true), nextTargetAnchor ?? null);
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

const SETTINGS_MODELED_ROOT_NAMES = new Set([
  "defaultTabStop",
  "autoHyphenation",
  "consecutiveHyphenLimit",
  "hyphenationZone",
  "doNotHyphenateCaps",
  "evenAndOddHeaders",
]);

function mergePartialSettingsContainer(
  source: XmlElement,
  target: XmlElement,
  modeledChildNames: ReadonlySet<string>,
): void {
  copyMissingAttributes(source, target);
  const targetChildren = elementChildren(target);
  const targetByKey = new Map(targetChildren.map((child) => [elementKey(child), child]));
  const sourceChildren = elementChildren(source);

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
      modeledChildNames.has(elementLocalName(sourceChild))
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

function filteredPartialSettingsContainer(
  source: XmlElement,
  modeledChildNames: ReadonlySet<string>,
): XmlElement | undefined {
  const clone = source.cloneNode(false) as XmlElement;
  let preserved = false;
  for (const child of elementChildren(source)) {
    if (
      child.namespaceURI === WORD_NS &&
      modeledChildNames.has(elementLocalName(child))
    ) {
      continue;
    }
    clone.appendChild(child.cloneNode(true));
    preserved = true;
  }
  return preserved ? clone : undefined;
}

function mergeSettingsXml(sourceXml: string, rebuiltXml: string): string {
  const roots = parseMatchingRoots(sourceXml, rebuiltXml, "settings");
  if (!roots) {
    return rebuiltXml;
  }
  const { sourceRoot, rebuiltRoot } = roots;
  copyMissingAttributes(sourceRoot, rebuiltRoot);

  const partialContainers = new Map<string, ReadonlySet<string>>([
    ["compat", new Set(["allowSpaceOfSameStyleInTable"])],
    ["footnotePr", new Set(["numFmt", "numStart", "numRestart"])],
    ["endnotePr", new Set(["numFmt", "numStart", "numRestart"])],
  ]);
  const sourceChildren = elementChildren(sourceRoot);
  const targetByKey = new Map(
    elementChildren(rebuiltRoot).map((child) => [elementKey(child), child]),
  );

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const key = elementKey(sourceChild);
    const targetChild = targetByKey.get(key);
    const localName = elementLocalName(sourceChild);
    const partialModeledChildren =
      sourceChild.namespaceURI === WORD_NS
        ? partialContainers.get(localName)
        : undefined;

    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      if (partialModeledChildren) {
        mergePartialSettingsContainer(
          sourceChild,
          targetChild,
          partialModeledChildren,
        );
      } else {
        mergeExtensionChildrenOnly(sourceChild, targetChild);
      }
      return;
    }

    if (partialModeledChildren) {
      const filtered = filteredPartialSettingsContainer(
        sourceChild,
        partialModeledChildren,
      );
      if (filtered) {
        const nextTargetAnchor = sourceChildren
          .slice(sourceIndex + 1)
          .map((candidate): XmlElement | undefined =>
            targetByKey.get(elementKey(candidate)),
          )
          .find((candidate): candidate is XmlElement => Boolean(candidate));
        rebuiltRoot.insertBefore(filtered, nextTargetAnchor ?? null);
      }
      return;
    }

    if (
      sourceChild.namespaceURI === WORD_NS &&
      SETTINGS_MODELED_ROOT_NAMES.has(localName)
    ) {
      return;
    }

    insertSourceChildInOrder(
      sourceChildren,
      sourceIndex,
      sourceChild,
      rebuiltRoot,
      (candidate): XmlElement | undefined => targetByKey.get(elementKey(candidate)),
    );
  });

  return new XMLSerializer().serializeToString(rebuiltRoot.ownerDocument!);
}

const STYLE_MODELED_CHILD_NAMES = new Set([
  "name",
  "basedOn",
  "next",
  "uiPriority",
  "qFormat",
  "semiHidden",
  "unhideWhenUsed",
  "pPr",
  "rPr",
  "tblPr",
  "tblStylePr",
]);

function styleChildKey(element: XmlElement): string {
  if (element.namespaceURI === WORD_NS && elementLocalName(element) === "tblStylePr") {
    return `${elementKey(element)}\u0000${getAttributeByLocalName(element, "type") ?? ""}`;
  }
  return elementKey(element);
}

function mergeStyleElement(source: XmlElement, target: XmlElement): void {
  copyMissingAttributes(source, target);
  const sourceChildren = elementChildren(source);
  const targetByKey = new Map(
    elementChildren(target).map((child) => [styleChildKey(child), child]),
  );

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const key = styleChildKey(sourceChild);
    const targetChild = targetByKey.get(key);
    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      mergeExtensionChildrenOnly(sourceChild, targetChild);
      return;
    }

    if (
      sourceChild.namespaceURI === WORD_NS &&
      STYLE_MODELED_CHILD_NAMES.has(elementLocalName(sourceChild))
    ) {
      return;
    }

    insertSourceChildInOrder(
      sourceChildren,
      sourceIndex,
      sourceChild,
      target,
      (candidate): XmlElement | undefined => targetByKey.get(styleChildKey(candidate)),
    );
  });
}

function styleRootChildKey(element: XmlElement): string {
  if (element.namespaceURI === WORD_NS && elementLocalName(element) === "style") {
    return `${elementKey(element)}\u0000${getAttributeByLocalName(element, "styleId") ?? ""}`;
  }
  return elementKey(element);
}

function mergeStylesXml(sourceXml: string, rebuiltXml: string): string {
  const roots = parseMatchingRoots(sourceXml, rebuiltXml, "styles");
  if (!roots) {
    return rebuiltXml;
  }
  const { sourceRoot, rebuiltRoot } = roots;
  copyMissingAttributes(sourceRoot, rebuiltRoot);
  const sourceChildren = elementChildren(sourceRoot);
  const targetByKey = new Map(
    elementChildren(rebuiltRoot).map((child) => [styleRootChildKey(child), child]),
  );

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const key = styleRootChildKey(sourceChild);
    const targetChild = targetByKey.get(key);
    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      if (
        sourceChild.namespaceURI === WORD_NS &&
        elementLocalName(sourceChild) === "style"
      ) {
        mergeStyleElement(sourceChild, targetChild);
      } else {
        mergeExtensionChildrenOnly(sourceChild, targetChild);
      }
      return;
    }

    // Source-only styles, docDefaults, latentStyles and future extension
    // containers are preservation data. Imported style coverage is not broad
    // enough for absence from the rebuild to be interpreted as deletion.
    insertSourceChildInOrder(
      sourceChildren,
      sourceIndex,
      sourceChild,
      rebuiltRoot,
      (candidate): XmlElement | undefined =>
        targetByKey.get(styleRootChildKey(candidate)),
    );
  });

  return new XMLSerializer().serializeToString(rebuiltRoot.ownerDocument!);
}

const FONT_MODELED_CHILD_NAMES = new Set([
  "altName",
  "panose1",
  "charset",
  "family",
  "pitch",
  "sig",
]);

function fontRootChildKey(element: XmlElement): string {
  if (element.namespaceURI === WORD_NS && elementLocalName(element) === "font") {
    return `${elementKey(element)}\u0000${getAttributeByLocalName(element, "name") ?? ""}`;
  }
  return elementKey(element);
}

function mergeFontElement(source: XmlElement, target: XmlElement): void {
  copyMissingAttributes(source, target);
  const sourceChildren = elementChildren(source);
  const targetByKey = new Map(
    elementChildren(target).map((child) => [elementKey(child), child]),
  );

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const key = elementKey(sourceChild);
    const targetChild = targetByKey.get(key);
    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      return;
    }
    if (
      sourceChild.namespaceURI === WORD_NS &&
      FONT_MODELED_CHILD_NAMES.has(elementLocalName(sourceChild))
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

function mergeFontTableXml(sourceXml: string, rebuiltXml: string): string {
  const roots = parseMatchingRoots(sourceXml, rebuiltXml, "fonts");
  if (!roots) {
    return rebuiltXml;
  }
  const { sourceRoot, rebuiltRoot } = roots;
  copyMissingAttributes(sourceRoot, rebuiltRoot);
  const sourceChildren = elementChildren(sourceRoot);
  const targetByKey = new Map(
    elementChildren(rebuiltRoot).map((child) => [fontRootChildKey(child), child]),
  );

  sourceChildren.forEach((sourceChild, sourceIndex): void => {
    const key = fontRootChildKey(sourceChild);
    const targetChild = targetByKey.get(key);
    if (targetChild) {
      copyMissingAttributes(sourceChild, targetChild);
      if (
        sourceChild.namespaceURI === WORD_NS &&
        elementLocalName(sourceChild) === "font"
      ) {
        mergeFontElement(sourceChild, targetChild);
      }
      return;
    }
    insertSourceChildInOrder(
      sourceChildren,
      sourceIndex,
      sourceChild,
      rebuiltRoot,
      (candidate): XmlElement | undefined =>
        targetByKey.get(fontRootChildKey(candidate)),
    );
  });

  return new XMLSerializer().serializeToString(rebuiltRoot.ownerDocument!);
}

const SINGLETON_SPECS: SingletonSourceSpec[] = [
  {
    relationshipSuffix: "/settings",
    rebuiltPath: "word/settings.xml",
    merge: mergeSettingsXml,
  },
  {
    relationshipSuffix: "/styles",
    rebuiltPath: "word/styles.xml",
    merge: mergeStylesXml,
  },
  {
    // Numbering IDs are currently regenerated from live list instances. Until
    // source-ID mapping is explicit, merging two non-empty numbering graphs by
    // numeric id is unsafe. Preserving the whole source part when the rebuild
    // omits numbering is still strictly safer than deleting unused definitions.
    relationshipSuffix: "/numbering",
    rebuiltPath: "word/numbering.xml",
  },
  {
    relationshipSuffix: "/fontTable",
    rebuiltPath: "word/fontTable.xml",
    merge: mergeFontTableXml,
  },
];

function sourceSingletonXml(
  sourcePackage: EditorDocxSourcePackage,
  relationshipSuffix: string,
): string | undefined {
  const mainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  const relationship = mainPart?.relationships?.find(
    (candidate): boolean =>
      candidate.targetMode !== "External" &&
      candidate.type.endsWith(relationshipSuffix) &&
      Boolean(candidate.resolvedTarget),
  );
  const sourcePart = relationship?.resolvedTarget
    ? sourcePackage.parts[relationship.resolvedTarget]
    : undefined;
  return sourcePart?.kind === "xml" ? sourcePart.data : undefined;
}

/**
 * Prepares rewritten Word singleton parts before the generic OPC overlay.
 *
 * - If Oasis did not rebuild a source singleton, keep the source part instead
 *   of interpreting omission as deletion.
 * - If Oasis rebuilt a safely keyable singleton, merge source-only markup while
 *   leaving generated modeled values authoritative.
 *
 * Relationship and content-type paths are remapped later by sourcePackagePatcher.
 */
export async function patchRebuiltWordSingletonsFromSource(
  sourcePackage: EditorDocxSourcePackage,
  rebuilt: JSZip,
): Promise<boolean> {
  let changed = false;

  for (const spec of SINGLETON_SPECS) {
    const sourceXml = sourceSingletonXml(
      sourcePackage,
      spec.relationshipSuffix,
    );
    if (!sourceXml) {
      continue;
    }

    const rebuiltEntry = rebuilt.file(spec.rebuiltPath);
    if (!rebuiltEntry) {
      rebuilt.file(spec.rebuiltPath, sourceXml);
      changed = true;
      continue;
    }

    if (!spec.merge) {
      continue;
    }

    const rebuiltXml = await rebuiltEntry.async("string");
    const mergedXml = spec.merge(sourceXml, rebuiltXml);
    if (mergedXml !== rebuiltXml) {
      rebuilt.file(spec.rebuiltPath, mergedXml);
      changed = true;
    }
  }

  return changed;
}
