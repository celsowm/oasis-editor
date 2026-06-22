/**
 * Generic note traversal / renumbering (N1).
 *
 * Footnotes and endnotes share the exact same reading-order traversal and
 * marker-renumbering algorithm; only the run discriminant (`footnoteReference`
 * vs `endnoteReference`), the reference id field (`footnoteId`/`endnoteId`) and
 * the document collection (`document.footnotes`/`document.endnotes`) differ.
 *
 * This module owns the shared algorithm parameterized by a {@link NoteTraversal}
 * descriptor. The `footnotes.ts` / `endnotes.ts` façades keep their exact public
 * signatures and delegate here; the only per-family code that remains in each
 * façade is the field-specific document read/write (which cannot be deduplicated
 * without discriminating-field gymnastics that would hurt readability).
 *
 * Leaf-ish module: depends only on the model and `assertNever`. The marker
 * formatter is injected (see `formatMarker`) so this module never imports the
 * footnote-specific format helpers, avoiding an import cycle.
 */
import type {
  EditorBlockNode,
  EditorDocument,
  EditorFootnoteNumberFormat,
  EditorParagraphNode,
  EditorSection,
  EditorTextRun,
} from "./model.js";
import { getBlockParagraphs, getDocumentSectionsCanonical } from "./model.js";
import { assertNever } from "./assertNever.js";

/** Discriminant of a note reference run. */
export type NoteReferenceRunKind = "footnoteReference" | "endnoteReference";

/** Neutral view of a note reference run's data (id + optional custom mark). */
export interface NoteRef {
  id: string;
  customMark?: string;
}

/** Minimal shape of a note body shared by footnotes and endnotes. */
interface NoteBody {
  blocks: EditorBlockNode[];
}

/** Minimal shape of a note collection (footnotes/endnotes registry). */
interface NoteCollection<TNote extends NoteBody> {
  items: Record<string, TNote>;
  settings?: { numberFormat?: EditorFootnoteNumberFormat; startAt?: number };
}

/**
 * Describes one note family so the shared algorithm can operate on either.
 */
export interface NoteTraversal {
  /** Reference run discriminant for this family. */
  runKind: NoteReferenceRunKind;
  /** Read neutral reference data from a run, or undefined if not this kind. */
  getRef(run: EditorTextRun): NoteRef | undefined;
  /** Map a one-based index + format to display marker text. */
  formatMarker(
    oneBasedIndex: number,
    format: EditorFootnoteNumberFormat,
  ): string;
}

/**
 * Iterate every paragraph in document order (note bodies excluded), yielding
 * each reference run of `runKind` with its owning paragraph. Order matches
 * reading order, which is what numbering depends on.
 */
export function* iterateNoteReferenceRuns(
  document: EditorDocument,
  runKind: NoteReferenceRunKind,
): Generator<
  { paragraph: EditorParagraphNode; run: EditorTextRun },
  void,
  void
> {
  const sections = getDocumentSectionsCanonical(document);
  for (const section of sections) {
    const zones: EditorBlockNode[][] = [
      section.header ?? [],
      section.firstPageHeader ?? [],
      section.evenPageHeader ?? [],
      section.blocks,
      section.footer ?? [],
      section.firstPageFooter ?? [],
      section.evenPageFooter ?? [],
    ];
    for (const blocks of zones) {
      for (const block of blocks) {
        for (const paragraph of getBlockParagraphs(block)) {
          for (const run of paragraph.runs) {
            if (run.kind === runKind) {
              yield { paragraph, run };
            }
          }
        }
      }
    }
  }
}

export function collectNoteReferences(
  document: EditorDocument,
  runKind: NoteReferenceRunKind,
): Array<{ paragraph: EditorParagraphNode; run: EditorTextRun }> {
  const out: Array<{ paragraph: EditorParagraphNode; run: EditorTextRun }> = [];
  for (const entry of iterateNoteReferenceRuns(document, runKind)) {
    out.push(entry);
  }
  return out;
}

/** Find the note body that contains the given paragraph id (neutral id). */
export function findNoteBodyByParagraphId<TNote extends NoteBody>(
  items: Record<string, TNote> | undefined,
  paragraphId: string,
): { id: string; body: TNote } | null {
  if (!items) return null;
  for (const [id, body] of Object.entries(items)) {
    for (const block of body.blocks) {
      for (const paragraph of getBlockParagraphs(block)) {
        if (paragraph.id === paragraphId) {
          return { id, body };
        }
      }
    }
  }
  return null;
}

/** Find the first reference run for a given note id. */
export function findNoteReference(
  document: EditorDocument,
  traversal: NoteTraversal,
  noteId: string,
): { paragraph: EditorParagraphNode; run: EditorTextRun } | null {
  for (const entry of iterateNoteReferenceRuns(document, traversal.runKind)) {
    if (traversal.getRef(entry.run)?.id === noteId) {
      return entry;
    }
  }
  return null;
}

/** Neutral per-reference info (id + custom mark + computed reading-order index). */
export interface NoteReferenceInfo {
  id: string;
  customMark?: string;
  index: number;
}

export function listReferencedNotes(
  document: EditorDocument,
  traversal: NoteTraversal,
): NoteReferenceInfo[] {
  const seen = new Set<string>();
  const result: NoteReferenceInfo[] = [];
  let counter = 0;
  for (const { run } of iterateNoteReferenceRuns(document, traversal.runKind)) {
    const ref = traversal.getRef(run);
    if (!ref) continue;
    if (seen.has(ref.id)) continue;
    seen.add(ref.id);
    if (!ref.customMark) {
      counter += 1;
    }
    result.push({
      id: ref.id,
      customMark: ref.customMark,
      index: ref.customMark ? 0 : counter,
    });
  }
  return result;
}

/** Result of {@link computeNoteRenumber}: rewritten sections + pruned items. */
export interface NoteRenumberResult<TNote extends NoteBody> {
  sections: EditorSection[];
  sectionsChanged: boolean;
  nextItems: Record<string, TNote>;
  itemsChanged: boolean;
}

/**
 * Compute the renumbering of a note family: assign a marker per referenced note
 * in reading order, rewrite reference run text where it differs, and prune note
 * bodies that are no longer referenced. Pure — the caller assembles the new
 * document with the correct collection field.
 */
export function computeNoteRenumber<TNote extends NoteBody>(
  document: EditorDocument,
  collection: NoteCollection<TNote>,
  traversal: NoteTraversal,
): NoteRenumberResult<TNote> {
  const format = collection.settings?.numberFormat ?? "decimal";
  const startAt = collection.settings?.startAt ?? 1;

  // First pass: assign a marker text per referenced note in reading order.
  const referenced = new Set<string>();
  const markerById = new Map<string, string>();
  let autoCounter = startAt - 1;
  for (const { run } of iterateNoteReferenceRuns(document, traversal.runKind)) {
    const ref = traversal.getRef(run);
    if (!ref) continue;
    referenced.add(ref.id);
    if (ref.customMark) {
      markerById.set(ref.id, ref.customMark);
      continue;
    }
    if (!markerById.has(ref.id)) {
      autoCounter += 1;
      markerById.set(ref.id, traversal.formatMarker(autoCounter, format));
    }
  }

  // Second pass: rewrite run.text for reference markers when they differ.
  let sectionsChanged = false;
  const sections = getDocumentSectionsCanonical(document).map((section) => {
    const rewriteBlocks = (
      blocks: EditorBlockNode[] | undefined,
    ): EditorBlockNode[] | undefined => {
      if (!blocks) return blocks;
      let blockChanged = false;
      const nextBlocks = blocks.map((block) => {
        switch (block.type) {
          case "paragraph": {
            const updated = rewriteParagraphMarkers(
              block,
              traversal,
              markerById,
            );
            if (updated !== block) blockChanged = true;
            return updated;
          }
          case "table": {
            let tableChanged = false;
            const nextRows = block.rows.map((row) => {
              let rowChanged = false;
              const nextCells = row.cells.map((cell) => {
                let cellChanged = false;
                const nextCellBlocks = cell.blocks.map((p) => {
                  const updated = rewriteParagraphMarkers(
                    p,
                    traversal,
                    markerById,
                  );
                  if (updated !== p) cellChanged = true;
                  return updated;
                });
                if (!cellChanged) return cell;
                rowChanged = true;
                return { ...cell, blocks: nextCellBlocks };
              });
              if (!rowChanged) return row;
              tableChanged = true;
              return { ...row, cells: nextCells };
            });
            if (!tableChanged) return block;
            blockChanged = true;
            return { ...block, rows: nextRows };
          }
          default:
            return assertNever(block, "block");
        }
      });
      if (!blockChanged) return blocks;
      sectionsChanged = true;
      return nextBlocks;
    };

    return {
      ...section,
      blocks: rewriteBlocks(section.blocks) ?? section.blocks,
      header: rewriteBlocks(section.header),
      firstPageHeader: rewriteBlocks(section.firstPageHeader),
      evenPageHeader: rewriteBlocks(section.evenPageHeader),
      footer: rewriteBlocks(section.footer),
      firstPageFooter: rewriteBlocks(section.firstPageFooter),
      evenPageFooter: rewriteBlocks(section.evenPageFooter),
    };
  });

  // Prune unreferenced notes.
  const nextItems: Record<string, TNote> = {};
  let itemsChanged = false;
  for (const [id, body] of Object.entries(collection.items)) {
    if (referenced.has(id)) {
      nextItems[id] = body;
    } else {
      itemsChanged = true;
    }
  }

  return { sections, sectionsChanged, nextItems, itemsChanged };
}

function rewriteParagraphMarkers(
  paragraph: EditorParagraphNode,
  traversal: NoteTraversal,
  markerById: Map<string, string>,
): EditorParagraphNode {
  let runChanged = false;
  const nextRuns = paragraph.runs.map((run) => {
    const ref = traversal.getRef(run);
    if (!ref) return run;
    const desired = markerById.get(ref.id);
    if (desired === undefined) return run;
    if (run.text === desired) return run;
    runChanged = true;
    return { ...run, text: desired };
  });
  if (!runChanged) return paragraph;
  return { ...paragraph, runs: nextRuns };
}
