import type { EditorRevision, EditorState } from "@/core/model.js";
import { isRevisionMarkupShown } from "@/core/commands/reviewMarkup.js";
import {
  collectSectionRevisions,
  collectTableRevisions,
} from "@/core/commands/cellRevisions.js";
import type { RevisionMarkupBox } from "@/ui/editorUiTypes.js";
import type { CanvasLayoutSnapshot } from "./CanvasLayoutSnapshot.js";
import type { CanvasSnapshotParagraph } from "./canvasSnapshotTypes.js";

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

interface CellBox {
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Collect revisions on tables, rows and cells. The document walker supplies
 * which scopes are revised; the snapshot supplies each cell's painted box, so
 * a row/table outline is the union of its cells (a cell can hold many
 * paragraphs). Show Markup category/reviewer filters apply through the shared
 * `isRevisionMarkupShown`; merge and grid have no category and are
 * reviewer-filtered only.
 */
function collectTableRevisionBoxes(
  snapshot: CanvasLayoutSnapshot,
  state: EditorState,
): RevisionMarkupBox[] {
  const { surfaceRect } = snapshot;
  const cells: CellBox[] = [];
  const seenCells = new Set<string>();
  for (const segment of snapshot.paragraphs) {
    const cell = segment.tableCell;
    if (!cell) continue;
    const key = `${cell.tableId}:${cell.rowIndex}:${cell.cellIndex}`;
    if (seenCells.has(key)) continue;
    seenCells.add(key);
    cells.push({
      tableId: cell.tableId,
      rowIndex: cell.rowIndex,
      cellIndex: cell.cellIndex,
      left: cell.left,
      top: cell.top,
      width: cell.width,
      height: cell.height,
    });
  }

  const boxes: RevisionMarkupBox[] = [];
  for (const revision of collectTableRevisions(state)) {
    if (!isRevisionMarkupShown(state, revision.type, revision.author)) continue;
    const matched = cells.filter((cell): boolean => {
      if (cell.tableId !== revision.tableId) return false;
      if (revision.scope === "table") return true;
      if (cell.rowIndex !== revision.rowIndex) return false;
      return revision.scope === "row" || cell.cellIndex === revision.cellIndex;
    });
    if (matched.length === 0) continue;
    const left = Math.min(...matched.map((cell): number => cell.left));
    const top = Math.min(...matched.map((cell): number => cell.top));
    const right = Math.max(
      ...matched.map((cell): number => cell.left + cell.width),
    );
    const bottom = Math.max(
      ...matched.map((cell): number => cell.top + cell.height),
    );
    boxes.push({
      revisionId: revision.id,
      type: revision.type,
      variant: "cell",
      left: left - surfaceRect.left,
      top: top - surfaceRect.top,
      width: right - left,
      height: bottom - top,
    });
  }
  return boxes;
}

/**
 * Collect section-level `w:sectPrChange` outlines. A section property change
 * has no run or cell of its own: the walker supplies the section's body
 * paragraph ids, and the snapshot supplies their painted rects. One dashed
 * outline is emitted per page spanning the union of that section's paragraphs
 * on the page (a section can flow across pages). Show Markup's Formatting
 * checkbox and reviewer filters apply through `isRevisionMarkupShown`. The same
 * all-markup mode gating as every other decoration is applied at the call site.
 */
function collectSectionRevisionBoxes(
  snapshot: CanvasLayoutSnapshot,
  state: EditorState,
): RevisionMarkupBox[] {
  const { surfaceRect } = snapshot;
  const boxes: RevisionMarkupBox[] = [];
  for (const revision of collectSectionRevisions(state)) {
    if (!isRevisionMarkupShown(state, revision.type, revision.author)) continue;
    const ids = new Set(revision.paragraphIds);
    const byPage = new Map<number, CanvasSnapshotParagraph[]>();
    for (const segment of snapshot.paragraphs) {
      if (!ids.has(segment.paragraphId)) continue;
      const group = byPage.get(segment.pageIndex) ?? [];
      group.push(segment);
      byPage.set(segment.pageIndex, group);
    }
    for (const segments of byPage.values()) {
      const left = Math.min(...segments.map((s): number => s.left));
      const top = Math.min(...segments.map((s): number => s.top));
      const right = Math.max(...segments.map((s): number => s.left + s.width));
      const bottom = Math.max(...segments.map((s): number => s.top + s.height));
      boxes.push({
        revisionId: revision.id,
        type: revision.type,
        variant: "section",
        left: left - surfaceRect.left,
        top: top - surfaceRect.top,
        width: right - left,
        height: bottom - top,
      });
    }
  }
  return boxes;
}

/**
 * Project insert/delete/formatting text ranges and table/row/cell/section
 * revisions into highlight rectangles. Text ranges reuse the canvas layout
 * snapshot's per-line slot positions; table revisions use the union of their
 * cells' boxes and section revisions the union of their paragraphs per page.
 * Show Markup filters come from the live editor state, not from the document.
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
  boxes.push(...collectTableRevisionBoxes(snapshot, state));
  boxes.push(...collectSectionRevisionBoxes(snapshot, state));
  return boxes;
}

export type { RevisionMarkupBox };
