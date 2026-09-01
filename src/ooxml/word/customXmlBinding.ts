import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorDocxSourcePackage,
  EditorSdtDataBinding,
} from "@/core/model.js";

const CUSTOM_XML_PROPS_RELATIONSHIP_SUFFIX = "/customXmlProps";
const DATASTORE_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/customXml";

export interface ResolvedCustomXmlBinding {
  storeItemId: string;
  itemPartPath: string;
  itemPropsPartPath: string;
  value: string;
  kind: "element" | "attribute";
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
  const match = /^(([^:\[]+):)?([^\[]+?)(?:\[(\d+)\])?$/.exec(step);
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

function evaluateBinding(
  xml: string,
  xpath: string,
  namespaces: Map<string, string>,
): { value: string; kind: "element" | "attribute" } | null {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement;
  if (!root) return null;

  const normalized = xpath.trim().replace(/\/text\(\)$/, "");
  if (!normalized.startsWith("/")) return null;
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
    current = candidates[step.index - 1]!;
    if (!current) return null;
  }

  if (attributeStep) {
    const rawName = attributeStep.slice(1);
    const separator = rawName.indexOf(":");
    if (separator < 0) {
      const value = current.getAttribute(rawName);
      return value === null ? null : { value, kind: "attribute" };
    }
    const prefix = rawName.slice(0, separator);
    const localName = rawName.slice(separator + 1);
    const namespaceUri = namespaces.get(prefix);
    if (!namespaceUri) return null;
    const value = current.getAttributeNS(namespaceUri, localName);
    return value === null ? null : { value, kind: "attribute" };
  }

  return { value: current.textContent ?? "", kind: "element" };
}

export function resolveCustomXmlBinding(
  sourcePackage: EditorDocxSourcePackage | undefined,
  binding: EditorSdtDataBinding | undefined,
): ResolvedCustomXmlBinding | null {
  if (!sourcePackage || !binding?.storeItemID || !binding.xpath) return null;
  const wantedStoreItemId = normalizeStoreItemId(binding.storeItemID);
  const namespaces = parsePrefixMappings(binding.prefixMappings);

  for (const part of Object.values(sourcePackage.parts)) {
    if (
      part.kind !== "xml" ||
      !part.path.startsWith("customXml/") ||
      !/^customXml\/item\d+\.xml$/i.test(part.path)
    ) {
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
    const storeItemId = readStoreItemId(itemPropsPart.data);
    if (!storeItemId || normalizeStoreItemId(storeItemId) !== wantedStoreItemId) {
      continue;
    }
    const resolved = evaluateBinding(part.data, binding.xpath, namespaces);
    if (!resolved) return null;
    return {
      storeItemId,
      itemPartPath: part.path,
      itemPropsPartPath,
      value: resolved.value,
      kind: resolved.kind,
    };
  }

  return null;
}
