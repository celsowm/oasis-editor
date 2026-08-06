import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type {
  EditorDocument,
  EditorDocxSourcePackage,
  EditorOpcRelationship,
} from "@/core/model.js";
import {
  normalizeOpcPartPath,
  OPC_CONTENT_TYPES_PATH,
  parseOpcContentTypes,
  parseOpcRelationships,
  resolveOpcRelationships,
  serializeOpcContentTypes,
  serializeOpcRelationships,
} from "@/ooxml/opc/packageXml.js";
import { hashDocxPartBytes } from "./rebuiltPartHashes.js";

const CONVENTIONAL_MAIN_DOCUMENT_PATH = "word/document.xml";
const HEADER_RELATIONSHIP_SUFFIX = "/header";
const FOOTER_RELATIONSHIP_SUFFIX = "/footer";
const REFERENCE_TYPE_ORDER = ["first", "even", "default"] as const;

type HeaderFooterKind = "header" | "footer";

interface HeaderFooterReference {
  key: string;
  sectionIndex: number;
  kind: HeaderFooterKind;
  type: string;
  occurrence: number;
  relationshipId: string;
}

interface ResolvedHeaderFooterReference extends HeaderFooterReference {
  relationship: EditorOpcRelationship;
  partPath: string;
  baselinePath?: string;
}

interface HeaderFooterMatch {
  current: ResolvedHeaderFooterReference;
  source: ResolvedHeaderFooterReference;
}

interface HeaderFooterPreservationPlan {
  matches: HeaderFooterMatch[];
  deletedSourcePartPaths: Set<string>;
  sourceRelationshipByCurrentId: Map<string, EditorOpcRelationship>;
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

function partDirectory(path: string): string[] {
  const slashIndex = path.lastIndexOf("/");
  return slashIndex < 0 ? [] : path.slice(0, slashIndex).split("/");
}

function relativeRelationshipTarget(
  ownerPartPath: string,
  targetPartPath: string,
): string {
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

function elementChildren(node: Node): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE) {
      result.push(child as XmlElement);
    }
  }
  return result;
}

function collectElementsByLocalName(node: Node, localName: string): XmlElement[] {
  const result: XmlElement[] = [];
  const visit = (current: Node): void => {
    for (const child of elementChildren(current)) {
      if (child.localName === localName) {
        result.push(child);
      }
      visit(child);
    }
  };
  visit(node);
  return result;
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

function replaceAttributeByLocalName(
  element: XmlElement,
  localName: string,
  value: string,
): boolean {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute?.localName !== localName) {
      continue;
    }
    if (attribute.value === value) {
      return false;
    }
    element.setAttribute(attribute.name, value);
    return true;
  }
  return false;
}

function collectHeaderFooterReferences(xml: string): HeaderFooterReference[] {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const references: HeaderFooterReference[] = [];
  const sectionProperties = collectElementsByLocalName(document, "sectPr");

  sectionProperties.forEach((section, sectionIndex): void => {
    const occurrenceByKindAndType = new Map<string, number>();
    for (const child of elementChildren(section)) {
      const kind: HeaderFooterKind | undefined =
        child.localName === "headerReference"
          ? "header"
          : child.localName === "footerReference"
            ? "footer"
            : undefined;
      if (!kind) {
        continue;
      }
      const relationshipId = getAttributeByLocalName(child, "id");
      if (!relationshipId) {
        continue;
      }
      const type = getAttributeByLocalName(child, "type") ?? "default";
      const occurrenceKey = `${kind}:${type}`;
      const occurrence = occurrenceByKindAndType.get(occurrenceKey) ?? 0;
      occurrenceByKindAndType.set(occurrenceKey, occurrence + 1);
      references.push({
        key: `${sectionIndex}:${kind}:${type}:${occurrence}`,
        sectionIndex,
        kind,
        type,
        occurrence,
        relationshipId,
      });
    }
  });

  return references;
}

function assignBaselinePaths(
  references: ResolvedHeaderFooterReference[],
): void {
  const ordered = [...references].sort((left, right): number => {
    if (left.sectionIndex !== right.sectionIndex) {
      return left.sectionIndex - right.sectionIndex;
    }
    if (left.kind !== right.kind) {
      return left.kind === "header" ? -1 : 1;
    }
    const leftTypeIndex = REFERENCE_TYPE_ORDER.indexOf(
      left.type as (typeof REFERENCE_TYPE_ORDER)[number],
    );
    const rightTypeIndex = REFERENCE_TYPE_ORDER.indexOf(
      right.type as (typeof REFERENCE_TYPE_ORDER)[number],
    );
    const normalizedLeftTypeIndex = leftTypeIndex < 0 ? 99 : leftTypeIndex;
    const normalizedRightTypeIndex = rightTypeIndex < 0 ? 99 : rightTypeIndex;
    if (normalizedLeftTypeIndex !== normalizedRightTypeIndex) {
      return normalizedLeftTypeIndex - normalizedRightTypeIndex;
    }
    if (left.type !== right.type) {
      return left.type.localeCompare(right.type);
    }
    return left.occurrence - right.occurrence;
  });

  let nextHeaderIndex = 1;
  let nextFooterIndex = 1;
  for (const reference of ordered) {
    if (reference.kind === "header") {
      reference.baselinePath = `word/header${nextHeaderIndex}.xml`;
      nextHeaderIndex += 1;
    } else {
      reference.baselinePath = `word/footer${nextFooterIndex}.xml`;
      nextFooterIndex += 1;
    }
  }
}

function sourcePartXml(
  sourcePackage: EditorDocxSourcePackage,
  path: string,
): string | undefined {
  const part = sourcePackage.parts[path];
  return part?.kind === "xml" ? part.data : undefined;
}

function sourceRelationshipsForOwner(
  sourcePackage: EditorDocxSourcePackage,
  ownerPartPath: string,
): EditorOpcRelationship[] {
  const stored =
    sourcePackage.parts[ownerPartPath]?.relationships ??
    parseOpcRelationships(
      sourcePartXml(sourcePackage, relationshipPartPath(ownerPartPath)),
    );
  return resolveOpcRelationships(ownerPartPath, stored);
}

async function zipRelationshipsForOwner(
  zip: JSZip,
  ownerPartPath: string,
): Promise<EditorOpcRelationship[]> {
  const xml = await zip
    .file(relationshipPartPath(ownerPartPath))
    ?.async("string");
  return resolveOpcRelationships(ownerPartPath, parseOpcRelationships(xml));
}

function resolveReferences(
  references: HeaderFooterReference[],
  relationships: EditorOpcRelationship[],
): ResolvedHeaderFooterReference[] {
  const relationshipsById = new Map(
    relationships.map(
      (relationship): readonly [string, EditorOpcRelationship] => [
        relationship.id,
        relationship,
      ],
    ),
  );

  return references.flatMap((reference): ResolvedHeaderFooterReference[] => {
    const relationship = relationshipsById.get(reference.relationshipId);
    if (
      !relationship ||
      relationship.targetMode === "External" ||
      !relationship.resolvedTarget
    ) {
      return [];
    }
    const expectedSuffix =
      reference.kind === "header"
        ? HEADER_RELATIONSHIP_SUFFIX
        : FOOTER_RELATIONSHIP_SUFFIX;
    if (!relationship.type.endsWith(expectedSuffix)) {
      return [];
    }
    return [
      {
        ...reference,
        relationship,
        partPath: relationship.resolvedTarget,
      },
    ];
  });
}

async function buildPreservationPlan(
  sourcePackage: EditorDocxSourcePackage,
  rebuilt: JSZip,
): Promise<HeaderFooterPreservationPlan> {
  const sourceMainXml = sourcePartXml(
    sourcePackage,
    sourcePackage.mainDocumentPart,
  );
  const rebuiltMainXml = await rebuilt
    .file(CONVENTIONAL_MAIN_DOCUMENT_PATH)
    ?.async("string");
  if (!sourceMainXml || !rebuiltMainXml) {
    return {
      matches: [],
      deletedSourcePartPaths: new Set<string>(),
      sourceRelationshipByCurrentId: new Map<string, EditorOpcRelationship>(),
    };
  }

  const sourceReferences = resolveReferences(
    collectHeaderFooterReferences(sourceMainXml),
    sourceRelationshipsForOwner(sourcePackage, sourcePackage.mainDocumentPart),
  );
  assignBaselinePaths(sourceReferences);
  const currentReferences = resolveReferences(
    collectHeaderFooterReferences(rebuiltMainXml),
    await zipRelationshipsForOwner(rebuilt, CONVENTIONAL_MAIN_DOCUMENT_PATH),
  );

  const sourceByKey = new Map(
    sourceReferences.map(
      (reference): readonly [string, ResolvedHeaderFooterReference] => [
        reference.key,
        reference,
      ],
    ),
  );
  const matches: HeaderFooterMatch[] = [];
  const retainedSourcePartPaths = new Set<string>();
  const sourceRelationshipByCurrentId = new Map<
    string,
    EditorOpcRelationship
  >();

  for (const current of currentReferences) {
    const source = sourceByKey.get(current.key);
    if (!source) {
      continue;
    }
    matches.push({ current, source });
    retainedSourcePartPaths.add(source.partPath);
    sourceRelationshipByCurrentId.set(
      current.relationshipId,
      source.relationship,
    );
  }

  const deletedSourcePartPaths = new Set(
    sourceReferences
      .map((reference): string => reference.partPath)
      .filter((path): boolean => !retainedSourcePartPaths.has(path)),
  );

  return {
    matches,
    deletedSourcePartPaths,
    sourceRelationshipByCurrentId,
  };
}

function relationshipKey(relationship: EditorOpcRelationship): string {
  return [
    relationship.type,
    relationship.target,
    relationship.targetMode ?? "Internal",
  ].join("\u0000");
}

function mergeRelationships(
  source: EditorOpcRelationship[],
  current: EditorOpcRelationship[],
  relationshipPartPathValue: string,
): EditorOpcRelationship[] {
  const result: EditorOpcRelationship[] = [];
  const byId = new Map<string, EditorOpcRelationship>();

  for (const relationship of [...current, ...source]) {
    const existing = byId.get(relationship.id);
    if (existing) {
      if (relationshipKey(existing) === relationshipKey(relationship)) {
        continue;
      }
      throw new Error(
        `Cannot safely preserve ${relationshipPartPathValue}: relationship id ${relationship.id} is used for different targets.`,
      );
    }
    byId.set(relationship.id, relationship);
    result.push(relationship);
  }

  return result;
}

function transformRelationshipsForOwner(
  relationships: EditorOpcRelationship[],
  currentOwnerPath: string,
  actualOwnerPath: string,
): EditorOpcRelationship[] {
  return relationships.map((relationship): EditorOpcRelationship => {
    if (relationship.targetMode === "External") {
      return relationship;
    }
    const resolved = resolveOpcRelationships(currentOwnerPath, [relationship])[0]
      ?.resolvedTarget;
    if (!resolved) {
      return relationship;
    }
    return {
      ...relationship,
      target: relativeRelationshipTarget(actualOwnerPath, resolved),
      targetMode: "Internal",
      resolvedTarget: resolved,
    };
  });
}

function rewriteHeaderFooterReferenceIds(
  xml: string,
  relationshipIdMap: ReadonlyMap<string, EditorOpcRelationship>,
): string | undefined {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  let changed = false;
  for (const localName of ["headerReference", "footerReference"]) {
    for (const element of collectElementsByLocalName(document, localName)) {
      const currentId = getAttributeByLocalName(element, "id");
      const sourceRelationship = currentId
        ? relationshipIdMap.get(currentId)
        : undefined;
      if (sourceRelationship) {
        changed =
          replaceAttributeByLocalName(element, "id", sourceRelationship.id) ||
          changed;
      }
    }
  }
  return changed ? new XMLSerializer().serializeToString(document) : undefined;
}

async function patchMainDocumentAndRelationships(
  output: JSZip,
  sourcePackage: EditorDocxSourcePackage,
  plan: HeaderFooterPreservationPlan,
): Promise<void> {
  const mainDocumentXml = await output
    .file(sourcePackage.mainDocumentPart)
    ?.async("string");
  if (mainDocumentXml) {
    const rewritten = rewriteHeaderFooterReferenceIds(
      mainDocumentXml,
      plan.sourceRelationshipByCurrentId,
    );
    if (rewritten) {
      output.file(sourcePackage.mainDocumentPart, rewritten);
    }
  }

  const relationshipPath = relationshipPartPath(sourcePackage.mainDocumentPart);
  const relationshipXml = await output.file(relationshipPath)?.async("string");
  const currentRelationships = resolveOpcRelationships(
    sourcePackage.mainDocumentPart,
    parseOpcRelationships(relationshipXml),
  );
  const transformed: EditorOpcRelationship[] = [];

  for (const relationship of currentRelationships) {
    if (
      relationship.targetMode !== "External" &&
      relationship.resolvedTarget &&
      plan.deletedSourcePartPaths.has(relationship.resolvedTarget)
    ) {
      continue;
    }
    const sourceEquivalent = plan.sourceRelationshipByCurrentId.get(
      relationship.id,
    );
    if (!sourceEquivalent || !sourceEquivalent.resolvedTarget) {
      transformed.push(relationship);
      continue;
    }
    transformed.push({
      ...sourceEquivalent,
      target: relativeRelationshipTarget(
        sourcePackage.mainDocumentPart,
        sourceEquivalent.resolvedTarget,
      ),
      targetMode: "Internal",
    });
  }

  for (const sourceEquivalent of plan.sourceRelationshipByCurrentId.values()) {
    if (
      transformed.some(
        (relationship): boolean => relationship.id === sourceEquivalent.id,
      )
    ) {
      continue;
    }
    if (!sourceEquivalent.resolvedTarget) {
      continue;
    }
    transformed.push({
      ...sourceEquivalent,
      target: relativeRelationshipTarget(
        sourcePackage.mainDocumentPart,
        sourceEquivalent.resolvedTarget,
      ),
      targetMode: "Internal",
    });
  }

  const deduplicated = mergeRelationships([], transformed, relationshipPath);
  if (deduplicated.length > 0) {
    output.file(relationshipPath, serializeOpcRelationships(deduplicated));
  } else {
    output.remove(relationshipPath);
  }
}

function groupMatchesBySourcePart(
  matches: HeaderFooterMatch[],
): Map<string, HeaderFooterMatch[]> {
  const groups = new Map<string, HeaderFooterMatch[]>();
  for (const match of matches) {
    const group = groups.get(match.source.partPath) ?? [];
    group.push(match);
    groups.set(match.source.partPath, group);
  }
  return groups;
}

async function ensureSharedCurrentPartsAreEquivalent(
  rebuilt: JSZip,
  matches: HeaderFooterMatch[],
): Promise<void> {
  if (matches.length < 2) {
    return;
  }
  const hashes = new Set<string>();
  for (const match of matches) {
    const bytes = await rebuilt
      .file(match.current.partPath)
      ?.async("uint8array");
    if (bytes) {
      hashes.add(hashDocxPartBytes(bytes));
    }
  }
  if (hashes.size > 1) {
    throw new Error(
      `Cannot safely preserve shared header/footer part ${matches[0]!.source.partPath}: its section projections diverged after editing.`,
    );
  }
}

async function patchOneHeaderFooterPart(
  rebuilt: JSZip,
  output: JSZip,
  sourcePackage: EditorDocxSourcePackage,
  matches: HeaderFooterMatch[],
): Promise<void> {
  await ensureSharedCurrentPartsAreEquivalent(rebuilt, matches);
  const representative = matches[0]!;
  const currentPath = representative.current.partPath;
  const actualPath = representative.source.partPath;
  const baselinePath = representative.source.baselinePath;
  const currentBytes = await rebuilt.file(currentPath)?.async("uint8array");
  const baselineHash = baselinePath
    ? sourcePackage.rebuiltPartHashes?.[baselinePath]
    : undefined;
  const canKeepSourcePart = Boolean(
    currentBytes &&
      baselineHash &&
      sourcePackage.parts[actualPath] &&
      baselineHash === hashDocxPartBytes(currentBytes),
  );

  if (currentBytes && !canKeepSourcePart) {
    output.file(actualPath, currentBytes);
  }
  for (const match of matches) {
    if (match.current.partPath !== actualPath) {
      output.remove(match.current.partPath);
    }
  }

  const currentRelationshipPath = relationshipPartPath(currentPath);
  const actualRelationshipPath = relationshipPartPath(actualPath);
  const currentRelationshipXml = await rebuilt
    .file(currentRelationshipPath)
    ?.async("string");
  if (!currentRelationshipXml) {
    for (const match of matches) {
      const path = relationshipPartPath(match.current.partPath);
      if (path !== actualRelationshipPath) {
        output.remove(path);
      }
    }
    return;
  }

  const baselineRelationshipPath = baselinePath
    ? relationshipPartPath(baselinePath)
    : undefined;
  const currentRelationshipBytes = await rebuilt
    .file(currentRelationshipPath)
    ?.async("uint8array");
  const baselineRelationshipHash = baselineRelationshipPath
    ? sourcePackage.rebuiltPartHashes?.[baselineRelationshipPath]
    : undefined;
  const canKeepSourceRelationships = Boolean(
    currentRelationshipBytes &&
      baselineRelationshipHash &&
      sourcePackage.parts[actualRelationshipPath] &&
      baselineRelationshipHash === hashDocxPartBytes(currentRelationshipBytes),
  );

  if (!canKeepSourceRelationships) {
    const transformedCurrent = transformRelationshipsForOwner(
      parseOpcRelationships(currentRelationshipXml),
      currentPath,
      actualPath,
    );
    const sourceRelationships = sourceRelationshipsForOwner(
      sourcePackage,
      actualPath,
    );
    const merged = mergeRelationships(
      sourceRelationships,
      transformedCurrent,
      actualRelationshipPath,
    );
    output.file(
      actualRelationshipPath,
      serializeOpcRelationships(merged),
    );
  }

  for (const match of matches) {
    const path = relationshipPartPath(match.current.partPath);
    if (path !== actualRelationshipPath) {
      output.remove(path);
    }
  }
}

async function patchHeaderFooterParts(
  rebuilt: JSZip,
  output: JSZip,
  sourcePackage: EditorDocxSourcePackage,
  plan: HeaderFooterPreservationPlan,
): Promise<void> {
  for (const sourcePath of plan.deletedSourcePartPaths) {
    output.remove(sourcePath);
    output.remove(relationshipPartPath(sourcePath));
  }
  for (const matches of groupMatchesBySourcePart(plan.matches).values()) {
    await patchOneHeaderFooterPart(
      rebuilt,
      output,
      sourcePackage,
      matches,
    );
  }
}

async function patchContentTypes(
  rebuilt: JSZip,
  output: JSZip,
  plan: HeaderFooterPreservationPlan,
): Promise<void> {
  const outputXml = await output.file(OPC_CONTENT_TYPES_PATH)?.async("string");
  if (!outputXml) {
    return;
  }
  const outputContentTypes = parseOpcContentTypes(outputXml);
  const rebuiltXml = await rebuilt.file(OPC_CONTENT_TYPES_PATH)?.async("string");
  const rebuiltContentTypes = parseOpcContentTypes(rebuiltXml);

  for (const deletedPath of plan.deletedSourcePartPaths) {
    delete outputContentTypes.overrides[deletedPath];
  }
  for (const match of plan.matches) {
    const contentType = rebuiltContentTypes.overrides[match.current.partPath];
    if (contentType) {
      outputContentTypes.overrides[match.source.partPath] = contentType;
    }
    if (match.current.partPath !== match.source.partPath) {
      delete outputContentTypes.overrides[match.current.partPath];
    }
  }

  output.file(
    OPC_CONTENT_TYPES_PATH,
    serializeOpcContentTypes(outputContentTypes),
  );
}

/**
 * Final source-backed export pass for the relationship collections that cannot
 * be treated as singleton parts. Header/footer parts are paired by section and
 * reference type, moved back to their source paths, and their source r:ids are
 * restored in sectPr. Deletions and path reindexing are handled explicitly.
 */
export async function patchHeaderFooterSourceParts(
  document: EditorDocument,
  rebuiltBuffer: ArrayBuffer,
  sourcePatchedBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  const sourcePackage = document.sourcePackage;
  if (!sourcePackage) {
    return sourcePatchedBuffer;
  }

  const rebuilt = await JSZip.loadAsync(rebuiltBuffer);
  const plan = await buildPreservationPlan(sourcePackage, rebuilt);
  if (plan.matches.length === 0 && plan.deletedSourcePartPaths.size === 0) {
    return sourcePatchedBuffer;
  }

  const output = await JSZip.loadAsync(sourcePatchedBuffer);
  await patchHeaderFooterParts(rebuilt, output, sourcePackage, plan);
  await patchMainDocumentAndRelationships(output, sourcePackage, plan);
  await patchContentTypes(rebuilt, output, plan);
  return output.generateAsync({ type: "arraybuffer" });
}
