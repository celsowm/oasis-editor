/**
 * Review navigation uses the active editable paragraph stream, which includes
 * nested table cells. It never jumps into a different header/footer/section,
 * so the resulting selection remains valid for the current editor zone.
 */
import type { EditorComment, EditorParagraphNode, EditorState } from "@/core/model.js";
import {
  getParagraphs,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";

interface ReviewRange {
  id: string;
  startIndex: number;
  startOffset: number;
  endIndex: number;
  endOffset: number;
}

function positionOf(
  paragraph: EditorParagraphNode, offset: number,
) {
  return paragraphOffsetToPosition(paragraph, offset);
}

function compare(
  aIndex: number, aOffset: number, bIndex: number, bOffset: number,
): number {
  return aIndex - bIndex || aOffset - bOffset;
}

function moveToReviewRange(state: EditorState, range: ReviewRange): EditorState {
  const paragraphs = getParagraphs(state);
  const start = paragraphs[range.startIndex];
  const end = paragraphs[range.endIndex];
  if (!start || !end) return state;
  return {
    ...state,
    selection: {
      anchor: positionOf(start, range.startOffset),
      focus: positionOf(end, range.endOffset),
    },
  };
}

function findNextRange(
  state: EditorState,
  ranges: ReviewRange[],
  direction: "next" | "previous",
): ReviewRange | null {
  if (!ranges.length) return null;
  const paragraphs = getParagraphs(state);
  const byId = new Map(paragraphs.map((p, i) => [p.id, i]));
  const focusIndex = byId.get(state.selection.focus.paragraphId);
  if (focusIndex === undefined) return null;
  const focusParagraph = paragraphs[focusIndex]!;
  const focusOffset = positionToParagraphOffset(
    focusParagraph, state.selection.focus,
  );

  const found = direction === "next"
    ? ranges.find((range) =>
      compare(range.startIndex, range.startOffset, focusIndex, focusOffset) > 0)
    : [...ranges].reverse().find((range) =>
      compare(range.startIndex, range.startOffset, focusIndex, focusOffset) < 0);
  // Wrap around, as in the native Review navigation commands.
  return found ?? (direction === "next" ? ranges[0]! : ranges[ranges.length - 1]!);
}

export function collectNavigableRevisions(state: EditorState): ReviewRange[] {
  const paragraphs = getParagraphs(state);
  const ranges: ReviewRange[] = [];
  const seen = new Set<string>();
  paragraphs.forEach((paragraph, index) => {
    let offset = 0;
    for (const run of paragraph.runs) {
      const revisionId = run.revision?.id;
      if (revisionId && !seen.has(revisionId)) {
        seen.add(revisionId);
        ranges.push({
          id: revisionId,
          startIndex: index,
          startOffset: offset,
          endIndex: index,
          endOffset: offset + run.text.length,
        });
      }
      offset += run.text.length;
    }
  });
  return ranges;
}

export function navigateRevision(
  state: EditorState, direction: "next" | "previous",
): EditorState {
  const target = findNextRange(state, collectNavigableRevisions(state), direction);
  return target ? moveToReviewRange(state, target) : state;
}

function commentRanges(state: EditorState): ReviewRange[] {
  const paragraphs = getParagraphs(state);
  const indexById = new Map(paragraphs.map((p, i) => [p.id, i]));
  const registry = state.document.comments;
  if (!registry) return [];
  const ranges: ReviewRange[] = [];
  for (const id of registry.order) {
    const comment = registry.items[id];
    if (!comment?.start || !comment.end) continue;
    const startIndex = indexById.get(comment.start.paragraphId);
    const endIndex = indexById.get(comment.end.paragraphId);
    if (startIndex === undefined || endIndex === undefined) continue;
    const start = paragraphs[startIndex]!;
    const end = paragraphs[endIndex]!;
    const startOffset = Math.max(0, Math.min(comment.start.offset,
      start.runs.reduce((n, run) => n + run.text.length, 0)));
    const endOffset = Math.max(0, Math.min(comment.end.offset,
      end.runs.reduce((n, run) => n + run.text.length, 0)));
    if (compare(startIndex, startOffset, endIndex, endOffset) > 0) continue;
    ranges.push({ id, startIndex, startOffset, endIndex, endOffset });
  }
  return ranges.sort((a, b) =>
    compare(a.startIndex, a.startOffset, b.startIndex, b.startOffset));
}

export function collectNavigableComments(state: EditorState): string[] {
  return commentRanges(state).map((entry) => entry.id);
}

export function navigateComment(
  state: EditorState, direction: "next" | "previous",
): EditorState {
  const target = findNextRange(state, commentRanges(state), direction);
  return target ? moveToReviewRange(state, target) : state;
}

/**
 * An exact navigated range takes precedence over merely touching its end.
 * This keeps Resolve/Delete tied to the selected thread rather than a nearby
 * overlapping comment. Replies without anchors are managed by parent id.
 */
export function getSelectedReviewComment(state: EditorState): EditorComment | null {
  const ranges = commentRanges(state);
  if (!ranges.length) return null;
  const selection = normalizeSelection(state);
  const exact = ranges.find((range) =>
    compare(range.startIndex, range.startOffset,
      selection.startIndex, selection.startParagraphOffset) === 0 &&
    compare(range.endIndex, range.endOffset,
      selection.endIndex, selection.endParagraphOffset) === 0);
  const current = exact ?? ranges.find((range) =>
    compare(range.startIndex, range.startOffset,
      selection.startIndex, selection.startParagraphOffset) <= 0 &&
    compare(range.endIndex, range.endOffset,
      selection.endIndex, selection.endParagraphOffset) >= 0);
  return current ? state.document.comments?.items[current.id] ?? null : null;
}

/** Keep all comment metadata/anchors intact for DOCX round-trip. */
export function setSelectedCommentResolved(
  state: EditorState, resolved: boolean,
): EditorState {
  const comment = getSelectedReviewComment(state);
  const registry = state.document.comments;
  if (!comment || !registry || Boolean(comment.resolved) === resolved) return state;
  return {
    ...state,
    document: {
      ...state.document,
      comments: {
        ...registry,
        items: {
          ...registry.items,
          [comment.id]: { ...comment, resolved },
        },
      },
    },
  };
}

/**
 * Deleting a parent thread deletes all its descendants, preventing dangling
 * parentId pointers in commentsExtended.xml.
 */
export function deleteSelectedComment(state: EditorState): EditorState {
  const comment = getSelectedReviewComment(state);
  const registry = state.document.comments;
  if (!comment || !registry) return state;
  const removed = new Set<string>([comment.id]);
  let added = true;
  while (added) {
    added = false;
    for (const entry of Object.values(registry.items)) {
      if (entry.parentId && removed.has(entry.parentId) && !removed.has(entry.id)) {
        removed.add(entry.id);
        added = true;
      }
    }
  }
  const items = Object.fromEntries(
    Object.entries(registry.items).filter(([id]) => !removed.has(id)),
  );
  return {
    ...state,
    document: {
      ...state.document,
      comments: {
        ...registry,
        items,
        order: registry.order.filter((id) => !removed.has(id)),
      },
    },
  };
}
