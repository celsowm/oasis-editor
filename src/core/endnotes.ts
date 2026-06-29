/**
 * Endnote façade. The reading-order traversal and renumbering algorithm is
 * shared with footnotes in `./noteTraversal.js`; this file only adapts the
 * neutral API to the endnote-specific field names (`endnoteId`/`endnote`) and
 * owns the `document.endnotes` read/write.
 */
import type {
  EditorBlockNode,
  EditorDocument,
  EditorEndnote,
  EditorEndnotes,
  EditorParagraphNode,
  EditorTextRun,
} from "./model.js";
import { getBlockParagraphs, getRunEndnoteReference } from "./model.js";
import { getFootnoteDisplayMarker } from "./footnotes.js";
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

const endnoteTraversal: NoteTraversal = {
  runKind: "endnoteReference",
  getRef: (run): NoteRef | undefined => {
    const ref = getRunEndnoteReference(run);
    return ref ? { id: ref.endnoteId, customMark: ref.customMark } : undefined;
  },
  formatMarker: getFootnoteDisplayMarker,
};

export function iterateEndnoteReferenceRuns(
  document: EditorDocument,
): Generator<
  { paragraph: EditorParagraphNode; run: EditorTextRun },
  void,
  void
> {
  return iterateNoteReferenceRuns(document, "endnoteReference");
}

export function collectEndnoteReferences(
  document: EditorDocument,
): Array<{ paragraph: EditorParagraphNode; run: EditorTextRun }> {
  return collectNoteReferences(document, "endnoteReference");
}

export function getEndnotes(
  document: EditorDocument,
): EditorEndnotes | undefined {
  return document.endnotes;
}

export function getEndnoteBlocks(
  document: EditorDocument,
  endnoteId: string,
): EditorBlockNode[] {
  return document.endnotes?.items?.[endnoteId]?.blocks ?? [];
}

export function getEndnoteParagraphs(
  document: EditorDocument,
  endnoteId: string,
): EditorParagraphNode[] {
  return getEndnoteBlocks(document, endnoteId).flatMap(getBlockParagraphs);
}

export function findEndnoteByParagraphId(
  document: EditorDocument,
  paragraphId: string,
): { endnoteId: string; endnote: EditorEndnote } | null {
  const found = findNoteBodyByParagraphId(
    document.endnotes?.items,
    paragraphId,
  );
  return found ? { endnoteId: found.id, endnote: found.body } : null;
}

export function findEndnoteReference(
  document: EditorDocument,
  endnoteId: string,
): { paragraph: EditorParagraphNode; run: EditorTextRun } | null {
  return findNoteReference(document, endnoteTraversal, endnoteId);
}

export interface EndnoteReferenceInfo {
  endnoteId: string;
  customMark?: string;
  index: number;
}

export function listReferencedEndnotes(
  document: EditorDocument,
): EndnoteReferenceInfo[] {
  return listReferencedNotes(document, endnoteTraversal).map(
    (
      info,
    ): {
      endnoteId: string;
      customMark: string | undefined;
      index: number;
    } => ({
      endnoteId: info.id,
      customMark: info.customMark,
      index: info.index,
    }),
  );
}

/**
 * Rewrite the text of endnote reference runs based on document order. Also
 * removes endnote bodies that no longer have any reference in the document.
 *
 * Returns a new document only if anything actually changed.
 */
export function renumberEndnotes(document: EditorDocument): EditorDocument {
  const endnotes = document.endnotes;
  if (!endnotes || Object.keys(endnotes.items).length === 0) {
    return document;
  }
  const { sections, sectionsChanged, nextItems, itemsChanged } =
    computeNoteRenumber(document, endnotes, endnoteTraversal);

  if (!sectionsChanged && !itemsChanged) {
    return document;
  }

  return {
    ...document,
    sections: sectionsChanged ? sections : document.sections,
    endnotes: {
      ...endnotes,
      items: itemsChanged ? nextItems : endnotes.items,
    },
  };
}
