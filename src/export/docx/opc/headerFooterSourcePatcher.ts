import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import type {
  EditorDocument,
  EditorDocxSourcePackage,
  EditorOpcRelationship,
} from "@/core/model.js";
import {
  OPC_CONTENT_TYPES_PATH,
  parseOpcContentTypes,
  parseOpcRelationships,
  resolveOpcRelationships,
  serializeOpcContentTypes,
  serializeOpcRelationships,
} from "@/ooxml/opc/packageXml.js";
import { hashDocxPartBytes } from "./rebuiltPartHashes.js";
import { patchRebuiltDocxWithSourcePackage } from "./sourcePackagePatcher.js";

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

interface ParsedHeaderFooterReferences {
  references: HeaderFooterReference[];
  sectionCount: number;
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

function elementChildren(node: XmlNode): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE) {
      result.push(child as XmlElement);
    }
  }
  return result;
}

function collectElementsByLocalName(
  node: XmlNode,
  localName: string,
): XmlElement[] {
  const result: XmlElement[] = [];
  const visit = (current: XmlNode): void => {
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

function collectHeaderFooterReferences(
  xml: string,
): ParsedHeaderFooterReferences {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const references: HeaderFooterReference[] = [];
  const sectionProperties = collectElementsByLocalName(document, "sectPr").filter(
    (element): boolean =>
      (element.parentNode as XmlElement | null)?.localName !== "sectPrChange",
  );

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

  return { references, sectionCount: sectionProperties.length };
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

  const parsedSource = collectHeaderFooterReferences(sourceMainXml);
  const parsedCurrent = collectHeaderFooterReferences(rebuiltMainXml);
  const sourceReferences = resolveReferences(
    parsedSource.references,
    sourceRelationshipsForOwner(sourcePackage, sourcePackage.mainDocumentPart),
  );
  assignBaselinePaths(sourceReferences);
  const currentReferences = resolveReferences(
    parsedCurrent.references,
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

  // Section insertion/removal shifts every later section index. In that case
  // exact-key matches are still safe, but deleting unmatched source parts is
  // not: retain them opaquely rather than guessing that they were removed.
  const canDeleteUnmatchedSourceParts =
    parsedSource.sectionCount === parsedCurrent.sectionCount;
  const deletedSourcePartPaths = canDeleteUnmatchedSourceParts
    ? new Set(
        sourceReferences
          .map((reference): string => reference.partPath)
          .filter((path): boolean => !retainedSourcePartPaths.has(path)),
      )
    : new Set<string>();

  return {
    matches,
    deletedSourcePartPaths,
    sourceRelationshipByCurrentId,
  };
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

function relationshipKey(relationship: EditorOpcRelationship): string {
  return [
    relationship.type,
    relationship.target,
    relationship.targetMode ?? "Internal",
  ].join("\u0000");
}

function deduplicateRelationships(
  relationships: EditorOpcRelationship[],
  relationshipPartPathValue: string,
): EditorOpcRelationship[] {
  const result: EditorOpcRelationship[] = [];
  const byId = new Map<string, EditorOpcRelationship>();
  for (const relationship of relationships) {
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

async function rebuiltPartMatchesBaseline(
  rebuilt: JSZip,
  sourcePackage: EditorDocxSourcePackage,
  currentPath: string,
  baselinePath: string | undefined,
): Promise<boolean> {
  if (!baselinePath) {
    return false;
  }
  const baselineHash = sourcePackage.rebuiltPartHashes?.[baselinePath];
  const entry = rebuilt.file(currentPath);
  if (!entry) {
    return baselineHash === undefined;
  }
  if (!baselineHash) {
    return false;
  }
  return baselineHash === hashDocxPartBytes(await entry.async("uint8array"));
}

async function groupMatchesBaseline(
  rebuilt: JSZip,
  sourcePackage: EditorDocxSourcePackage,
  matches: HeaderFooterMatch[],
  relationshipPart: boolean,
): Promise<boolean> {
  for (const match of matches) {
    const currentPath = relationshipPart
      ? relationshipPartPath(match.current.partPath)
      : match.current.partPath;
    const baselinePath = match.source.baselinePath
      ? relationshipPart
        ? relationshipPartPath(match.source.baselinePath)
        : match.source.baselinePath
      : undefined;
    if (
      !(await rebuiltPartMatchesBaseline(
        rebuilt,
        sourcePackage,
        currentPath,
        baselinePath,
      ))
    ) {
      return false;
    }
  }
  return true;
}

async function ensureSharedCurrentPartsAreEquivalent(
  rebuilt: JSZip,
  matches: HeaderFooterMatch[],
  relationshipPart: boolean,
): Promise<void> {
  if (matches.length < 2) {
    return;
  }
  const signatures = new Set<string>();
  for (const match of matches) {
    const path = relationshipPart
      ? relationshipPartPath(match.current.partPath)
      : match.current.partPath;
    const bytes = await rebuilt.file(path)?.async("uint8array");
    signatures.add(bytes ? hashDocxPartBytes(bytes) : "<missing>");
  }
  if (signatures.size > 1) {
    throw new Error(
      `Cannot safely preserve shared header/footer part ${matches[0]!.source.partPath}: its section projections diverged after editing.`,
    );
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

async function prepareMainDocumentAndRelationships(
  rebuilt: JSZip,
  sourcePackage: EditorDocxSourcePackage,
  plan: HeaderFooterPreservationPlan,
): Promise<void> {
  const mainEntry = rebuilt.file(CONVENTIONAL_MAIN_DOCUMENT_PATH);
  const mainXml = await mainEntry?.async("string");
  if (mainXml) {
    const baselineHash =
      sourcePackage.rebuiltPartHashes?.[CONVENTIONAL_MAIN_DOCUMENT_PATH];
    const currentHash = hashDocxPartBytes(new TextEncoder().encode(mainXml));
    if (!baselineHash || baselineHash !== currentHash) {
      const rewritten = rewriteHeaderFooterReferenceIds(
        mainXml,
        plan.sourceRelationshipByCurrentId,
      );
      if (rewritten) {
        rebuilt.file(CONVENTIONAL_MAIN_DOCUMENT_PATH, rewritten);
      }
    }
  }

  const relationshipPath = relationshipPartPath(
    CONVENTIONAL_MAIN_DOCUMENT_PATH,
  );
  const currentRelationships = parseOpcRelationships(
    await rebuilt.file(relationshipPath)?.async("string"),
  );
  const transformed = currentRelationships.map(
    (relationship): EditorOpcRelationship => {
      const sourceEquivalent = plan.sourceRelationshipByCurrentId.get(
        relationship.id,
      );
      if (!sourceEquivalent?.resolvedTarget) {
        return relationship;
      }
      return {
        ...sourceEquivalent,
        target: relativeRelationshipTarget(
          CONVENTIONAL_MAIN_DOCUMENT_PATH,
          sourceEquivalent.resolvedTarget,
        ),
        targetMode: "Internal",
      };
    },
  );
  rebuilt.file(
    relationshipPath,
    serializeOpcRelationships(
      deduplicateRelationships(transformed, relationshipPath),
    ),
  );
}

async function prepareOneHeaderFooterPart(
  rebuilt: JSZip,
  sourcePackage: EditorDocxSourcePackage,
  matches: HeaderFooterMatch[],
): Promise<void> {
  const representative = matches[0]!;
  const actualPath = representative.source.partPath;
  const keepSourcePart = await groupMatchesBaseline(
    rebuilt,
    sourcePackage,
    matches,
    false,
  );
  if (!keepSourcePart) {
    await ensureSharedCurrentPartsAreEquivalent(rebuilt, matches, false);
    const currentBytes = await rebuilt
      .file(representative.current.partPath)
      ?.async("uint8array");
    if (!currentBytes) {
      throw new Error(
        `Cannot preserve ${actualPath}: rebuilt header/footer part is missing.`,
      );
    }
    rebuilt.file(actualPath, currentBytes);
  }
  for (const match of matches) {
    if (match.current.partPath !== actualPath) {
      rebuilt.remove(match.current.partPath);
    }
  }

  const actualRelationshipPath = relationshipPartPath(actualPath);
  const keepSourceRelationships = await groupMatchesBaseline(
    rebuilt,
    sourcePackage,
    matches,
    true,
  );
  if (!keepSourceRelationships) {
    await ensureSharedCurrentPartsAreEquivalent(rebuilt, matches, true);
    const currentRelationshipPath = relationshipPartPath(
      representative.current.partPath,
    );
    const currentRelationshipXml = await rebuilt
      .file(currentRelationshipPath)
      ?.async("string");
    if (currentRelationshipXml) {
      rebuilt.file(
        actualRelationshipPath,
        serializeOpcRelationships(
          transformRelationshipsForOwner(
            parseOpcRelationships(currentRelationshipXml),
            representative.current.partPath,
            actualPath,
          ),
        ),
      );
    }
  }
  for (const match of matches) {
    const currentRelationshipPath = relationshipPartPath(
      match.current.partPath,
    );
    if (currentRelationshipPath !== actualRelationshipPath) {
      rebuilt.remove(currentRelationshipPath);
    }
  }
}

async function prepareHeaderFooterParts(
  rebuilt: JSZip,
  sourcePackage: EditorDocxSourcePackage,
  plan: HeaderFooterPreservationPlan,
): Promise<void> {
  for (const matches of groupMatchesBySourcePart(plan.matches).values()) {
    await prepareOneHeaderFooterPart(rebuilt, sourcePackage, matches);
  }
}

async function prepareContentTypes(
  rebuilt: JSZip,
  plan: HeaderFooterPreservationPlan,
): Promise<void> {
  const xml = await rebuilt.file(OPC_CONTENT_TYPES_PATH)?.async("string");
  if (!xml) {
    return;
  }
  const contentTypes = parseOpcContentTypes(xml);
  for (const match of plan.matches) {
    const contentType = contentTypes.overrides[match.current.partPath];
    if (contentType) {
      contentTypes.overrides[match.source.partPath] = contentType;
    }
    if (match.current.partPath !== match.source.partPath) {
      delete contentTypes.overrides[match.current.partPath];
    }
  }
  rebuilt.file(
    OPC_CONTENT_TYPES_PATH,
    serializeOpcContentTypes(contentTypes),
  );
}

function sourceDocumentWithoutDeletedHeaderFooterParts(
  document: EditorDocument,
  deletedPartPaths: ReadonlySet<string>,
): EditorDocument {
  const sourcePackage = document.sourcePackage;
  if (!sourcePackage || deletedPartPaths.size === 0) {
    return document;
  }

  const contentTypes = {
    defaults: { ...sourcePackage.contentTypes.defaults },
    overrides: Object.fromEntries(
      Object.entries(sourcePackage.contentTypes.overrides).filter(
        ([path]): boolean => !deletedPartPaths.has(path),
      ),
    ),
  };
  const parts = { ...sourcePackage.parts };
  for (const path of deletedPartPaths) {
    delete parts[path];
    delete parts[relationshipPartPath(path)];
  }

  const mainPart = parts[sourcePackage.mainDocumentPart];
  const filteredMainRelationships = sourceRelationshipsForOwner(
    sourcePackage,
    sourcePackage.mainDocumentPart,
  ).filter(
    (relationship): boolean =>
      relationship.targetMode === "External" ||
      !relationship.resolvedTarget ||
      !deletedPartPaths.has(relationship.resolvedTarget),
  );
  if (mainPart) {
    parts[sourcePackage.mainDocumentPart] = {
      ...mainPart,
      relationships: filteredMainRelationships,
    };
  }

  const mainRelationshipPath = relationshipPartPath(
    sourcePackage.mainDocumentPart,
  );
  const mainRelationshipPart = parts[mainRelationshipPath];
  if (mainRelationshipPart) {
    parts[mainRelationshipPath] = {
      ...mainRelationshipPart,
      data: serializeOpcRelationships(filteredMainRelationships),
    };
  }

  const contentTypesPart = parts[OPC_CONTENT_TYPES_PATH];
  if (contentTypesPart) {
    parts[OPC_CONTENT_TYPES_PATH] = {
      ...contentTypesPart,
      data: serializeOpcContentTypes(contentTypes),
    };
  }

  return {
    ...document,
    sourcePackage: {
      ...sourcePackage,
      contentTypes,
      parts,
    },
  };
}

/**
 * Prepares collection-valued header/footer relationships before the general
 * source-package merge. Pairing uses section index and reference type, source
 * paths and r:ids are restored, unchanged parts are omitted so their original
 * bytes survive, and explicit removals are filtered from the source snapshot.
 */
export async function patchRebuiltDocxWithHeaderFooterSourcePaths(
  document: EditorDocument,
  rebuiltBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  const sourcePackage = document.sourcePackage;
  if (!sourcePackage) {
    return rebuiltBuffer;
  }

  const rebuilt = await JSZip.loadAsync(rebuiltBuffer);
  const plan = await buildPreservationPlan(sourcePackage, rebuilt);
  if (plan.matches.length > 0) {
    await prepareMainDocumentAndRelationships(rebuilt, sourcePackage, plan);
    await prepareHeaderFooterParts(rebuilt, sourcePackage, plan);
    await prepareContentTypes(rebuilt, plan);
  }

  const preparedBuffer =
    plan.matches.length > 0
      ? await rebuilt.generateAsync({ type: "arraybuffer" })
      : rebuiltBuffer;
  return patchRebuiltDocxWithSourcePackage(
    sourceDocumentWithoutDeletedHeaderFooterParts(
      document,
      plan.deletedSourcePartPaths,
    ),
    preparedBuffer,
  );
}
