import JSZip from "jszip";
import type {
  EditorDocument,
  EditorDocxSourcePackage,
  EditorOpcContentTypes,
  EditorOpcRelationship,
} from "@/core/model.js";
import {
  getOpcRelationshipOwnerPath,
  normalizeOpcPartPath,
  OPC_CONTENT_TYPES_PATH,
  OPC_ROOT_RELATIONSHIPS_PATH,
  parseOpcContentTypes,
  parseOpcRelationships,
  resolveOpcRelationships,
  serializeOpcContentTypes,
  serializeOpcRelationships,
} from "@/ooxml/opc/packageXml.js";

const OFFICE_DOCUMENT_RELATIONSHIP_SUFFIX = "/officeDocument";

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

const SINGLETON_RELATIONSHIP_SUFFIXES = new Set([
  OFFICE_DOCUMENT_RELATIONSHIP_SUFFIX,
  ...Object.keys(CONVENTIONAL_PART_BY_RELATIONSHIP_SUFFIX),
]);

function relationshipKey(relationship: EditorOpcRelationship): string {
  return [
    relationship.type,
    relationship.target,
    relationship.targetMode ?? "Internal",
  ].join("\u0000");
}

function relationshipPartPath(ownerPartPath: string): string {
  const slashIndex = ownerPartPath.lastIndexOf("/");
  const directory = slashIndex >= 0 ? ownerPartPath.slice(0, slashIndex) : "";
  const fileName =
    slashIndex >= 0 ? ownerPartPath.slice(slashIndex + 1) : ownerPartPath;
  return directory
    ? `${directory}/_rels/${fileName}.rels`
    : `_rels/${fileName}.rels`;
}

function isSingletonRelationship(type: string): boolean {
  for (const suffix of SINGLETON_RELATIONSHIP_SUFFIXES) {
    if (type.endsWith(suffix)) {
      return true;
    }
  }
  return false;
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

function buildRebuiltPathAliases(
  sourcePackage: EditorDocxSourcePackage,
): Map<string, string> {
  const aliases = new Map<string, string>();
  aliases.set("word/document.xml", sourcePackage.mainDocumentPart);

  const mainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  for (const relationship of mainPart?.relationships ?? []) {
    if (
      relationship.targetMode === "External" ||
      !relationship.resolvedTarget
    ) {
      continue;
    }
    const conventionalPath = conventionalPathForRelationship(relationship);
    if (conventionalPath) {
      aliases.set(conventionalPath, relationship.resolvedTarget);
    }
  }

  return aliases;
}

function remapRebuiltPartPath(
  path: string,
  aliases: ReadonlyMap<string, string>,
): string {
  if (path === OPC_CONTENT_TYPES_PATH || path === OPC_ROOT_RELATIONSHIPS_PATH) {
    return path;
  }

  const relationshipOwner = getOpcRelationshipOwnerPath(path);
  if (relationshipOwner === undefined) {
    return aliases.get(path) ?? path;
  }
  if (relationshipOwner === null) {
    return path;
  }

  const actualOwner = aliases.get(relationshipOwner) ?? relationshipOwner;
  return relationshipPartPath(actualOwner);
}

function partDirectory(path: string): string[] {
  const slashIndex = path.lastIndexOf("/");
  return slashIndex < 0 ? [] : path.slice(0, slashIndex).split("/");
}

function relativeRelationshipTarget(
  ownerPartPath: string | null,
  targetPartPath: string,
): string {
  if (ownerPartPath === null) {
    return targetPartPath;
  }

  const from = partDirectory(ownerPartPath);
  const to = targetPartPath.split("/");
  let common = 0;
  while (
    common < from.length &&
    common < to.length &&
    from[common] === to[common]
  ) {
    common += 1;
  }

  return [
    ...Array.from({ length: from.length - common }, (): string => ".."),
    ...to.slice(common),
  ].join("/");
}

function parseStoredRelationships(
  sourcePackage: EditorDocxSourcePackage,
  path: string,
): EditorOpcRelationship[] {
  const part = sourcePackage.parts[path];
  return part?.kind === "xml" ? parseOpcRelationships(part.data) : [];
}

function sourceRelationshipsForOwner(
  sourcePackage: EditorDocxSourcePackage,
  ownerPartPath: string | null,
): EditorOpcRelationship[] {
  if (ownerPartPath === null) {
    return sourcePackage.rootRelationships.length > 0
      ? sourcePackage.rootRelationships
      : parseStoredRelationships(
          sourcePackage,
          OPC_ROOT_RELATIONSHIPS_PATH,
        );
  }

  return (
    sourcePackage.parts[ownerPartPath]?.relationships ??
    parseStoredRelationships(
      sourcePackage,
      relationshipPartPath(ownerPartPath),
    )
  );
}

function transformRebuiltRelationships(
  relationships: EditorOpcRelationship[],
  sourceRelationships: EditorOpcRelationship[],
  conventionalOwnerPath: string | null,
  actualOwnerPath: string | null,
  aliases: ReadonlyMap<string, string>,
): EditorOpcRelationship[] {
  return relationships.map((relationship): EditorOpcRelationship => {
    if (relationship.targetMode === "External") {
      return relationship;
    }

    const sourceEquivalent = isSingletonRelationship(relationship.type)
      ? sourceRelationships.find(
          (candidate): boolean =>
            candidate.targetMode !== "External" &&
            candidate.type === relationship.type,
        )
      : undefined;

    const resolvedRebuilt = resolveOpcRelationships(
      conventionalOwnerPath,
      [relationship],
    )[0]?.resolvedTarget;
    const actualTarget =
      sourceEquivalent?.resolvedTarget ??
      (resolvedRebuilt
        ? aliases.get(resolvedRebuilt) ?? resolvedRebuilt
        : undefined);

    if (!actualTarget) {
      return relationship;
    }

    return {
      ...relationship,
      // Singleton relationships such as styles/settings do not have r:id
      // references inside document markup, so retaining their source id avoids
      // needless duplicate relationships. Header/footer/image/link ids remain
      // generated because the rebuilt XML directly references them.
      ...(sourceEquivalent ? { id: sourceEquivalent.id } : {}),
      target: relativeRelationshipTarget(actualOwnerPath, actualTarget),
      targetMode: "Internal",
      resolvedTarget: actualTarget,
    };
  });
}

function mergeRelationships(
  source: EditorOpcRelationship[],
  rebuilt: EditorOpcRelationship[],
  relationshipPartPathValue: string,
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

  for (const relationship of source) {
    const rebuiltWithSameId = rebuiltById.get(relationship.id);
    if (rebuiltWithSameId) {
      if (relationshipKey(rebuiltWithSameId) === relationshipKey(relationship)) {
        continue;
      }
      throw new Error(
        `Cannot safely preserve ${relationshipPartPathValue}: relationship id ${relationship.id} is used by both the source package and rebuilt document for different targets.`,
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
  aliases: ReadonlyMap<string, string>,
): string {
  const rebuilt = parseOpcContentTypes(rebuiltXml);
  const remappedOverrides: Record<string, string> = {};
  for (const [path, contentType] of Object.entries(rebuilt.overrides)) {
    remappedOverrides[aliases.get(path) ?? path] = contentType;
  }

  return serializeOpcContentTypes({
    defaults: { ...source.defaults, ...rebuilt.defaults },
    overrides: { ...source.overrides, ...remappedOverrides },
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
 * Relationship-discovered source paths remain authoritative: rebuilt parts are
 * relocated to those paths and their internal targets are rebased accordingly.
 */
export async function patchRebuiltDocxWithSourcePackage(
  document: EditorDocument,
  rebuiltBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  const sourcePackage = document.sourcePackage;
  if (!sourcePackage) {
    return rebuiltBuffer;
  }

  const aliases = buildRebuiltPathAliases(sourcePackage);
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

    const actualPath = remapRebuiltPartPath(path, aliases);
    const relationshipOwner = getOpcRelationshipOwnerPath(path);
    if (relationshipOwner !== undefined) {
      const conventionalOwner = relationshipOwner;
      const actualOwner =
        conventionalOwner === null
          ? null
          : aliases.get(conventionalOwner) ?? conventionalOwner;
      const sourceRelationships = sourceRelationshipsForOwner(
        sourcePackage,
        actualOwner,
      );
      const rebuiltRelationships = transformRebuiltRelationships(
        parseOpcRelationships(await entry.async("string")),
        sourceRelationships,
        conventionalOwner,
        actualOwner,
        aliases,
      );
      const mergedRelationships = mergeRelationships(
        sourceRelationships,
        rebuiltRelationships,
        actualPath,
      );
      output.file(actualPath, serializeOpcRelationships(mergedRelationships));
      continue;
    }

    output.file(actualPath, await entry.async("uint8array"));
  }

  if (rebuiltContentTypesXml) {
    output.file(
      OPC_CONTENT_TYPES_PATH,
      mergeContentTypes(
        sourcePackage.contentTypes,
        rebuiltContentTypesXml,
        aliases,
      ),
    );
  }

  return output.generateAsync({ type: "arraybuffer" });
}
