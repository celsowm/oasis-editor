import JSZip from "jszip";
import type {
  EditorDocument,
  EditorDocxSourcePackage,
  EditorOpcContentTypes,
  EditorOpcRelationship,
} from "@/core/model.js";
import {
  normalizeOpcPartPath,
  OPC_CONTENT_TYPES_PATH,
  OPC_ROOT_RELATIONSHIPS_PATH,
  parseOpcContentTypes,
  parseOpcRelationships,
  serializeOpcContentTypes,
  serializeOpcRelationships,
} from "@/ooxml/opc/packageXml.js";

const OFFICE_DOCUMENT_RELATIONSHIP_SUFFIX = "/officeDocument";

function relationshipKey(relationship: EditorOpcRelationship): string {
  return [
    relationship.type,
    relationship.target,
    relationship.targetMode ?? "Internal",
  ].join("\u0000");
}

function mergeRelationships(
  source: EditorOpcRelationship[],
  rebuilt: EditorOpcRelationship[],
  relationshipPartPath: string,
): EditorOpcRelationship[] {
  const result = [...rebuilt];
  const rebuiltById = new Map(
    rebuilt.map(
      (relationship): readonly [string, EditorOpcRelationship] => [
        relationship.id,
        relationship,
      ],
    ),
  );
  const replacesOfficeDocument =
    relationshipPartPath === OPC_ROOT_RELATIONSHIPS_PATH &&
    rebuilt.some((relationship): boolean =>
      relationship.type.endsWith(OFFICE_DOCUMENT_RELATIONSHIP_SUFFIX),
    );

  for (const relationship of source) {
    if (
      replacesOfficeDocument &&
      relationship.type.endsWith(OFFICE_DOCUMENT_RELATIONSHIP_SUFFIX)
    ) {
      continue;
    }

    const rebuiltWithSameId = rebuiltById.get(relationship.id);
    if (rebuiltWithSameId) {
      if (relationshipKey(rebuiltWithSameId) === relationshipKey(relationship)) {
        continue;
      }
      throw new Error(
        `Cannot safely preserve ${relationshipPartPath}: relationship id ${relationship.id} is used by both the source package and rebuilt document for different targets.`,
      );
    }

    // Keep the original id even when another relationship has the same target.
    // Unknown source markup may still reference this exact r:id.
    result.push(relationship);
  }

  return result;
}

function mergeContentTypes(
  source: EditorOpcContentTypes,
  rebuiltXml: string,
): string {
  const rebuilt = parseOpcContentTypes(rebuiltXml);
  return serializeOpcContentTypes({
    defaults: { ...source.defaults, ...rebuilt.defaults },
    overrides: { ...source.overrides, ...rebuilt.overrides },
  });
}

function writeSourcePart(
  zip: JSZip,
  sourcePackage: EditorDocxSourcePackage,
  path: string,
): void {
  const part = sourcePackage.parts[path];
  if (!part) {
    return;
  }
  if (part.encoding === "base64") {
    zip.file(path, part.data, { base64: true });
  } else {
    zip.file(path, part.data);
  }
}

/**
 * Clones the imported package and overlays the freshly rebuilt Oasis parts.
 * Unknown source parts remain untouched. Content types and relationship parts
 * are merged instead of blindly replaced so unrelated package features survive.
 */
export async function patchRebuiltDocxWithSourcePackage(
  document: EditorDocument,
  rebuiltBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  const sourcePackage = document.sourcePackage;
  if (!sourcePackage) {
    return rebuiltBuffer;
  }

  const output = new JSZip();
  for (const path of Object.keys(sourcePackage.parts)) {
    writeSourcePart(output, sourcePackage, path);
  }

  const rebuilt = await JSZip.loadAsync(rebuiltBuffer);
  let rebuiltContentTypesXml: string | null = null;

  for (const [rawPath, entry] of Object.entries(rebuilt.files)) {
    if (entry.dir) {
      continue;
    }
    const path = normalizeOpcPartPath(rawPath);

    if (path === OPC_CONTENT_TYPES_PATH) {
      rebuiltContentTypesXml = await entry.async("string");
      continue;
    }

    if (path.endsWith(".rels")) {
      const rebuiltRelationshipsXml = await entry.async("string");
      const sourcePart = sourcePackage.parts[path];
      const mergedRelationships = mergeRelationships(
        sourcePart?.kind === "xml"
          ? parseOpcRelationships(sourcePart.data)
          : [],
        parseOpcRelationships(rebuiltRelationshipsXml),
        path,
      );
      output.file(path, serializeOpcRelationships(mergedRelationships));
      continue;
    }

    output.file(path, await entry.async("uint8array"));
  }

  if (rebuiltContentTypesXml) {
    output.file(
      OPC_CONTENT_TYPES_PATH,
      mergeContentTypes(sourcePackage.contentTypes, rebuiltContentTypesXml),
    );
  }

  return output.generateAsync({ type: "arraybuffer" });
}
