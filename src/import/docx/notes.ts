import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorBlockNode, EditorNamedStyle } from "@/core/model.js";
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
import { createNestedBlockParser } from "./nestedBlocks.js";

/** Common body shape of a footnote/endnote (structurally identical). */
export interface DocxNoteBody {
  id: string;
  blocks: EditorBlockNode[];
  docxId?: number;
}

export interface ParsedDocxNotes<TNote extends DocxNoteBody> {
  /** Map from DOCX `w:id` (string) to the parsed note. */
  byDocxId: Map<string, TNote>;
  /** Final shape ready to be assigned to the document's notes slot. */
  notes: {
    items: Record<string, TNote>;
    separator?: EditorBlockNode[];
    continuationSeparator?: EditorBlockNode[];
  };
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

/**
 * Parses a DOCX `footnotes.xml` / `endnotes.xml` part into the editor note
 * model. Footnotes and endnotes have byte-identical structure in OOXML, so a
 * single parameterized parser handles both — `kind` selects the `w:footnote` /
 * `w:endnote` element name and the imported-id prefix (N1 dedup).
 */
export async function parseDocxNotesXml<TNote extends DocxNoteBody>(
  kind: "footnote" | "endnote",
  xmlContent: string | null,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  styles?: Record<string, EditorNamedStyle>,
): Promise<ParsedDocxNotes<TNote>> {
  const empty: ParsedDocxNotes<TNote> = {
    byDocxId: new Map(),
    notes: { items: {} },
  };
  if (!xmlContent) {
    return empty;
  }

  const doc = new DOMParser().parseFromString(xmlContent, "application/xml");
  const root = doc.documentElement;
  if (!root) {
    return empty;
  }

  const items: Record<string, TNote> = {};
  const byDocxId = new Map<string, TNote>();
  let separator: EditorBlockNode[] | undefined;
  let continuationSeparator: EditorBlockNode[] | undefined;

  const noteElements = getChildrenByTagNameNS(root, WORD_NS, kind);
  let counter = 0;

  const parseNestedBlocks = createNestedBlockParser(
    numberingMaps,
    zip,
    relsMap,
    assets,
    theme,
  );

  for (const noteEl of noteElements) {
    const idAttr = getAttributeValue(noteEl, "id") ?? "";
    const type = getAttributeValue(noteEl, "type") ?? "";

    const blocks: EditorBlockNode[] = [];
    for (let i = 0; i < noteEl.childNodes.length; i += 1) {
      const node = noteEl.childNodes[i];
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
            parseNestedBlocks,
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
            parseNestedBlocks,
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
    // without a `w:type`. Skip the conventional special markers when there are
    // no body blocks.
    if ((idAttr === "-1" || idAttr === "0") && blocks.length === 0) {
      continue;
    }

    counter += 1;
    const localId = `${kind}:imported:${counter}`;
    const numericId = Number.parseInt(idAttr, 10);
    const note = {
      id: localId,
      blocks: blocks.length > 0 ? blocks : [],
      docxId: Number.isFinite(numericId) ? numericId : undefined,
    } as TNote;
    items[localId] = note;
    if (idAttr) {
      byDocxId.set(idAttr, note);
    }
  }

  return {
    byDocxId,
    notes: { items, separator, continuationSeparator },
    separator,
    continuationSeparator,
  };
}
