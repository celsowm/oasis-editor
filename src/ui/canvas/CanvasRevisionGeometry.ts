import type { EditorRevision, EditorState } from "@/core/model.js";
import {
  isMarkupAuthorShown,
  isMarkupSectionShown,
} from "@/core/commands/reviewMarkup.js";
import type { RevisionMarkupBox } from "@/ui/editorUiTypes.js";
import type { CanvasLayoutSnapshot } from "./CanvasLayoutSnapshot.js";

interface RevisionRange {
  start: number;
  end: number;
  revisionId: string;
  type: "insert" | "delete";
}

/**
 * Collect the visible text ranges (in paragraph-local offsets) that belong to
 * an insertion or deletion revision. Adjacent runs from the same revision
 * merge so one continuous strikethrough/underline is painted per line. Show
 * Markup filters (revision category and author) are applied here, so hiding a
 * category never mutates the underlying revision data.
 */
function collectRevisionRanges(
  paragraph: { runs: { text: string; revision?: EditorRevision }[] },
  state: EditorState,
): RevisionRange[] {
  const ranges: RevisionRange[] = [];
  const showInsertions = isMarkupSectionShown(state, "insertions");
  const showDeletions = isMarkupSectionShown(state, "deletions");
  let offset = 0;
  for (const run of paragraph.runs) {
    const start = offset;
    const end = offset + run.text.length;
    offset = end;
    const revision = run.revision;
    if (
      revision &&
      (revision.type === "insert" || revision.type === "delete") &&
      (revision.type === "insert" ? showInsertions : showDeletions) &&
      isMarkupAuthorShown(state, revision.author) &&
      end > start
    ) {
      const previous = ranges.at(-1);
      if (
        previous &&
        previous.revisionId === revision.id &&
        previous.type === revision.type &&
        previous.end === start
      ) {
        previous.end = end;
      } else {
        ranges.push({
          start,
          end,
          revisionId: revision.id,
          type: revision.type,
        });
      }
    }
  }
  return ranges;
}

/**
 * Project insert/delete revision ranges into highlight rectangles, reusing the
 * canvas layout snapshot's per-line slot positions (the same machinery the
 * comment highlights and the selection geometry use). One box per covered line;
 * property/formatting and merge/grid revisions are not painted. Show Markup
 * filters come from the live editor state, not from the document.
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
  return boxes;
}

export type { RevisionMarkupBox };
