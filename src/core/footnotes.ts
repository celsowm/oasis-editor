import type {
  EditorBlockNode,
  EditorDocument,
  EditorFootnote,
  EditorFootnoteNumberFormat,
  EditorFootnotes,
  EditorParagraphNode,
  EditorTextRun,
} from "./model.js";
import { getBlockParagraphs, getDocumentSectionsCanonical } from "./model.js";
import { assertNever } from "./assertNever.js";

/**
 * Iterate every paragraph in document order (sections + footnotes excluded),
 * yielding each footnote reference run along with the owning paragraph. Order
 * matches reading order, which is what numbering depends on.
 */
export function* iterateFootnoteReferenceRuns(
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
            if (run.footnoteReference) {
              yield { paragraph, run };
            }
          }
        }
      }
    }
  }
}

export function collectFootnoteReferences(
  document: EditorDocument,
): Array<{ paragraph: EditorParagraphNode; run: EditorTextRun }> {
  const out: Array<{ paragraph: EditorParagraphNode; run: EditorTextRun }> = [];
  for (const entry of iterateFootnoteReferenceRuns(document)) {
    out.push(entry);
  }
  return out;
}

const LOWER_LETTERS = "abcdefghijklmnopqrstuvwxyz";
const ROMAN_NUMERALS: Array<[number, string]> = [
  [1000, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];

function toRoman(value: number): string {
  if (value <= 0) return String(value);
  let remaining = value;
  let result = "";
  for (const [size, glyph] of ROMAN_NUMERALS) {
    while (remaining >= size) {
      result += glyph;
      remaining -= size;
    }
  }
  return result;
}

function toLetters(value: number): string {
  if (value <= 0) return String(value);
  let remaining = value;
  let result = "";
  while (remaining > 0) {
    const digit = (remaining - 1) % 26;
    result = LOWER_LETTERS[digit] + result;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return result;
}

const SYMBOL_MARKS = ["*", "†", "‡", "§", "¶", "#"];

export function getFootnoteDisplayMarker(
  oneBasedIndex: number,
  format: EditorFootnoteNumberFormat | undefined = "decimal",
): string {
  switch (format) {
    case "lowerRoman":
      return toRoman(oneBasedIndex);
    case "upperRoman":
      return toRoman(oneBasedIndex).toUpperCase();
    case "lowerLetter":
      return toLetters(oneBasedIndex);
    case "upperLetter":
      return toLetters(oneBasedIndex).toUpperCase();
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
  const items = document.footnotes?.items;
  if (!items) return null;
  for (const [footnoteId, footnote] of Object.entries(items)) {
    for (const block of footnote.blocks) {
      for (const paragraph of getBlockParagraphs(block)) {
        if (paragraph.id === paragraphId) {
          return { footnoteId, footnote };
        }
      }
    }
  }
  return null;
}

export function findFootnoteReference(
  document: EditorDocument,
  footnoteId: string,
): { paragraph: EditorParagraphNode; run: EditorTextRun } | null {
  for (const entry of iterateFootnoteReferenceRuns(document)) {
    if (entry.run.footnoteReference?.footnoteId === footnoteId) {
      return entry;
    }
  }
  return null;
}

export interface FootnoteReferenceInfo {
  footnoteId: string;
  customMark?: string;
  index: number;
}

export function listReferencedFootnotes(
  document: EditorDocument,
): FootnoteReferenceInfo[] {
  const seen = new Set<string>();
  const result: FootnoteReferenceInfo[] = [];
  let counter = 0;
  for (const { run } of iterateFootnoteReferenceRuns(document)) {
    const ref = run.footnoteReference;
    if (!ref) continue;
    if (seen.has(ref.footnoteId)) continue;
    seen.add(ref.footnoteId);
    if (!ref.customMark) {
      counter += 1;
    }
    result.push({
      footnoteId: ref.footnoteId,
      customMark: ref.customMark,
      index: ref.customMark ? 0 : counter,
    });
  }
  return result;
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
  const format = footnotes.settings?.numberFormat ?? "decimal";
  const startAt = footnotes.settings?.startAt ?? 1;

  // First pass: assign a marker text per referenced footnote in reading order.
  const referenced = new Set<string>();
  const markerByFootnoteId = new Map<string, string>();
  let autoCounter = startAt - 1;
  for (const { run } of iterateFootnoteReferenceRuns(document)) {
    const ref = run.footnoteReference;
    if (!ref) continue;
    referenced.add(ref.footnoteId);
    if (ref.customMark) {
      markerByFootnoteId.set(ref.footnoteId, ref.customMark);
      continue;
    }
    if (!markerByFootnoteId.has(ref.footnoteId)) {
      autoCounter += 1;
      markerByFootnoteId.set(
        ref.footnoteId,
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
        switch (block.type) {
          case "paragraph": {
            const updated = rewriteParagraphMarkers(block, markerByFootnoteId);
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
                    markerByFootnoteId,
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

  // Prune unreferenced footnotes.
  const nextItems: Record<string, EditorFootnote> = {};
  let itemsChanged = false;
  for (const [id, footnote] of Object.entries(footnotes.items)) {
    if (referenced.has(id)) {
      nextItems[id] = footnote;
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
    footnotes: {
      ...footnotes,
      items: itemsChanged ? nextItems : footnotes.items,
    },
  };
}

function rewriteParagraphMarkers(
  paragraph: EditorParagraphNode,
  markerByFootnoteId: Map<string, string>,
): EditorParagraphNode {
  let runChanged = false;
  const nextRuns = paragraph.runs.map((run) => {
    if (!run.footnoteReference) return run;
    const desired = markerByFootnoteId.get(run.footnoteReference.footnoteId);
    if (desired === undefined) return run;
    if (run.text === desired) return run;
    runChanged = true;
    return { ...run, text: desired };
  });
  if (!runChanged) return paragraph;
  return { ...paragraph, runs: nextRuns };
}
