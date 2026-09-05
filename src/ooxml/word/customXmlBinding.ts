import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type {
  EditorDocxSourcePackage,
  EditorSdtDataBinding,
} from "@/core/model.js";

const CUSTOM_XML_PROPS_RELATIONSHIP_SUFFIX = "/customXmlProps";
const DATASTORE_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/customXml";
type XmlDocument = ReturnType<DOMParser["parseFromString"]>;

export interface ResolvedCustomXmlBinding {
  storeItemId: string;
  itemPartPath: string;
  itemPropsPartPath: string;
  value: string;
  kind: "element" | "attribute";
}

interface LocatedStore {
  storeItemId: string;
  itemPartPath: string;
  itemPropsPartPath: string;
  xml: string;
}

interface LocatedBindingTarget {
  document: XmlDocument;
  element: XmlElement;
  attribute?: {
    namespaceUri?: string;
    localName: string;
    qualifiedName: string;
  };
}

function normalizeStoreItemId(value: string): string {
  return value.trim().replace(/[{}]/g, "").toLowerCase();
}

function readStoreItemId(xml: string): string | null {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement;
  if (!root) return null;
  const itemId =
    root.getAttributeNS(DATASTORE_NS, "itemID") ??
    root.getAttribute("ds:itemID") ??
    root.getAttribute("itemID");
  return itemId?.trim() || null;
}

function parsePrefixMappings(value: string | undefined): Map<string, string> {
  const result = new Map<string, string>();
  if (!value) return result;
  const pattern = /xmlns:([A-Za-z_][\w.-]*)\s*=\s*(["'])(.*?)\2/g;
  for (const match of value.matchAll(pattern)) {
    result.set(match[1]!, match[3]!);
  }
  return result;
}

function parseStep(step: string): {
  prefix?: string;
  localName: string;
  index: number;
} | null {
  const match = /^(([^:[]+):)?([^[]+?)(?:\[(\d+)\])?$/.exec(step);
  if (!match) return null;
  const index = match[4] ? Number.parseInt(match[4], 10) : 1;
  if (!Number.isFinite(index) || index < 1) return null;
  return {
    ...(match[2] ? { prefix: match[2] } : {}),
    localName: match[3]!,
    index,
  };
}

function matchesExpandedName(
  element: XmlElement,
  prefix: string | undefined,
  localName: string,
  namespaces: Map<string, string>,
): boolean {
  if (element.localName !== localName) return false;
  if (!prefix) return !element.namespaceURI;
  const namespaceUri = namespaces.get(prefix);
  return namespaceUri !== undefined && element.namespaceURI === namespaceUri;
}

function childElements(element: XmlElement): XmlElement[] {
  const children: XmlElement[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE) {
      children.push(child as XmlElement);
    }
  }
  return children;
}

function findStore(
  sourcePackage: EditorDocxSourcePackage,
  storeItemId: string,
): LocatedStore | null {
  const wantedStoreItemId = normalizeStoreItemId(storeItemId);
  for (const part of Object.values(sourcePackage.parts)) {
    if (part.kind !== "xml" || !/^customXml\/item\d+\.xml$/i.test(part.path)) {
      continue;
    }
    const propsRelationship = part.relationships?.find(
      (relationship) =>
        relationship.targetMode !== "External" &&
        relationship.type.endsWith(CUSTOM_XML_PROPS_RELATIONSHIP_SUFFIX) &&
        relationship.resolvedTarget,
    );
    const itemPropsPartPath = propsRelationship?.resolvedTarget;
    if (!itemPropsPartPath) continue;
    const itemPropsPart = sourcePackage.parts[itemPropsPartPath];
    if (!itemPropsPart || itemPropsPart.kind !== "xml") continue;
    const actualStoreItemId = readStoreItemId(itemPropsPart.data);
    if (
      !actualStoreItemId ||
      normalizeStoreItemId(actualStoreItemId) !== wantedStoreItemId
    ) {
      continue;
    }
    return {
      storeItemId: actualStoreItemId,
      itemPartPath: part.path,
      itemPropsPartPath,
      xml: part.data,
    };
  }
  return null;
}

function locateBindingTarget(
  xml: string,
  xpath: string,
  namespaces: Map<string, string>,
): LocatedBindingTarget | null {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement as XmlElement | null;
  if (!root) return null;

  const normalized = xpath.trim().replace(/\/text\(\)$/, "");
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null;
  const steps = normalized.split("/").filter(Boolean);
  if (steps.length === 0) return null;

  const attributeStep = steps.at(-1)?.startsWith("@") ? steps.pop()! : null;
  const first = parseStep(steps[0]!);
  if (!first || first.index !== 1) return null;
  if (!matchesExpandedName(root, first.prefix, first.localName, namespaces)) {
    return null;
  }

  let current = root;
  for (let index = 1; index < steps.length; index += 1) {
    const step = parseStep(steps[index]!);
    if (!step) return null;
    const candidates = childElements(current).filter((child) =>
      matchesExpandedName(child, step.prefix, step.localName, namespaces),
    );
    const candidate = candidates[step.index - 1];
    if (!candidate) return null;
    current = candidate;
  }

  if (!attributeStep) return { document, element: current };

  const rawName = attributeStep.slice(1);
  const separator = rawName.indexOf(":");
  if (separator < 0) {
    return {
      document,
      element: current,
      attribute: { localName: rawName, qualifiedName: rawName },
    };
  }
  const prefix = rawName.slice(0, separator);
  const localName = rawName.slice(separator + 1);
  const namespaceUri = namespaces.get(prefix);
  if (!namespaceUri) return null;
  return {
    document,
    element: current,
    attribute: {
      namespaceUri,
      localName,
      qualifiedName: `${prefix}:${localName}`,
    },
  };
}

function readLocatedTarget(target: LocatedBindingTarget): string | null {
  if (!target.attribute) return target.element.textContent ?? "";
  const value = target.attribute.namespaceUri
    ? target.element.getAttributeNS(
        target.attribute.namespaceUri,
        target.attribute.localName,
      )
    : target.element.getAttribute(target.attribute.localName);
  return value;
}

export function resolveCustomXmlBinding(
  sourcePackage: EditorDocxSourcePackage | undefined,
  binding: EditorSdtDataBinding | undefined,
): ResolvedCustomXmlBinding | null {
  if (!sourcePackage || !binding?.storeItemID || !binding.xpath) return null;
  const store = findStore(sourcePackage, binding.storeItemID);
  if (!store) return null;
  const target = locateBindingTarget(
    store.xml,
    binding.xpath,
    parsePrefixMappings(binding.prefixMappings),
  );
  if (!target) return null;
  const value = readLocatedTarget(target);
  if (value === null) return null;
  return {
    storeItemId: store.storeItemId,
    itemPartPath: store.itemPartPath,
    itemPropsPartPath: store.itemPropsPartPath,
    value,
    kind: target.attribute ? "attribute" : "element",
  };
}

export function writeCustomXmlBinding(
  sourcePackage: EditorDocxSourcePackage | undefined,
  binding: EditorSdtDataBinding | undefined,
  value: string,
): boolean {
  if (!sourcePackage || !binding?.storeItemID || !binding.xpath) return false;
  const store = findStore(sourcePackage, binding.storeItemID);
  if (!store) return false;
  const target = locateBindingTarget(
    store.xml,
    binding.xpath,
    parsePrefixMappings(binding.prefixMappings),
  );
  if (!target) return false;

  if (target.attribute) {
    if (target.attribute.namespaceUri) {
      target.element.setAttributeNS(
        target.attribute.namespaceUri,
        target.attribute.qualifiedName,
        value,
      );
    } else {
      target.element.setAttribute(target.attribute.localName, value);
    }
  } else {
    if (childElements(target.element).length > 0) return false;
    while (target.element.firstChild) {
      target.element.removeChild(target.element.firstChild);
    }
    target.element.appendChild(target.document.createTextNode(value));
  }

  const part = sourcePackage.parts[store.itemPartPath];
  if (!part) return false;
  part.data = new XMLSerializer().serializeToString(target.document);
  return true;
}
