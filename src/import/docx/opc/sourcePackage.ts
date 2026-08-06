import JSZip from "jszip";
import type {
  EditorDocument,
  EditorDocxDiagnostic,
  EditorDocxSourcePackage,
  EditorOpcContentTypes,
  EditorOpcPart,
  EditorOpcRelationship,
} from "@/core/model.js";
import { captureRebuiltDocxPartHashes } from "@/export/docx/opc/rebuiltPartHashes.js";
import {
  getOpcRelationshipOwnerPath,
  normalizeOpcPartPath,
  OPC_CONTENT_TYPES_PATH,
  parseOpcContentTypes,
  parseOpcRelationships,
  resolveOpcRelationships,
} from "@/ooxml/opc/packageXml.js";

const CONVENTIONAL_MAIN_DOCUMENT_PATH = "word/document.xml";
const OFFICE_DOCUMENT_RELATIONSHIP_SUFFIX = "/officeDocument";

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
  return (
    contentType === "application/xml" || Boolean(contentType?.endsWith("+xml"))
  );
}

export async function captureDocxSourcePackage(
  buffer: ArrayBuffer,
): Promise<EditorDocxSourcePackage> {
  const zip = await JSZip.loadAsync(buffer);
  const diagnostics: EditorDocxDiagnostic[] = [];
  const contentTypesXml = await zip
    .file(OPC_CONTENT_TYPES_PATH)
    ?.async("string");
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
    const path = normalizeOpcPartPath(rawPath);
    const contentType = getContentType(path, contentTypes);
    const kind = isXmlPart(path, contentType) ? "xml" : "binary";
    const data =
      kind === "xml"
        ? await entry.async("string")
        : await entry.async("base64");
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
    const ownerPartPath = getOpcRelationshipOwnerPath(path);
    if (ownerPartPath === undefined || part.kind !== "xml") {
      continue;
    }
    const relationships = resolveOpcRelationships(
      ownerPartPath,
      parseOpcRelationships(part.data),
      (relationship): void => {
        diagnostics.push({
          level: "warning",
          code: "unsafe-relationship-target",
          message: `Relationship ${relationship.id} points outside the OPC package.`,
          ...(ownerPartPath ? { partPath: ownerPartPath } : {}),
          relationshipId: relationship.id,
        });
      },
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
  const sourcePackage = await captureDocxSourcePackage(buffer);
  sourcePackage.rebuiltPartHashes = await captureRebuiltDocxPartHashes(document);
  document.sourcePackage = sourcePackage;
  return document;
}
