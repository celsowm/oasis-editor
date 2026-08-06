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
import { hashDocxPartBytes } from "./rebuiltPartHashes.js";

const CONVENTIONAL_MAIN_DOCUMENT_PATH = "word/document.xml";
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

const SINGLETON_RELATIONSHIP_SUFFIXES = [
  OFFICE_DOCUMENT_RELATIONSHIP_SUFFIX,
  ...Object.keys(CONVENTIONAL_PART_BY_RELATIONSHIP_SUFFIX),
] as const;

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

function singletonRelationshipSuffix(type: string): string | undefined {
  return SINGLETON_RELATIONSHIP_SUFFIXES.find((suffix): boolean =>
    type.endsWith(suffix),
  );
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
  aliases.set(CONVENTIONAL_MAIN_DOCUMENT_PATH, sourcePackage.mainDocumentPart);

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

function conventionalOwnerPath(
  actualOwnerPath: string,
  aliases: ReadonlyMap<string, string>,
): string {
  for (const [rebuiltPath, actualPath] of aliases) {
    if (actualPath === actualOwnerPath) {
      return rebuiltPath;
    }
  }
  return actualOwnerPath;
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

function unfilteredSourceRelationshipsForOwner(
  sourcePackage: EditorDocxSourcePackage,
  ownerPartPath: string | null,
): EditorOpcRelationship[] {
  const relationships =
    ownerPartPath === null
      ? sourcePackage.rootRelationships.length > 0
        ? sourcePackage.rootRelationships
        : parseStoredRelationships(sourcePackage, OPC_ROOT_RELATIONSHIPS_PATH)
      : (sourcePackage.parts[ownerPartPath]?.relationships ??
        parseStoredRelationships(
          sourcePackage,
          relationshipPartPath(ownerPartPath),
        ));
  return resolveOpcRelationships(ownerPartPath, relationships);
}

function sourceRelationshipsForOwner(
  sourcePackage: EditorDocxSourcePackage,
  ownerPartPath: string | null,
  deletedPartPaths: ReadonlySet<string>,
): EditorOpcRelationship[] {
  return unfilteredSourceRelationshipsForOwner(
    sourcePackage,
    ownerPartPath,
  ).filter(
    (relationship): boolean =>
      relationship.targetMode === "External" ||
      !relationship.resolvedTarget ||
      !deletedPartPaths.has(relationship.resolvedTarget),
  );
}

function transformRebuiltRelationships(
  relationships: EditorOpcRelationship[],
  sourceRelationships: EditorOpcRelationship[],
  conventionalOwnerPathValue: string | null,
  actualOwnerPath: string | null,
  aliases: ReadonlyMap<string, string>,
): EditorOpcRelationship[] {
  return relationships.map((relationship): EditorOpcRelationship => {
    if (relationship.targetMode === "External") {
      return relationship;
    }

    const semanticSuffix = singletonRelationshipSuffix(relationship.type);
    const sourceEquivalent = semanticSuffix
      ? sourceRelationships.find(
          (candidate): boolean =>
            candidate.targetMode !== "External" &&
            candidate.type.endsWith(semanticSuffix),
        )
      : undefined;

    const resolvedRebuilt = resolveOpcRelationships(
      conventionalOwnerPathValue,
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
      // needless duplicates. The original relationship type is also retained
      // so ISO/IEC 29500 Strict packages do not silently become Transitional.
      ...(sourceEquivalent
        ? { id: sourceEquivalent.id, type: sourceEquivalent.type }
        : {}),
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
  deletedPartPaths: ReadonlySet<string>,
): string {
  const rebuilt = parseOpcContentTypes(rebuiltXml);
  const remappedOverrides: Record<string, string> = {};
  for (const [path, contentType] of Object.entries(rebuilt.overrides)) {
    remappedOverrides[aliases.get(path) ?? path] = contentType;
  }

  const preservedSourceOverrides = Object.fromEntries(
    Object.entries(source.overrides).filter(
      ([path]): boolean => !deletedPartPaths.has(path),
    ),
  );

  return serializeOpcContentTypes({
    defaults: { ...source.defaults, ...rebuilt.defaults },
    overrides: { ...preservedSourceOverrides, ...remappedOverrides },
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

function canKeepSourcePartUntouched(
  sourcePackage: EditorDocxSourcePackage,
  rebuiltPath: string,
  actualPath: string,
  rebuiltBytes: Uint8Array,
): boolean {
  const baselineHash = sourcePackage.rebuiltPartHashes?.[rebuiltPath];
  return Boolean(
    baselineHash &&
      sourcePackage.parts[actualPath] &&
      baselineHash === hashDocxPartBytes(rebuiltBytes),
  );
}

function findDeletedModeledPartPaths(
  sourcePackage: EditorDocxSourcePackage,
  aliases: ReadonlyMap<string, string>,
  rebuiltPaths: ReadonlySet<string>,
): Set<string> {
  const deleted = new Set<string>();
  for (const [rebuiltPath, actualPath] of aliases) {
    if (rebuiltPath === CONVENTIONAL_MAIN_DOCUMENT_PATH) {
      continue;
    }
    if (
      sourcePackage.rebuiltPartHashes?.[rebuiltPath] &&
      !rebuiltPaths.has(rebuiltPath) &&
      sourcePackage.parts[actualPath]
    ) {
      deleted.add(actualPath);
    }
  }
  return deleted;
}

function cleanRelationshipPartsForDeletedTargets(
  output: JSZip,
  sourcePackage: EditorDocxSourcePackage,
  aliases: ReadonlyMap<string, string>,
  rebuiltPaths: ReadonlySet<string>,
  deletedPartPaths: ReadonlySet<string>,
): void {
  if (deletedPartPaths.size === 0) {
    return;
  }

  for (const sourceRelationshipPartPath of Object.keys(sourcePackage.parts)) {
    const actualOwnerPath = getOpcRelationshipOwnerPath(
      sourceRelationshipPartPath,
    );
    if (actualOwnerPath === undefined || actualOwnerPath === null) {
      continue;
    }

    const original = unfilteredSourceRelationshipsForOwner(
      sourcePackage,
      actualOwnerPath,
    );
    const filtered = original.filter(
      (relationship): boolean =>
        relationship.targetMode === "External" ||
        !relationship.resolvedTarget ||
        !deletedPartPaths.has(relationship.resolvedTarget),
    );
    if (filtered.length === original.length) {
      continue;
    }

    const rebuiltOwner = conventionalOwnerPath(actualOwnerPath, aliases);
    if (rebuiltPaths.has(relationshipPartPath(rebuiltOwner))) {
      continue;
    }

    if (filtered.length === 0) {
      output.remove(sourceRelationshipPartPath);
    } else {
      output.file(
        sourceRelationshipPartPath,
        serializeOpcRelationships(filtered),
      );
    }
  }
}

/**
 * Clones the imported package and overlays only changed freshly rebuilt Oasis
 * parts. Unknown source parts remain untouched. Content types and relationship
 * parts are merged instead of blindly replaced so unrelated package features
 * survive. Relationship-discovered source paths remain authoritative: rebuilt
 * parts are relocated to those paths and their internal targets are rebased.
 * Modeled singleton parts present in the import baseline but absent from the
 * current rebuild are treated as explicit deletions rather than resurrected.
 */
export async function patchRebuiltDocxWithSourcePackage(
  document: EditorDocument,
  rebuiltBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  const sourcePackage = document.sourcePackage;
  if (!sourcePackage) {
    return rebuiltBuffer;
  }

  const rebuilt = await JSZip.loadAsync(rebuiltBuffer);
  const rebuiltPaths = new Set(
    Object.entries(rebuilt.files)
      .filter(([, entry]): boolean => !entry.dir)
      .map(([rawPath]): string => normalizeOpcPartPath(rawPath)),
  );
  const aliases = buildRebuiltPathAliases(sourcePackage);
  const deletedPartPaths = findDeletedModeledPartPaths(
    sourcePackage,
    aliases,
    rebuiltPaths,
  );

  const output = new JSZip();
  for (const path of Object.keys(sourcePackage.parts)) {
    writeSourcePart(output, sourcePackage, path);
  }
  for (const path of deletedPartPaths) {
    output.remove(path);
    output.remove(relationshipPartPath(path));
  }
  cleanRelationshipPartsForDeletedTargets(
    output,
    sourcePackage,
    aliases,
    rebuiltPaths,
    deletedPartPaths,
  );

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
      const rebuiltOwner = relationshipOwner;
      const actualOwner =
        rebuiltOwner === null
          ? null
          : aliases.get(rebuiltOwner) ?? rebuiltOwner;
      const sourceRelationships = sourceRelationshipsForOwner(
        sourcePackage,
        actualOwner,
        deletedPartPaths,
      );
      const rebuiltRelationships = transformRebuiltRelationships(
        parseOpcRelationships(await entry.async("string")),
        sourceRelationships,
        rebuiltOwner,
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

    const rebuiltBytes = await entry.async("uint8array");
    if (
      canKeepSourcePartUntouched(
        sourcePackage,
        path,
        actualPath,
        rebuiltBytes,
      )
    ) {
      continue;
    }
    output.file(actualPath, rebuiltBytes);
  }

  if (rebuiltContentTypesXml) {
    output.file(
      OPC_CONTENT_TYPES_PATH,
      mergeContentTypes(
        sourcePackage.contentTypes,
        rebuiltContentTypesXml,
        aliases,
        deletedPartPaths,
      ),
    );
  }

  return output.generateAsync({ type: "arraybuffer" });
}
