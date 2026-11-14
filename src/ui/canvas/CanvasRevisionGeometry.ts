import type { EditorRevision } from "@/core/model.js";
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
 * merge so one continuous strikethrough/underline is painted per line.
 */
function collectRevisionRanges(paragraph: {
  runs: { text: string; revision?: EditorRevision }[];
}): RevisionRange[] {
  const ranges: RevisionRange[] = [];
  let offset = 0;
  for (const run of paragraph.runs) {
    const start = offset;
    const end = offset + run.text.length;
    offset = end;
    const revision = run.revision;
    if (
      revision &&
      (revision.type === "insert" || revision.type === "delete") &&
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
 * property/formatting and merge/grid revisions are not painted.
 */
export function computeRevisionMarkup(
  snapshot: CanvasLayoutSnapshot,
): RevisionMarkupBox[] {
  const surfaceRect = snapshot.surfaceRect;
  const boxes: RevisionMarkupBox[] = [];
  for (const segment of snapshot.paragraphs) {
    const ranges = collectRevisionRanges(segment.paragraph);
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
