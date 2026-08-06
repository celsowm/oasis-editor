import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorOpcContentTypes,
  EditorOpcRelationship,
} from "@/core/model.js";

export const OPC_CONTENT_TYPES_PATH = "[Content_Types].xml";
export const OPC_ROOT_RELATIONSHIPS_PATH = "_rels/.rels";
export const OPC_RELATIONSHIPS_NAMESPACE =
  "http://schemas.openxmlformats.org/package/2006/relationships";
export const OPC_CONTENT_TYPES_NAMESPACE =
  "http://schemas.openxmlformats.org/package/2006/content-types";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function normalizeOpcPartPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+/, "");
}

export function resolveOpcRelationshipTarget(
  ownerPartPath: string | null,
  target: string,
): string | null {
  const normalizedTarget = target.replaceAll("\\", "/");
  const ownerDirectory = ownerPartPath?.includes("/")
    ? ownerPartPath.slice(0, ownerPartPath.lastIndexOf("/") + 1)
    : "";
  const rawPath = normalizedTarget.startsWith("/")
    ? normalizedTarget.slice(1)
    : `${ownerDirectory}${normalizedTarget}`;
  const segments: string[] = [];

  for (const segment of rawPath.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (segments.length === 0) {
        return null;
      }
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.join("/");
}

export function getOpcRelationshipOwnerPath(
  path: string,
): string | null | undefined {
  if (path === OPC_ROOT_RELATIONSHIPS_PATH) {
    return null;
  }

  const nestedMarker = "/_rels/";
  const nestedIndex = path.lastIndexOf(nestedMarker);
  if (nestedIndex >= 0 && path.endsWith(".rels")) {
    const directory = path.slice(0, nestedIndex);
    const relationshipFile = path.slice(nestedIndex + nestedMarker.length);
    return `${directory}/${relationshipFile.slice(0, -".rels".length)}`;
  }

  if (path.startsWith("_rels/") && path.endsWith(".rels")) {
    return path.slice("_rels/".length, -".rels".length);
  }

  return undefined;
}

export function parseOpcContentTypes(
  xml: string | null | undefined,
): EditorOpcContentTypes {
  const result: EditorOpcContentTypes = { defaults: {}, overrides: {} };
  if (!xml) {
    return result;
  }

  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement;
  if (!root) {
    return result;
  }

  for (let index = 0; index < root.childNodes.length; index += 1) {
    const node = root.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    const element = node as XmlElement;
    if (element.localName === "Default") {
      const extension = element.getAttribute("Extension")?.toLowerCase();
      const contentType = element.getAttribute("ContentType");
      if (extension && contentType) {
        result.defaults[extension] = contentType;
      }
    } else if (element.localName === "Override") {
      const partName = element.getAttribute("PartName");
      const contentType = element.getAttribute("ContentType");
      if (partName && contentType) {
        result.overrides[normalizeOpcPartPath(partName)] = contentType;
      }
    }
  }

  return result;
}

export function serializeOpcContentTypes(
  contentTypes: EditorOpcContentTypes,
): string {
  const defaults = Object.entries(contentTypes.defaults)
    .sort(([left], [right]): number => left.localeCompare(right))
    .map(
      ([extension, contentType]): string =>
        `<Default Extension="${escapeXml(extension)}" ContentType="${escapeXml(contentType)}"/>`,
    )
    .join("");
  const overrides = Object.entries(contentTypes.overrides)
    .sort(([left], [right]): number => left.localeCompare(right))
    .map(
      ([partName, contentType]): string =>
        `<Override PartName="/${escapeXml(normalizeOpcPartPath(partName))}" ContentType="${escapeXml(contentType)}"/>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${OPC_CONTENT_TYPES_NAMESPACE}">${defaults}${overrides}</Types>`;
}

export function parseOpcRelationships(
  xml: string | null | undefined,
): EditorOpcRelationship[] {
  if (!xml) {
    return [];
  }

  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement;
  if (!root) {
    return [];
  }

  const relationships: EditorOpcRelationship[] = [];
  for (let index = 0; index < root.childNodes.length; index += 1) {
    const node = root.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    const element = node as XmlElement;
    if (element.localName !== "Relationship") {
      continue;
    }
    const id = element.getAttribute("Id");
    const type = element.getAttribute("Type");
    const target = element.getAttribute("Target");
    if (!id || !type || !target) {
      continue;
    }
    const targetModeRaw = element.getAttribute("TargetMode");
    relationships.push({
      id,
      type,
      target,
      targetMode: targetModeRaw === "External" ? "External" : "Internal",
    });
  }
  return relationships;
}

export function serializeOpcRelationships(
  relationships: EditorOpcRelationship[],
): string {
  const body = relationships
    .map((relationship): string => {
      const targetMode =
        relationship.targetMode === "External"
          ? ' TargetMode="External"'
          : "";
      return `<Relationship Id="${escapeXml(relationship.id)}" Type="${escapeXml(relationship.type)}" Target="${escapeXml(relationship.target)}"${targetMode}/>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${OPC_RELATIONSHIPS_NAMESPACE}">${body}</Relationships>`;
}

export function resolveOpcRelationships(
  ownerPartPath: string | null,
  relationships: EditorOpcRelationship[],
  onUnsafeTarget?: (relationship: EditorOpcRelationship) => void,
): EditorOpcRelationship[] {
  return relationships.map((relationship): EditorOpcRelationship => {
    if (relationship.targetMode === "External") {
      return relationship;
    }
    const resolvedTarget = resolveOpcRelationshipTarget(
      ownerPartPath,
      relationship.target,
    );
    if (!resolvedTarget) {
      onUnsafeTarget?.(relationship);
      return relationship;
    }
    return { ...relationship, resolvedTarget };
  });
}
