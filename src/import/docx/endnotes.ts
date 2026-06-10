import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorBlockNode,
  EditorEndnotes,
  EditorEndnote,
  EditorNamedStyle,
} from "../../core/model.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { type NumberingMaps } from "./numbering.js";
import { parseParagraphNode } from "./paragraphs.js";
import { parseTableNode } from "./tables.js";

export interface ParsedEndnotes {
  /** Map from DOCX `w:id` (string) to the parsed endnote. */
  byDocxId: Map<string, EditorEndnote>;
  /** Final shape ready to be assigned to `EditorDocument.endnotes`. */
  endnotes: EditorEndnotes;
  /** Imported "separator" part, if any. */
  separator?: EditorBlockNode[];
  /** Imported "continuationSeparator" part, if any. */
  continuationSeparator?: EditorBlockNode[];
}

const SPECIAL_TYPES = new Set([
  "separator",
  "continuationSeparator",
  "continuationNotice",
]);

export async function parseEndnotesXml(
  xmlContent: string | null,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  styles?: Record<string, EditorNamedStyle>,
): Promise<ParsedEndnotes> {
  const empty: ParsedEndnotes = {
    byDocxId: new Map(),
    endnotes: { items: {} },
  };
  if (!xmlContent) {
    return empty;
  }

  const doc = new DOMParser().parseFromString(xmlContent, "application/xml");
  const root = doc.documentElement;
  if (!root) {
    return empty;
  }

  const items: Record<string, EditorEndnote> = {};
  const byDocxId = new Map<string, EditorEndnote>();
  let separator: EditorBlockNode[] | undefined;
  let continuationSeparator: EditorBlockNode[] | undefined;

  const endnoteElements = getChildrenByTagNameNS(root, WORD_NS, "endnote");
  let counter = 0;

  for (const endnoteEl of endnoteElements) {
    const idAttr = getAttributeValue(endnoteEl, "id") ?? "";
    const type = getAttributeValue(endnoteEl, "type") ?? "";

    const blocks: EditorBlockNode[] = [];
    for (let i = 0; i < endnoteEl.childNodes.length; i += 1) {
      const node = endnoteEl.childNodes[i];
      if (node?.nodeType !== node.ELEMENT_NODE) continue;
      const element = node as XmlElement;
      if (element.namespaceURI !== WORD_NS) continue;
      if (element.localName === "p") {
        blocks.push(
          await parseParagraphNode(
            element,
            numberingMaps,
            zip,
            relsMap,
            assets,
            theme,
          ),
        );
      } else if (element.localName === "tbl") {
        blocks.push(
          await parseTableNode(
            element,
            numberingMaps,
            zip,
            relsMap,
            assets,
            theme,
            styles,
          ),
        );
      }
    }

    if (SPECIAL_TYPES.has(type)) {
      if (type === "separator") separator = blocks;
      else if (type === "continuationSeparator") continuationSeparator = blocks;
      // continuationNotice: discarded for MVP.
      continue;
    }

    // Skip the conventional special markers when there are no body blocks.
    if ((idAttr === "-1" || idAttr === "0") && blocks.length === 0) {
      continue;
    }

    counter += 1;
    const localId = `endnote:imported:${counter}`;
    const numericId = Number.parseInt(idAttr, 10);
    const endnote: EditorEndnote = {
      id: localId,
      blocks: blocks.length > 0 ? blocks : [],
      docxId: Number.isFinite(numericId) ? numericId : undefined,
    };
    items[localId] = endnote;
    if (idAttr) {
      byDocxId.set(idAttr, endnote);
    }
  }

  return {
    byDocxId,
    endnotes: {
      items,
      separator,
      continuationSeparator,
    },
    separator,
    continuationSeparator,
  };
}
