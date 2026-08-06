import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorDocument } from "@/core/model.js";
import { patchRebuiltDocxWithHeaderFooterSourcePaths } from "./headerFooterSourcePatcher.js";
import { patchRebuiltDocxWithSourcePackage } from "./sourcePackagePatcher.js";

const CONVENTIONAL_MAIN_DOCUMENT_PATH = "word/document.xml";

function countActiveSectionProperties(xml: string): number {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const elements = document.getElementsByTagNameNS("*", "sectPr");
  let count = 0;
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements.item(index) as XmlElement | null;
    const parent = element?.parentNode as XmlElement | null;
    if (element && parent?.localName !== "sectPrChange") {
      count += 1;
    }
  }
  return count;
}

/**
 * Applies source-backed package preservation. Header/footer source-path pairing
 * is enabled only while the section topology remains stable. Inserting or
 * removing sections shifts positional identities, so that case falls back to
 * the generic OPC merge instead of risking a header from the wrong section.
 */
export async function patchRebuiltDocxPreservingSource(
  document: EditorDocument,
  rebuiltBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  const sourcePackage = document.sourcePackage;
  if (!sourcePackage) {
    return rebuiltBuffer;
  }

  const sourceMainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  if (sourceMainPart?.kind !== "xml") {
    return patchRebuiltDocxWithSourcePackage(document, rebuiltBuffer);
  }

  const rebuilt = await JSZip.loadAsync(rebuiltBuffer);
  const rebuiltMainXml = await rebuilt
    .file(CONVENTIONAL_MAIN_DOCUMENT_PATH)
    ?.async("string");
  if (
    !rebuiltMainXml ||
    countActiveSectionProperties(sourceMainPart.data) !==
      countActiveSectionProperties(rebuiltMainXml)
  ) {
    return patchRebuiltDocxWithSourcePackage(document, rebuiltBuffer);
  }

  return patchRebuiltDocxWithHeaderFooterSourcePaths(
    document,
    rebuiltBuffer,
  );
}
