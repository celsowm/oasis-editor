import type {
  EditorBlockNode,
  EditorDocument,
  EditorFootnote,
  EditorNamedStyle,
  EditorParagraphNode,
} from "@/core/model.js";
import { getRunFootnoteReference } from "@/core/model.js";
import { iterateFootnoteReferenceRuns } from "@/core/footnotes.js";
import type {
  DocContext,
  ExportBuildState,
  NumberingContext,
} from "./docxTypes.js";
import { createSourceAwareNoteDocxIdAllocator } from "./noteDocxIds.js";
import { serializeBlocksXml } from "./textXml.js";
import { OFFICE_REL_NS, WORD14_NS, WORD_NS } from "./xmlUtils.js";

export interface ReferencedFootnote {
  footnoteId: string;
  docxId: number;
  footnote: EditorFootnote;
}

/**
 * Walks the document in reading order and returns one entry per distinct
 * referenced footnote. Imported positive `w:id` values are retained when
 * unique; new/conflicting notes are allocated above every imported id.
 */
export function collectReferencedFootnotesForExport(
  document: EditorDocument,
): ReferencedFootnote[] {
  const items = document.footnotes?.items;
  if (!items) return [];

  const seen = new Map<string, ReferencedFootnote>();
  const allocateDocxId = createSourceAwareNoteDocxIdAllocator(items);
  for (const { run } of iterateFootnoteReferenceRuns(document)) {
    const ref = getRunFootnoteReference(run);
    if (!ref || seen.has(ref.footnoteId)) continue;
    const footnote = items[ref.footnoteId];
    if (!footnote) continue;
    seen.set(ref.footnoteId, {
      footnoteId: ref.footnoteId,
      docxId: allocateDocxId(footnote),
      footnote,
    });
  }
  return Array.from(seen.values());
}

export function buildFootnoteIdMap(
  referenced: ReferencedFootnote[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of referenced) map.set(entry.footnoteId, entry.docxId);
  return map;
}

function withInjectedFootnoteRef(blocks: EditorBlockNode[]): EditorBlockNode[] {
  if (blocks.length === 0) return [createEmptyFootnoteBodyParagraph()];
  const [first, ...rest] = blocks;
  if (first.type !== "paragraph") {
    return [createEmptyFootnoteBodyParagraph(true), first, ...rest];
  }
  return [prependFootnoteRefMarker(first), ...rest];
}

function createEmptyFootnoteBodyParagraph(
  withMarker = true,
): EditorParagraphNode {
  return {
    id: "synthetic:footnote-body-empty",
    type: "paragraph",
    runs: [
      ...(withMarker ? [makeFootnoteRefMarkerRun()] : []),
      { id: "synthetic:footnote-body-empty-text", text: "", kind: "text" },
    ],
    style: { styleId: "FootnoteText" },
  };
}

function prependFootnoteRefMarker(
  paragraph: EditorParagraphNode,
): EditorParagraphNode {
  return {
    ...paragraph,
    runs: [makeFootnoteRefMarkerRun(), ...paragraph.runs],
    style: paragraph.style?.styleId
      ? paragraph.style
      : { ...(paragraph.style ?? {}), styleId: "FootnoteText" },
  };
}

function makeFootnoteRefMarkerRun(): EditorParagraphNode["runs"][number] {
  return {
    id: "synthetic:footnoteRef",
    text: "",
    kind: "text",
    styles: { styleId: "FootnoteReference", superscript: true },
    __isFootnoteRefMarker: true,
  } as EditorParagraphNode["runs"][number] & { __isFootnoteRefMarker: true };
}

export interface FootnotesPartResult {
  xml: string;
  partContext: DocContext;
}

export function buildFootnotesXml(
  _document: EditorDocument,
  referenced: ReferencedFootnote[],
  _numberingContext: NumberingContext,
  _state: ExportBuildState,
  buildContext: (blocks: EditorBlockNode[]) => DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
  footnoteIdMap: Map<string, number>,
): FootnotesPartResult {
  const allBlocks = referenced.flatMap((entry): EditorBlockNode[] =>
    withInjectedFootnoteRef(entry.footnote.blocks),
  );
  const partContext = buildContext(allBlocks);
  partContext.footnoteIdMap = footnoteIdMap;

  const specials =
    `<w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>` +
    `<w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>`;

  const footnoteEntries = referenced
    .map((entry): string => {
      const innerXml = serializeBlocksXml(
        withInjectedFootnoteRef(entry.footnote.blocks),
        partContext,
        styles,
      );
      return `<w:footnote w:id="${entry.docxId}">${innerXml}</w:footnote>`;
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:footnotes xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="${OFFICE_REL_NS}">` +
    `${specials}${footnoteEntries}</w:footnotes>`;

  return { xml, partContext };
}

export function hasReferencedFootnotes(document: EditorDocument): boolean {
  if (!document.footnotes?.items) return false;
  for (const { run } of iterateFootnoteReferenceRuns(document)) {
    const ref = getRunFootnoteReference(run);
    if (ref && document.footnotes.items[ref.footnoteId]) return true;
  }
  return false;
}

export type { DocContext, NumberingContext, ExportBuildState };
