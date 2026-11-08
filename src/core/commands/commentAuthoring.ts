/**
 * Comment authoring is a document-model operation: the body and range anchors
 * live in EditorDocument.comments and are exported through the existing DOCX
 * comment parts. No parallel comment store is maintained.
 */
import type {
  EditorComment,
  EditorCommentAnchor,
  EditorState,
} from "@/core/model.js";
import {
  getParagraphs,
  getParagraphText,
  positionToParagraphOffset,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { resolveWordSelection } from "@/core/wordBoundaries.js";

export interface CommentContent {
  id: string;
  author: string;
  text: string;
  date: number;
}

export interface CommentRange {
  start: EditorCommentAnchor;
  end: EditorCommentAnchor;
}

/**
 * A selection becomes a range; a caret on existing text expands to the word
 * under the caret. Blank documents cannot create invisible, unselectable
 * zero-width annotations.
 */
export function getCommentRangeForSelection(state: EditorState): CommentRange | null {
  const paragraphs = getParagraphs(state);
  if (
    !paragraphs.length ||
    !paragraphs.some((p) => p.id === state.selection.anchor.paragraphId) ||
    !paragraphs.some((p) => p.id === state.selection.focus.paragraphId)
  ) {
    return null;
  }
  const range = normalizeSelection(state, paragraphs);
  const start = paragraphs[range.startIndex]!;
  const end = paragraphs[range.endIndex]!;
  let startOffset = range.startParagraphOffset;
  let endOffset = range.endParagraphOffset;
  if (range.isCollapsed) {
    const text = getParagraphText(start);
    const word = resolveWordSelection(text, startOffset);
    if (word.end <= word.start) return null;
    startOffset = word.start;
    endOffset = word.end;
  }
  if (start.id === end.id && startOffset >= endOffset) return null;
  return {
    start: { paragraphId: start.id, offset: startOffset },
    end: { paragraphId: end.id, offset: endOffset },
  };
}

function validContent(content: CommentContent): boolean {
  return Boolean(
    content.id.trim() &&
    content.author.trim() &&
    content.text.trim() &&
    Number.isFinite(content.date),
  );
}

function appendComment(state: EditorState, comment: EditorComment): EditorState {
  const existing = state.document.comments;
  if (existing?.items[comment.id]) return state;
  return {
    ...state,
    document: {
      ...state.document,
      comments: {
        items: { ...(existing?.items ?? {}), [comment.id]: comment },
        order: [...(existing?.order ?? []), comment.id],
      },
    },
  };
}

/** Creates a single anchored thread; metadata and selection remain immutable. */
export function insertCommentAtSelection(
  state: EditorState,
  content: CommentContent,
): EditorState {
  const range = getCommentRangeForSelection(state);
  if (!range || !validContent(content)) return state;
  return appendComment(state, {
    ...content,
    author: content.author.trim(),
    text: content.text.trim(),
    ...range,
  });
}

/** Replies deliberately have no duplicate range anchors; OOXML binds them by parent. */
export function replyToComment(
  state: EditorState,
  parentId: string,
  content: CommentContent,
): EditorState {
  if (!state.document.comments?.items[parentId] || !validContent(content)) {
    return state;
  }
  return appendComment(state, {
    ...content,
    author: content.author.trim(),
    text: content.text.trim(),
    parentId,
  });
}

/** Render a nested discussion in document insertion order without duplicating anchors. */
export function collectCommentThreadReplies(
  comments: Readonly<Record<string, EditorComment>>,
  parentId: string,
): EditorComment[] {
  if (!comments[parentId]) return [];
  const entries = Object.values(comments);
  const visited = new Set<string>([parentId]);
  const replies: EditorComment[] = [];
  const walk = (id: string): void => {
    for (const child of entries) {
      if (child.parentId !== id || visited.has(child.id)) continue;
      visited.add(child.id);
      replies.push(child);
      walk(child.id);
    }
  };
  walk(parentId);
  return replies;
}
