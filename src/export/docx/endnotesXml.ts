import type {
  EditorBlockNode,
  EditorDocument,
  EditorEndnote,
  EditorNamedStyle,
  EditorParagraphNode,
} from "@/core/model.js";
import { getRunEndnoteReference } from "@/core/model.js";
import { iterateEndnoteReferenceRuns } from "@/core/endnotes.js";
import type {
  DocContext,
  ExportBuildState,
  NumberingContext,
} from "./docxTypes.js";
import { createSourceAwareNoteDocxIdAllocator } from "./noteDocxIds.js";
import { serializeBlocksXml } from "./textXml.js";
import { OFFICE_REL_NS, WORD14_NS, WORD_NS } from "./xmlUtils.js";

export interface ReferencedEndnote {
  endnoteId: string;
  docxId: number;
  endnote: EditorEndnote;
}

/**
 * Walks the document in reading order and returns one entry per distinct
 * referenced endnote. Imported positive `w:id` values are retained when
 * unique; new/conflicting notes are allocated above every imported id.
 */
export function collectReferencedEndnotesForExport(
  document: EditorDocument,
): ReferencedEndnote[] {
  const items = document.endnotes?.items;
  if (!items) return [];

  const seen = new Map<string, ReferencedEndnote>();
  const allocateDocxId = createSourceAwareNoteDocxIdAllocator(items);
  for (const { run } of iterateEndnoteReferenceRuns(document)) {
    const ref = getRunEndnoteReference(run);
    if (!ref || seen.has(ref.endnoteId)) continue;
    const endnote = items[ref.endnoteId];
    if (!endnote) continue;
    seen.set(ref.endnoteId, {
      endnoteId: ref.endnoteId,
      docxId: allocateDocxId(endnote),
      endnote,
    });
  }
  return Array.from(seen.values());
}

export function buildEndnoteIdMap(
  referenced: ReferencedEndnote[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of referenced) map.set(entry.endnoteId, entry.docxId);
  return map;
}

function withInjectedEndnoteRef(blocks: EditorBlockNode[]): EditorBlockNode[] {
  if (blocks.length === 0) return [createEmptyEndnoteBodyParagraph()];
  const [first, ...rest] = blocks;
  if (first.type !== "paragraph") {
    return [createEmptyEndnoteBodyParagraph(true), first, ...rest];
  }
  return [prependEndnoteRefMarker(first), ...rest];
}

function createEmptyEndnoteBodyParagraph(
  withMarker = true,
): EditorParagraphNode {
  return {
    id: "synthetic:endnote-body-empty",
    type: "paragraph",
    runs: [
      ...(withMarker ? [makeEndnoteRefMarkerRun()] : []),
      { id: "synthetic:endnote-body-empty-text", text: "", kind: "text" },
    ],
    style: { styleId: "EndnoteText" },
  };
}

function prependEndnoteRefMarker(
  paragraph: EditorParagraphNode,
): EditorParagraphNode {
  return {
    ...paragraph,
    runs: [makeEndnoteRefMarkerRun(), ...paragraph.runs],
    style: paragraph.style?.styleId
      ? paragraph.style
      : { ...(paragraph.style ?? {}), styleId: "EndnoteText" },
  };
}

function makeEndnoteRefMarkerRun(): EditorParagraphNode["runs"][number] {
  return {
    id: "synthetic:endnoteRef",
    text: "",
    kind: "text",
    styles: { styleId: "EndnoteReference", superscript: true },
    __isEndnoteRefMarker: true,
  } as EditorParagraphNode["runs"][number] & { __isEndnoteRefMarker: true };
}

export interface EndnotesPartResult {
  xml: string;
  partContext: DocContext;
}

export function buildEndnotesXml(
  _document: EditorDocument,
  referenced: ReferencedEndnote[],
  _numberingContext: NumberingContext,
  _state: ExportBuildState,
  buildContext: (blocks: EditorBlockNode[]) => DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
  endnoteIdMap: Map<string, number>,
): EndnotesPartResult {
  const allBlocks = referenced.flatMap((entry): EditorBlockNode[] =>
    withInjectedEndnoteRef(entry.endnote.blocks),
  );
  const partContext = buildContext(allBlocks);
  partContext.endnoteIdMap = endnoteIdMap;

  const specials =
    `<w:endnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:endnote>` +
    `<w:endnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:endnote>`;

  const endnoteEntries = referenced
    .map((entry): string => {
      const innerXml = serializeBlocksXml(
        withInjectedEndnoteRef(entry.endnote.blocks),
        partContext,
        styles,
      );
      return `<w:endnote w:id="${entry.docxId}">${innerXml}</w:endnote>`;
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:endnotes xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="${OFFICE_REL_NS}">` +
    `${specials}${endnoteEntries}</w:endnotes>`;

  return { xml, partContext };
}

export function hasReferencedEndnotes(document: EditorDocument): boolean {
  if (!document.endnotes?.items) return false;
  for (const { run } of iterateEndnoteReferenceRuns(document)) {
    const ref = getRunEndnoteReference(run);
    if (ref && document.endnotes.items[ref.endnoteId]) return true;
  }
  return false;
}
