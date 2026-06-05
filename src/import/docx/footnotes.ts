import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorBlockNode,
  EditorFootnotes,
  EditorFootnote,
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

export interface ParsedFootnotes {
  /** Map from DOCX `w:id` (string) to the parsed footnote. */
  byDocxId: Map<string, EditorFootnote>;
  /** Final shape ready to be assigned to `EditorDocument.footnotes`. */
  footnotes: EditorFootnotes;
  /** Imported "separator" part, if any (rarely useful for MVP rendering). */
  separator?: EditorBlockNode[];
  /** Imported "continuationSeparator" part, if any. */
  continuationSeparator?: EditorBlockNode[];
}

const SPECIAL_TYPES = new Set([
  "separator",
  "continuationSeparator",
  "continuationNotice",
]);

export async function parseFootnotesXml(
  xmlContent: string | null,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  styles?: Record<string, EditorNamedStyle>,
): Promise<ParsedFootnotes> {
  const empty: ParsedFootnotes = {
    byDocxId: new Map(),
    footnotes: { items: {} },
  };
  if (!xmlContent) {
    return empty;
  }

  const doc = new DOMParser().parseFromString(xmlContent, "application/xml");
  const root = doc.documentElement;
  if (!root) {
    return empty;
  }

  const items: Record<string, EditorFootnote> = {};
  const byDocxId = new Map<string, EditorFootnote>();
  let separator: EditorBlockNode[] | undefined;
  let continuationSeparator: EditorBlockNode[] | undefined;

  const footnoteElements = getChildrenByTagNameNS(root, WORD_NS, "footnote");
  let counter = 0;

  for (const footnoteEl of footnoteElements) {
    const idAttr = getAttributeValue(footnoteEl, "id") ?? "";
    const type = getAttributeValue(footnoteEl, "type") ?? "";

    const blocks: EditorBlockNode[] = [];
    for (let i = 0; i < footnoteEl.childNodes.length; i += 1) {
      const node = footnoteEl.childNodes[i];
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

    // Some authors emit notes with no `w:id` or with ids like "-1"/"0" but
    // without a `w:type`. Skip ids that look like the conventional special
    // markers when there are no body blocks.
    if ((idAttr === "-1" || idAttr === "0") && blocks.length === 0) {
      continue;
    }

    counter += 1;
    const localId = `footnote:imported:${counter}`;
    const numericId = Number.parseInt(idAttr, 10);
    const footnote: EditorFootnote = {
      id: localId,
      blocks: blocks.length > 0 ? blocks : [],
      docxId: Number.isFinite(numericId) ? numericId : undefined,
    };
    items[localId] = footnote;
    if (idAttr) {
      byDocxId.set(idAttr, footnote);
    }
  }

  return {
    byDocxId,
    footnotes: {
      items,
      separator,
      continuationSeparator,
    },
    separator,
    continuationSeparator,
  };
}
