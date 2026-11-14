import type { EditorRevision, EditorState } from "@/core/model.js";
import { isRevisionMarkupShown } from "@/core/commands/reviewMarkup.js";
import type { RevisionMarkupBox } from "@/ui/editorUiTypes.js";
import type { CanvasLayoutSnapshot } from "./CanvasLayoutSnapshot.js";

interface RevisionRange {
  start: number;
  end: number;
  revisionId: string;
  type: "insert" | "delete" | "property";
}

/**
 * Collect the visible text ranges (in paragraph-local offsets) that belong to
 * an insertion, deletion or run-level formatting (property) revision. Adjacent
 * runs from the same revision merge so one continuous decoration is painted
 * per line. Show Markup filters (revision category and author) are applied
 * here, so hiding a category never mutates the underlying revision data. A run
 * carrying both an insert/delete and a property revision paints only the
 * insert/delete decoration to avoid overlapping boxes.
 */
function collectRevisionRanges(
  paragraph: {
    runs: {
      text: string;
      revision?: EditorRevision;
      styles?: { propertyRevision?: { id: string; author: string } };
    }[];
  },
  state: EditorState,
): RevisionRange[] {
  const ranges: RevisionRange[] = [];
  let offset = 0;
  for (const run of paragraph.runs) {
    const start = offset;
    const end = offset + run.text.length;
    offset = end;
    const revision = run.revision;
    const property = run.styles?.propertyRevision;
    let id: string | undefined;
    let type: RevisionRange["type"] | undefined;
    let author: string | undefined;
    if (
      revision &&
      (revision.type === "insert" || revision.type === "delete")
    ) {
      id = revision.id;
      type = revision.type;
      author = revision.author;
    } else if (property) {
      id = property.id;
      type = "property";
      author = property.author;
    }
    if (
      id !== undefined &&
      type !== undefined &&
      author !== undefined &&
      isRevisionMarkupShown(state, type, author) &&
      end > start
    ) {
      const previous = ranges.at(-1);
      if (
        previous &&
        previous.revisionId === id &&
        previous.type === type &&
        previous.end === start
      ) {
        previous.end = end;
      } else {
        ranges.push({ start, end, revisionId: id, type });
      }
    }
  }
  return ranges;
}

/**
 * Collect structural/formatting revisions on table cells. A cell's revision
 * (`w:tcPr` insert/delete/merge or `w:tcPrChange` property) is carried on the
 * snapshot's `tableCell` geometry; dedupe by cell because a cell can hold many
 * paragraphs. Show Markup category/reviewer filters apply through the shared
 * `isRevisionMarkupShown`; merge has no category and is reviewer-filtered only.
 * Grid (`w:tblGridChange`) and table-level revisions are preservation-only and
 * not painted.
 */
function collectTableCellRevisions(
  snapshot: CanvasLayoutSnapshot,
  state: EditorState,
): RevisionMarkupBox[] {
  const { surfaceRect } = snapshot;
  const boxes: RevisionMarkupBox[] = [];
  const seen = new Set<string>();
  for (const segment of snapshot.paragraphs) {
    const cell = segment.tableCell;
    if (!cell?.revisionId) continue;
    const key = `${cell.tableId}:${cell.rowIndex}:${cell.cellIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const type = cell.revisionType ?? "property";
    if (!isRevisionMarkupShown(state, type, cell.revisionAuthor ?? "")) {
      continue;
    }
    boxes.push({
      revisionId: cell.revisionId,
      type,
      variant: "cell",
      left: cell.left - surfaceRect.left,
      top: cell.top - surfaceRect.top,
      width: cell.width,
      height: cell.height,
    });
  }
  return boxes;
}

/**
 * Project insert/delete/formatting text ranges and structural/formatting table
 * cell revisions into highlight rectangles. Text ranges reuse the canvas layout
 * snapshot's per-line slot positions; cell revisions use the cell box. Show
 * Markup filters come from the live editor state, not from the document.
 */
export function computeRevisionMarkup(
  snapshot: CanvasLayoutSnapshot,
  state: EditorState,
): RevisionMarkupBox[] {
  const surfaceRect = snapshot.surfaceRect;
  const boxes: RevisionMarkupBox[] = [];
  for (const segment of snapshot.paragraphs) {
    const ranges = collectRevisionRanges(segment.paragraph, state);
    if (ranges.length === 0) continue;
    for (const line of segment.lines) {
      for (const range of ranges) {
        const lineStart = Math.max(range.start, line.startOffset);
        const lineEnd = Math.min(range.end, line.endOffset);
        if (lineStart >= lineEnd) continue;
        const startSlot = line.slots.find(
          (slot): boolean => slot.offset === lineStart,
        );
        const endSlot =
          line.slots.find((slot): boolean => slot.offset === lineEnd) ??
          line.slots[line.slots.length - 1];
        if (!startSlot || !endSlot) continue;
        boxes.push({
          revisionId: range.revisionId,
          type: range.type,
          left: startSlot.left - surfaceRect.left,
          top: line.top - surfaceRect.top,
          width: Math.max(1, endSlot.left - startSlot.left),
          height: line.height,
        });
      }
    }
  }
  boxes.push(...collectTableCellRevisions(snapshot, state));
  return boxes;
}

export type { RevisionMarkupBox };
