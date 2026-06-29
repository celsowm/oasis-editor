import JSZip from "jszip";
import { type Element as XmlElement, XMLSerializer } from "@xmldom/xmldom";
import type { EditorBlockNode, EditorSdtBlockWrapper } from "@/core/model.js";
import { createEditorNodeId } from "@/core/editorState.js";
import { WORD_NS, getFirstChildByTagNameNS } from "./xmlHelpers.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { type NumberingMaps } from "./numbering.js";
import { parseParagraphNodes } from "./paragraphs.js";
import { parseTableNode } from "./tables.js";
import type { ParseNestedBlocks } from "./runs/types.js";

/**
 * Parse a single block-level child element (`w:p`, `w:tbl`, or a `w:sdt` content
 * control) into editor blocks. Unknown elements yield no blocks. Shared by the
 * text-box body walker, the document-body walker, and nested `w:sdtContent`.
 */
export async function parseBlockLevelChild(
  element: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  parseNestedBlocks: ParseNestedBlocks,
): Promise<EditorBlockNode[]> {
  if (element.namespaceURI !== WORD_NS) {
    return [];
  }
  if (element.localName === "p") {
    const parsed = await parseParagraphNodes(
      element,
      numberingMaps,
      zip,
      relsMap,
      assets,
      theme,
      parseNestedBlocks,
    );
    return parsed.paragraphs;
  }
  if (element.localName === "tbl") {
    return [
      await parseTableNode(
        element,
        numberingMaps,
        zip,
        relsMap,
        assets,
        theme,
        parseNestedBlocks,
      ),
    ];
  }
  if (element.localName === "sdt") {
    return parseSdtBlockNode(
      element,
      numberingMaps,
      zip,
      relsMap,
      assets,
      theme,
      parseNestedBlocks,
    );
  }
  return [];
}

/**
 * Parse a block-level structured document tag (`w:sdt`) into its content blocks,
 * preserving the `w:sdtPr`/`w:sdtEndPr` wrapper on each produced block so export
 * can re-wrap it (see {@link EditorSdtBlockWrapper}). The content is unwrapped so
 * it renders and edits like any other block; nested `w:sdt` recurses, prepending
 * outer wrappers ahead of inner ones.
 */
export async function parseSdtBlockNode(
  sdtElement: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  parseNestedBlocks: ParseNestedBlocks,
): Promise<EditorBlockNode[]> {
  const sdtPr = getFirstChildByTagNameNS(sdtElement, WORD_NS, "sdtPr");
  const sdtEndPr = getFirstChildByTagNameNS(sdtElement, WORD_NS, "sdtEndPr");
  const wrapper: EditorSdtBlockWrapper = {
    groupId: createEditorNodeId("sdt"),
    sdtPrXml: sdtPr ? new XMLSerializer().serializeToString(sdtPr) : "",
    ...(sdtEndPr
      ? { sdtEndPrXml: new XMLSerializer().serializeToString(sdtEndPr) }
      : {}),
  };

  const sdtContent = getFirstChildByTagNameNS(
    sdtElement,
    WORD_NS,
    "sdtContent",
  );
  const blocks: EditorBlockNode[] = [];
  if (sdtContent) {
    for (let index = 0; index < sdtContent.childNodes.length; index += 1) {
      const node = sdtContent.childNodes[index];
      if (node?.nodeType !== node.ELEMENT_NODE) {
        continue;
      }
      blocks.push(
        ...(await parseBlockLevelChild(
          node as XmlElement,
          numberingMaps,
          zip,
          relsMap,
          assets,
          theme,
          parseNestedBlocks,
        )),
      );
    }
  }

  for (const block of blocks) {
    block.sdtWrappers = [wrapper, ...(block.sdtWrappers ?? [])];
  }
  return blocks;
}

/**
 * Build a `ParseNestedBlocks` callback bound to an import context. The paragraph
 * and table parsers receive this so a text-box run can recurse into block-level
 * content without importing this module (which imports them) — keeping the
 * recursion acyclic with `nestedBlocks` as the orchestrator.
 */
export function createNestedBlockParser(
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
): ParseNestedBlocks {
  return (container): Promise<EditorBlockNode[]> =>
    parseTxbxContentBlocks(
      container,
      numberingMaps,
      zip,
      relsMap,
      assets,
      theme,
    );
}

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
  const parseNestedBlocks = createNestedBlockParser(
    numberingMaps,
    zip,
    relsMap,
    assets,
    theme,
  );
  const blocks: EditorBlockNode[] = [];
  for (let index = 0; index < container.childNodes.length; index += 1) {
    const node = container.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    blocks.push(
      ...(await parseBlockLevelChild(
        node as XmlElement,
        numberingMaps,
        zip,
        relsMap,
        assets,
        theme,
        parseNestedBlocks,
      )),
    );
  }
  return blocks;
}
