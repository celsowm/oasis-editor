/**
 * Footnote façade. The reading-order traversal and renumbering algorithm is
 * shared with endnotes in `./noteTraversal.js`; this file adapts the neutral
 * API to the footnote-specific field names (`footnoteId`/`footnote`), owns the
 * `document.footnotes` read/write, and is the home of the marker-format helpers
 * (`getFootnoteDisplayMarker`) shared by both note families.
 */
import type {
  EditorBlockNode,
  EditorDocument,
  EditorFootnote,
  EditorFootnoteNumberFormat,
  EditorFootnotes,
  EditorParagraphNode,
  EditorTextRun,
} from "./model.js";
import { getBlockParagraphs, getRunFootnoteReference } from "./model.js";
import { formatNumberValue } from "./format/numberFormat.js";
import {
  collectNoteReferences,
  computeNoteRenumber,
  findNoteBodyByParagraphId,
  findNoteReference,
  iterateNoteReferenceRuns,
  listReferencedNotes,
  type NoteRef,
  type NoteTraversal,
} from "./noteTraversal.js";

export function iterateFootnoteReferenceRuns(
  document: EditorDocument,
): Generator<
  { paragraph: EditorParagraphNode; run: EditorTextRun },
  void,
  void
> {
  return iterateNoteReferenceRuns(document, "footnoteReference");
}

export function collectFootnoteReferences(
  document: EditorDocument,
): Array<{ paragraph: EditorParagraphNode; run: EditorTextRun }> {
  return collectNoteReferences(document, "footnoteReference");
}

const SYMBOL_MARKS = ["*", "†", "‡", "§", "¶", "#"];

export function getFootnoteDisplayMarker(
  oneBasedIndex: number,
  format: EditorFootnoteNumberFormat | undefined = "decimal",
): string {
  switch (format) {
    case "lowerRoman":
    case "upperRoman":
    case "lowerLetter":
    case "upperLetter":
      return formatNumberValue(oneBasedIndex, format, "en-US");
    case "symbol": {
      const slot = (oneBasedIndex - 1) % SYMBOL_MARKS.length;
      const cycles = Math.floor((oneBasedIndex - 1) / SYMBOL_MARKS.length) + 1;
      return SYMBOL_MARKS[slot].repeat(cycles);
    }
    case "decimal":
    default:
      return String(oneBasedIndex);
  }
}

const footnoteTraversal: NoteTraversal = {
  runKind: "footnoteReference",
  getRef: (run): NoteRef | undefined => {
    const ref = getRunFootnoteReference(run);
    return ref ? { id: ref.footnoteId, customMark: ref.customMark } : undefined;
  },
  formatMarker: getFootnoteDisplayMarker,
};

export function getFootnotes(
  document: EditorDocument,
): EditorFootnotes | undefined {
  return document.footnotes;
}

export function getFootnoteBlocks(
  document: EditorDocument,
  footnoteId: string,
): EditorBlockNode[] {
  return document.footnotes?.items?.[footnoteId]?.blocks ?? [];
}

export function getFootnoteParagraphs(
  document: EditorDocument,
  footnoteId: string,
): EditorParagraphNode[] {
  return getFootnoteBlocks(document, footnoteId).flatMap(getBlockParagraphs);
}

export function findFootnoteByParagraphId(
  document: EditorDocument,
  paragraphId: string,
): { footnoteId: string; footnote: EditorFootnote } | null {
  const found = findNoteBodyByParagraphId(
    document.footnotes?.items,
    paragraphId,
  );
  return found ? { footnoteId: found.id, footnote: found.body } : null;
}

export function findFootnoteReference(
  document: EditorDocument,
  footnoteId: string,
): { paragraph: EditorParagraphNode; run: EditorTextRun } | null {
  return findNoteReference(document, footnoteTraversal, footnoteId);
}

export interface FootnoteReferenceInfo {
  footnoteId: string;
  customMark?: string;
  index: number;
}

export function listReferencedFootnotes(
  document: EditorDocument,
): FootnoteReferenceInfo[] {
  return listReferencedNotes(document, footnoteTraversal).map(
    (
      info,
    ): {
      footnoteId: string;
      customMark: string | undefined;
      index: number;
    } => ({
      footnoteId: info.id,
      customMark: info.customMark,
      index: info.index,
    }),
  );
}

/**
 * Rewrite the text of footnote reference runs based on document order. Also
 * removes footnote bodies that no longer have any reference in the document.
 *
 * Returns a new document only if anything actually changed.
 */
export function renumberFootnotes(document: EditorDocument): EditorDocument {
  const footnotes = document.footnotes;
  if (!footnotes || Object.keys(footnotes.items).length === 0) {
    return document;
  }
  const { sections, sectionsChanged, nextItems, itemsChanged } =
    computeNoteRenumber(document, footnotes, footnoteTraversal);

  if (!sectionsChanged && !itemsChanged) {
    return document;
  }

  return {
    ...document,
    sections: sectionsChanged ? sections : document.sections,
    footnotes: {
      ...footnotes,
      items: itemsChanged ? nextItems : footnotes.items,
    },
  };
}
