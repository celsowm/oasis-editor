import JSZip from "jszip";
import type {
  EditorDocxSourcePackage,
  EditorOpcPart,
  EditorOpcRelationship,
} from "@/core/model.js";
import { serializeOpcRelationships } from "@/ooxml/opc/packageXml.js";

const CONVENTIONAL_MAIN_DOCUMENT_PATH = "word/document.xml";
const ALIAS_ROOT = "word/__oasis_source__";

const CONVENTIONAL_PART_BY_RELATIONSHIP_SUFFIX: Record<string, string> = {
  "/styles": "word/styles.xml",
  "/numbering": "word/numbering.xml",
  "/settings": "word/settings.xml",
  "/fontTable": "word/fontTable.xml",
  "/theme": "word/theme/theme1.xml",
  "/footnotes": "word/footnotes.xml",
  "/endnotes": "word/endnotes.xml",
  "/comments": "word/comments.xml",
  "/commentsExtended": "word/commentsExtended.xml",
};

function relationshipPartPath(ownerPartPath: string): string {
  const slashIndex = ownerPartPath.lastIndexOf("/");
  const directory = slashIndex >= 0 ? ownerPartPath.slice(0, slashIndex) : "";
  const fileName =
    slashIndex >= 0 ? ownerPartPath.slice(slashIndex + 1) : ownerPartPath;
  return directory
    ? `${directory}/_rels/${fileName}.rels`
    : `_rels/${fileName}.rels`;
}

function writePart(zip: JSZip, path: string, part: EditorOpcPart): void {
  if (part.encoding === "base64") {
    zip.file(path, part.data, { base64: true });
  } else {
    zip.file(path, part.data);
  }
}

function aliasPath(sourcePath: string): string {
  return `${ALIAS_ROOT}/${sourcePath}`;
}

function importerTarget(sourcePath: string): string {
  return `__oasis_source__/${sourcePath}`;
}

function rewriteRelationshipsForImporter(
  relationships: EditorOpcRelationship[] | undefined,
): EditorOpcRelationship[] {
  if (!relationships) {
    return [];
  }
  return relationships.map((relationship): EditorOpcRelationship => {
    if (
      relationship.targetMode === "External" ||
      !relationship.resolvedTarget
    ) {
      return relationship;
    }
    return {
      ...relationship,
      target: importerTarget(relationship.resolvedTarget),
      resolvedTarget: undefined,
    };
  });
}

function conventionalPathForRelationship(
  relationship: EditorOpcRelationship,
): string | undefined {
  for (const [suffix, path] of Object.entries(
    CONVENTIONAL_PART_BY_RELATIONSHIP_SUFFIX,
  )) {
    if (relationship.type.endsWith(suffix)) {
      return path;
    }
  }
  return undefined;
}

export function requiresDocxImporterCompatibilityPackage(
  sourcePackage: EditorDocxSourcePackage,
): boolean {
  if (sourcePackage.mainDocumentPart !== CONVENTIONAL_MAIN_DOCUMENT_PATH) {
    return true;
  }

  const mainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  return Boolean(
    mainPart?.relationships?.some((relationship): boolean => {
      const conventionalPath = conventionalPathForRelationship(relationship);
      return Boolean(
        conventionalPath &&
          relationship.resolvedTarget &&
          relationship.resolvedTarget !== conventionalPath,
      );
    }),
  );
}

/**
 * Builds a temporary compatibility package for the current semantic importer.
 * The original source snapshot remains authoritative and is attached to the
 * resulting editor document; these aliases exist only so legacy path-based
 * parsers can consume relationship-discovered packages.
 */
export async function prepareDocxForCurrentImporter(
  originalBuffer: ArrayBuffer,
  sourcePackage: EditorDocxSourcePackage,
): Promise<ArrayBuffer> {
  if (!requiresDocxImporterCompatibilityPackage(sourcePackage)) {
    return originalBuffer;
  }

  const zip = new JSZip();
  for (const part of Object.values(sourcePackage.parts)) {
    writePart(zip, part.path, part);
  }

  for (const part of Object.values(sourcePackage.parts)) {
    if (part.path.endsWith(".rels") || part.path === "[Content_Types].xml") {
      continue;
    }
    const relocatedPath = aliasPath(part.path);
    writePart(zip, relocatedPath, part);
    const relationships = rewriteRelationshipsForImporter(part.relationships);
    if (relationships.length > 0) {
      zip.file(
        relationshipPartPath(relocatedPath),
        serializeOpcRelationships(relationships),
      );
    }
  }

  const mainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  if (!mainPart) {
    throw new Error(
      `DOCX source package is missing its main part: ${sourcePackage.mainDocumentPart}`,
    );
  }
  writePart(zip, CONVENTIONAL_MAIN_DOCUMENT_PATH, mainPart);

  const mainRelationships = rewriteRelationshipsForImporter(
    mainPart.relationships,
  );
  if (mainRelationships.length > 0) {
    zip.file(
      relationshipPartPath(CONVENTIONAL_MAIN_DOCUMENT_PATH),
      serializeOpcRelationships(mainRelationships),
    );
  }

  for (const relationship of mainPart.relationships ?? []) {
    if (
      relationship.targetMode === "External" ||
      !relationship.resolvedTarget
    ) {
      continue;
    }
    const conventionalPath = conventionalPathForRelationship(relationship);
    const relatedPart = sourcePackage.parts[relationship.resolvedTarget];
    if (!conventionalPath || !relatedPart) {
      continue;
    }
    writePart(zip, conventionalPath, relatedPart);
    const relatedRelationships = rewriteRelationshipsForImporter(
      relatedPart.relationships,
    );
    if (relatedRelationships.length > 0) {
      zip.file(
        relationshipPartPath(conventionalPath),
        serializeOpcRelationships(relatedRelationships),
      );
    }
  }

  return zip.generateAsync({ type: "arraybuffer" });
}
