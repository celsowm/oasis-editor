import { getParagraphs, type EditorState } from "../../core/model.js";
import type { CommentHighlightBox } from "../editorUiTypes.js";
import type { CanvasLayoutSnapshot } from "./CanvasLayoutSnapshot.js";

/**
 * Project each document comment's start/end anchors into highlight rectangles
 * over the commented text, reusing the canvas layout snapshot's per-line slot
 * positions (the same machinery `computeCanvasSelectionGeometry` uses for the
 * live selection). Multi-line and cross-paragraph comments yield one box per
 * covered line; every box carries its `commentId` so the overlay can group them
 * and resolve the popup body on hover.
 */
export function computeCommentHighlights(
  snapshot: CanvasLayoutSnapshot,
  state: EditorState,
): CommentHighlightBox[] {
  const registry = state.document.comments;
  if (!registry || registry.order.length === 0) {
    return [];
  }
  const surfaceRect = snapshot.surfaceRect;
  const paragraphIndexById = new Map(
    getParagraphs(state).map(
      (paragraph, index) => [paragraph.id, index] as const,
    ),
  );

  const boxes: CommentHighlightBox[] = [];
  for (const id of registry.order) {
    const comment = registry.items[id];
    if (!comment?.start || !comment?.end) {
      continue;
    }
    const startIndex = paragraphIndexById.get(comment.start.paragraphId);
    const endIndex = paragraphIndexById.get(comment.end.paragraphId);
    if (startIndex === undefined || endIndex === undefined) {
      continue;
    }

    for (const segment of snapshot.paragraphs) {
      const segmentIndex = paragraphIndexById.get(segment.paragraphId);
      if (
        segmentIndex === undefined ||
        segmentIndex < startIndex ||
        segmentIndex > endIndex
      ) {
        continue;
      }
      const rangeStart = segmentIndex === startIndex ? comment.start.offset : 0;
      const rangeEnd =
        segmentIndex === endIndex
          ? comment.end.offset
          : Number.POSITIVE_INFINITY;
      const segStart = Math.max(rangeStart, segment.startOffset);
      const segEnd = Math.min(rangeEnd, segment.endOffset);
      if (segStart >= segEnd) {
        continue;
      }

      for (const line of segment.lines) {
        const lineStart = Math.max(segStart, line.startOffset);
        const lineEnd = Math.min(segEnd, line.endOffset);
        if (lineStart >= lineEnd) {
          continue;
        }
        const startSlot = line.slots.find((slot) => slot.offset === lineStart);
        const endSlot =
          line.slots.find((slot) => slot.offset === lineEnd) ??
          line.slots[line.slots.length - 1];
        if (!startSlot || !endSlot) {
          continue;
        }
        boxes.push({
          commentId: id,
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
