import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorBlockNode } from "../../core/model.js";
import { WORD_NS } from "./xmlHelpers.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { type NumberingMaps } from "./numbering.js";
import { parseParagraphNodes } from "./paragraphs.js";
import { parseTableNode } from "./tables.js";

/**
 * Parse the block-level content of a `w:txbxContent` (text box body) into the
 * editor block model. Handles `w:p` (paragraphs) and `w:tbl` (tables), mirroring
 * the top-level body walker. Defined in its own module so `runs.ts` can request
 * nested-block parsing via a callback without creating an import cycle
 * (`runs.ts` -> `paragraphs.ts`/`tables.ts` -> `runs.ts`).
 */
export async function parseTxbxContentBlocks(
  container: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
): Promise<EditorBlockNode[]> {
  const blocks: EditorBlockNode[] = [];
  for (let index = 0; index < container.childNodes.length; index += 1) {
    const node = container.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    const element = node as XmlElement;
    if (element.namespaceURI !== WORD_NS) {
      continue;
    }
    if (element.localName === "p") {
      const parsed = await parseParagraphNodes(
        element,
        numberingMaps,
        zip,
        relsMap,
        assets,
        theme,
      );
      for (const paragraph of parsed.paragraphs) {
        blocks.push(paragraph);
      }
    } else if (element.localName === "tbl") {
      blocks.push(
        await parseTableNode(
          element,
          numberingMaps,
          zip,
          relsMap,
          assets,
          theme,
        ),
      );
    }
  }
  return blocks;
}
