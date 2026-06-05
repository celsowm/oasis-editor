import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorBlockNode, EditorNamedStyle } from "../../core/model.js";
import { WORD_NS } from "./xmlHelpers.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type ThemeFontMap } from "./themeFonts.js";
import { type NumberingMaps } from "./numbering.js";
import { parseParagraphNode } from "./paragraphs.js";
import { parseTableNode } from "./tables.js";

export async function parseHeaderFooterXml(
  xmlContent: string | null,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  themeFonts: ThemeFontMap,
  styles?: Record<string, EditorNamedStyle>,
): Promise<EditorBlockNode[]> {
  if (!xmlContent) {
    return [];
  }

  const doc = new DOMParser().parseFromString(xmlContent, "application/xml");
  const root = doc.documentElement;
  if (!root) {
    return [];
  }

  const blocks: EditorBlockNode[] = [];
  for (let index = 0; index < root.childNodes.length; index += 1) {
    const node = root.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    const element = node as XmlElement;
    if (element.localName === "p" && element.namespaceURI === WORD_NS) {
      blocks.push(
        await parseParagraphNode(
          element,
          numberingMaps,
          zip,
          relsMap,
          assets,
          themeFonts,
        ),
      );
    } else if (
      element.localName === "tbl" &&
      element.namespaceURI === WORD_NS
    ) {
      blocks.push(
        await parseTableNode(
          element,
          numberingMaps,
          zip,
          relsMap,
          assets,
          themeFonts,
          styles,
        ),
      );
    }
  }
  return blocks;
}
