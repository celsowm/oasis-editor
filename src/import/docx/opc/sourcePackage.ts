import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorDocument,
  EditorDocxDiagnostic,
  EditorDocxSourcePackage,
  EditorOpcContentTypes,
  EditorOpcPart,
  EditorOpcRelationship,
} from "@/core/model.js";

const CONTENT_TYPES_PATH = "[Content_Types].xml";
const ROOT_RELATIONSHIPS_PATH = "_rels/.rels";
const CONVENTIONAL_MAIN_DOCUMENT_PATH = "word/document.xml";
const OFFICE_DOCUMENT_RELATIONSHIP_SUFFIX = "/officeDocument";

function normalizeEntryPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+/, "");
}

function normalizeInternalTarget(
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

function relationshipOwnerPath(path: string): string | null | undefined {
  if (path === ROOT_RELATIONSHIPS_PATH) {
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

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function getContentType(
  path: string,
  contentTypes: EditorOpcContentTypes,
): string | undefined {
  const override = contentTypes.overrides[path];
  if (override) {
    return override;
  }
  const extension = path.includes(".")
    ? path.slice(path.lastIndexOf(".") + 1).toLowerCase()
    : "";
  return contentTypes.defaults[extension];
}

function isXmlPart(path: string, contentType: string | undefined): boolean {
  if (path.endsWith(".xml") || path.endsWith(".rels")) {
    return true;
  }
  return contentType === "application/xml" || Boolean(contentType?.endsWith("+xml"));
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
        result.overrides[normalizeEntryPath(partName)] = contentType;
      }
    }
  }

  return result;
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
      ...(targetModeRaw === "External"
        ? { targetMode: "External" as const }
        : { targetMode: "Internal" as const }),
    });
  }
  return relationships;
}

function resolveRelationships(
  ownerPartPath: string | null,
  relationships: EditorOpcRelationship[],
  diagnostics: EditorDocxDiagnostic[],
): EditorOpcRelationship[] {
  return relationships.map((relationship): EditorOpcRelationship => {
    if (relationship.targetMode === "External") {
      return relationship;
    }
    const resolvedTarget = normalizeInternalTarget(
      ownerPartPath,
      relationship.target,
    );
    if (!resolvedTarget) {
      diagnostics.push({
        level: "warning",
        code: "unsafe-relationship-target",
        message: `Relationship ${relationship.id} points outside the OPC package.`,
        ...(ownerPartPath ? { partPath: ownerPartPath } : {}),
        relationshipId: relationship.id,
      });
      return relationship;
    }
    return { ...relationship, resolvedTarget };
  });
}

export async function captureDocxSourcePackage(
  buffer: ArrayBuffer,
): Promise<EditorDocxSourcePackage> {
  const zip = await JSZip.loadAsync(buffer);
  const diagnostics: EditorDocxDiagnostic[] = [];
  const contentTypesXml = await zip.file(CONTENT_TYPES_PATH)?.async("string");
  const contentTypes = parseOpcContentTypes(contentTypesXml);

  if (!contentTypesXml) {
    diagnostics.push({
      level: "warning",
      code: "missing-content-types",
      message: "The DOCX package does not contain [Content_Types].xml.",
    });
  }

  const parts: Record<string, EditorOpcPart> = {};
  for (const [rawPath, entry] of Object.entries(zip.files)) {
    if (entry.dir) {
      continue;
    }
    const path = normalizeEntryPath(rawPath);
    const contentType = getContentType(path, contentTypes);
    const kind = isXmlPart(path, contentType) ? "xml" : "binary";
    const data = await entry.async(kind === "xml" ? "string" : "base64");
    parts[path] = {
      path,
      ...(contentType ? { contentType } : {}),
      kind,
      data,
      encoding: kind === "xml" ? "utf8" : "base64",
      originalHash: hashString(data),
    };
  }

  let rootRelationships: EditorOpcRelationship[] = [];
  for (const [path, part] of Object.entries(parts)) {
    const ownerPartPath = relationshipOwnerPath(path);
    if (ownerPartPath === undefined || part.kind !== "xml") {
      continue;
    }
    const relationships = resolveRelationships(
      ownerPartPath,
      parseOpcRelationships(part.data),
      diagnostics,
    );
    if (ownerPartPath === null) {
      rootRelationships = relationships;
      continue;
    }
    const ownerPart = parts[ownerPartPath];
    if (ownerPart) {
      ownerPart.relationships = relationships;
    } else {
      diagnostics.push({
        level: "warning",
        code: "orphan-relationships-part",
        message: `Relationship part ${path} has no owning package part.`,
        partPath: path,
      });
    }
  }

  const officeDocumentRelationship = rootRelationships.find(
    (relationship): boolean =>
      relationship.targetMode !== "External" &&
      relationship.type.endsWith(OFFICE_DOCUMENT_RELATIONSHIP_SUFFIX),
  );
  let mainDocumentPart = officeDocumentRelationship?.resolvedTarget;

  if (!mainDocumentPart || !parts[mainDocumentPart]) {
    if (parts[CONVENTIONAL_MAIN_DOCUMENT_PATH]) {
      mainDocumentPart = CONVENTIONAL_MAIN_DOCUMENT_PATH;
      diagnostics.push({
        level: "warning",
        code: "main-document-fallback",
        message:
          "The officeDocument relationship was absent or invalid; word/document.xml was used as a compatibility fallback.",
      });
    } else {
      throw new Error(
        "DOCX package has no resolvable officeDocument relationship or word/document.xml fallback.",
      );
    }
  }

  return {
    format: "docx",
    mainDocumentPart,
    contentTypes,
    rootRelationships,
    parts,
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
  };
}

export async function attachDocxSourcePackage(
  document: EditorDocument,
  buffer: ArrayBuffer,
): Promise<EditorDocument> {
  document.sourcePackage = await captureDocxSourcePackage(buffer);
  return document;
}
