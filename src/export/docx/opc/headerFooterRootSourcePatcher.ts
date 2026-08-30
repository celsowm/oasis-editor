import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorDocxSourcePackage,
  EditorOpcRelationship,
} from "@/core/model.js";
import {
  parseOpcRelationships,
  resolveOpcRelationships,
} from "@/ooxml/opc/packageXml.js";
import { mergeWordStoryRootAndFlowFromSource } from "./wordPartRootSourcePatcher.js";

const CONVENTIONAL_MAIN_DOCUMENT_PATH = "word/document.xml";
const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

type HeaderFooterKind = "header" | "footer";

interface StoryReference {
  key: string;
  kind: HeaderFooterKind;
  relationshipId: string;
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

function elementChildren(element: XmlElement): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE) {
      result.push(child as XmlElement);
    }
  }
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

function activeSectionProperties(xml: string): XmlElement[] {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(document.getElementsByTagNameNS(WORD_NS, "sectPr")).filter(
    (element): element is XmlElement =>
      Boolean(element) &&
      (element.parentNode as XmlElement | null)?.localName !== "sectPrChange",
  );
}

function collectReferences(xml: string): StoryReference[] {
  const references: StoryReference[] = [];
  activeSectionProperties(xml).forEach((section, sectionIndex): void => {
    const occurrences = new Map<string, number>();
    for (const child of elementChildren(section)) {
      const kind: HeaderFooterKind | undefined =
        child.namespaceURI === WORD_NS && child.localName === "headerReference"
          ? "header"
          : child.namespaceURI === WORD_NS && child.localName === "footerReference"
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
      const occurrence = occurrences.get(occurrenceKey) ?? 0;
      occurrences.set(occurrenceKey, occurrence + 1);
      references.push({
        key: `${sectionIndex}:${kind}:${type}:${occurrence}`,
        kind,
        relationshipId,
      });
    }
  });
  return references;
}

function relationshipById(
  relationships: EditorOpcRelationship[],
): Map<string, EditorOpcRelationship> {
  return new Map(
    relationships.map(
      (relationship): readonly [string, EditorOpcRelationship] => [
        relationship.id,
        relationship,
      ],
    ),
  );
}

async function rebuiltMainRelationships(
  rebuilt: JSZip,
): Promise<EditorOpcRelationship[]> {
  const xml = await rebuilt
    .file(relationshipPartPath(CONVENTIONAL_MAIN_DOCUMENT_PATH))
    ?.async("string");
  return resolveOpcRelationships(
    CONVENTIONAL_MAIN_DOCUMENT_PATH,
    parseOpcRelationships(xml),
  );
}

/**
 * Preserves root namespace/compatibility attributes and opaque extension
 * children in changed header/footer parts before the existing source-path
 * patcher relocates those parts back to their original relationship targets.
 * Pairing uses the same stable section/kind/type/occurrence identity as the
 * path-preservation layer and is disabled when section topology diverges.
 */
export async function patchRebuiltHeaderFooterRootsFromSource(
  sourcePackage: EditorDocxSourcePackage,
  rebuilt: JSZip,
): Promise<boolean> {
  const sourceMainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  const rebuiltMainXml = await rebuilt
    .file(CONVENTIONAL_MAIN_DOCUMENT_PATH)
    ?.async("string");
  if (sourceMainPart?.kind !== "xml" || !rebuiltMainXml) {
    return false;
  }

  const sourceSections = activeSectionProperties(sourceMainPart.data);
  const rebuiltSections = activeSectionProperties(rebuiltMainXml);
  if (sourceSections.length !== rebuiltSections.length) {
    return false;
  }

  const sourceReferences = collectReferences(sourceMainPart.data);
  const rebuiltReferences = collectReferences(rebuiltMainXml);
  const sourceReferenceByKey = new Map(
    sourceReferences.map(
      (reference): readonly [string, StoryReference] => [reference.key, reference],
    ),
  );
  const sourceRelationships = relationshipById(
    sourceMainPart.relationships ?? [],
  );
  const currentRelationships = relationshipById(
    await rebuiltMainRelationships(rebuilt),
  );

  let changed = false;
  for (const currentReference of rebuiltReferences) {
    const sourceReference = sourceReferenceByKey.get(currentReference.key);
    if (!sourceReference || sourceReference.kind !== currentReference.kind) {
      continue;
    }
    const sourceRelationship = sourceRelationships.get(
      sourceReference.relationshipId,
    );
    const currentRelationship = currentRelationships.get(
      currentReference.relationshipId,
    );
    if (
      sourceRelationship?.targetMode === "External" ||
      currentRelationship?.targetMode === "External" ||
      !sourceRelationship?.resolvedTarget ||
      !currentRelationship?.resolvedTarget
    ) {
      continue;
    }
    const sourcePart = sourcePackage.parts[sourceRelationship.resolvedTarget];
    if (sourcePart?.kind !== "xml") {
      continue;
    }
    const currentPath = currentRelationship.resolvedTarget;
    const rebuiltPartXml = await rebuilt.file(currentPath)?.async("string");
    if (!rebuiltPartXml) {
      continue;
    }
    const expectedRootLocalName =
      currentReference.kind === "header" ? "hdr" : "ftr";
    const mergedXml = mergeWordStoryRootAndFlowFromSource(
      sourcePart.data,
      rebuiltPartXml,
      expectedRootLocalName,
    );
    if (mergedXml !== rebuiltPartXml) {
      rebuilt.file(currentPath, mergedXml);
      changed = true;
    }
  }

  return changed;
}
