import type {
  EditorBlockNode,
  EditorDocument,
  EditorEndnote,
  EditorEndnotes,
  EditorParagraphNode,
  EditorTextRun,
} from "./model.js";
import { getBlockParagraphs, getDocumentSectionsCanonical } from "./model.js";
import { getFootnoteDisplayMarker } from "./footnotes.js";

let nextEndnoteId = 1;

export function resetEndnoteIds(): void {
  nextEndnoteId = 1;
}

export function createEndnoteId(): string {
  const id = `endnote:${nextEndnoteId}`;
  nextEndnoteId += 1;
  return id;
}

/**
 * Iterate every paragraph in document order (endnote bodies excluded), yielding
 * each endnote reference run with its owning paragraph. Order matches reading
 * order, which is what numbering depends on.
 */
export function* iterateEndnoteReferenceRuns(
  document: EditorDocument,
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
            if (run.endnoteReference) {
              yield { paragraph, run };
            }
          }
        }
      }
    }
  }
}

export function collectEndnoteReferences(
  document: EditorDocument,
): Array<{ paragraph: EditorParagraphNode; run: EditorTextRun }> {
  const out: Array<{ paragraph: EditorParagraphNode; run: EditorTextRun }> = [];
  for (const entry of iterateEndnoteReferenceRuns(document)) {
    out.push(entry);
  }
  return out;
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
  const items = document.endnotes?.items;
  if (!items) return null;
  for (const [endnoteId, endnote] of Object.entries(items)) {
    for (const block of endnote.blocks) {
      for (const paragraph of getBlockParagraphs(block)) {
        if (paragraph.id === paragraphId) {
          return { endnoteId, endnote };
        }
      }
    }
  }
  return null;
}

export function findEndnoteReference(
  document: EditorDocument,
  endnoteId: string,
): { paragraph: EditorParagraphNode; run: EditorTextRun } | null {
  for (const entry of iterateEndnoteReferenceRuns(document)) {
    if (entry.run.endnoteReference?.endnoteId === endnoteId) {
      return entry;
    }
  }
  return null;
}

export interface EndnoteReferenceInfo {
  endnoteId: string;
  customMark?: string;
  index: number;
}

export function listReferencedEndnotes(
  document: EditorDocument,
): EndnoteReferenceInfo[] {
  const seen = new Set<string>();
  const result: EndnoteReferenceInfo[] = [];
  let counter = 0;
  for (const { run } of iterateEndnoteReferenceRuns(document)) {
    const ref = run.endnoteReference;
    if (!ref) continue;
    if (seen.has(ref.endnoteId)) continue;
    seen.add(ref.endnoteId);
    if (!ref.customMark) {
      counter += 1;
    }
    result.push({
      endnoteId: ref.endnoteId,
      customMark: ref.customMark,
      index: ref.customMark ? 0 : counter,
    });
  }
  return result;
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
  const format = endnotes.settings?.numberFormat ?? "decimal";
  const startAt = endnotes.settings?.startAt ?? 1;

  // First pass: assign a marker text per referenced endnote in reading order.
  const referenced = new Set<string>();
  const markerByEndnoteId = new Map<string, string>();
  let autoCounter = startAt - 1;
  for (const { run } of iterateEndnoteReferenceRuns(document)) {
    const ref = run.endnoteReference;
    if (!ref) continue;
    referenced.add(ref.endnoteId);
    if (ref.customMark) {
      markerByEndnoteId.set(ref.endnoteId, ref.customMark);
      continue;
    }
    if (!markerByEndnoteId.has(ref.endnoteId)) {
      autoCounter += 1;
      markerByEndnoteId.set(
        ref.endnoteId,
        getFootnoteDisplayMarker(autoCounter, format),
      );
    }
  }

  // Second pass: rewrite run.text for reference markers when they differ.
  let mutatedSections = false;
  const sections = getDocumentSectionsCanonical(document).map((section) => {
    const rewriteBlocks = (
      blocks: EditorBlockNode[] | undefined,
    ): EditorBlockNode[] | undefined => {
      if (!blocks) return blocks;
      let blockChanged = false;
      const nextBlocks = blocks.map((block) => {
        if (block.type === "paragraph") {
          const updated = rewriteParagraphMarkers(block, markerByEndnoteId);
          if (updated !== block) blockChanged = true;
          return updated;
        }
        let tableChanged = false;
        const nextRows = block.rows.map((row) => {
          let rowChanged = false;
          const nextCells = row.cells.map((cell) => {
            let cellChanged = false;
            const nextCellBlocks = cell.blocks.map((p) => {
              const updated = rewriteParagraphMarkers(p, markerByEndnoteId);
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
      });
      if (!blockChanged) return blocks;
      mutatedSections = true;
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

  // Prune unreferenced endnotes.
  const nextItems: Record<string, EditorEndnote> = {};
  let itemsChanged = false;
  for (const [id, endnote] of Object.entries(endnotes.items)) {
    if (referenced.has(id)) {
      nextItems[id] = endnote;
    } else {
      itemsChanged = true;
    }
  }

  if (!mutatedSections && !itemsChanged) {
    return document;
  }

  return {
    ...document,
    sections: mutatedSections ? sections : document.sections,
    endnotes: {
      ...endnotes,
      items: itemsChanged ? nextItems : endnotes.items,
    },
  };
}

function rewriteParagraphMarkers(
  paragraph: EditorParagraphNode,
  markerByEndnoteId: Map<string, string>,
): EditorParagraphNode {
  let runChanged = false;
  const nextRuns = paragraph.runs.map((run) => {
    if (!run.endnoteReference) return run;
    const desired = markerByEndnoteId.get(run.endnoteReference.endnoteId);
    if (desired === undefined) return run;
    if (run.text === desired) return run;
    runChanged = true;
    return { ...run, text: desired };
  });
  if (!runChanged) return paragraph;
  return { ...paragraph, runs: nextRuns };
}
