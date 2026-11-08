import type {
  EditorReviewActivity,
  EditorReviewActivityKind,
  EditorState,
} from "@/core/model.js";

/** Only successful comment operations append a record; no UI-side logging. */
export function appendReviewActivity(
  state: EditorState,
  activity: EditorReviewActivity,
): EditorState {
  if (
    !activity.id.trim() ||
    !activity.commentId.trim() ||
    !activity.threadId.trim() ||
    !activity.actorName.trim() ||
    !Number.isFinite(activity.timestamp)
  )
    return state;
  const entries = state.document.reviewActivity ?? [];
  if (entries.some((entry) => entry.id === activity.id)) return state;
  return {
    ...state,
    document: {
      ...state.document,
      reviewActivity: [...entries, { ...activity }],
    },
  };
}

/** Resolves thread identity safely for arbitrarily nested or cyclic replies. */
export function getReviewThreadId(
  state: EditorState,
  commentId: string,
): string | null {
  const items = state.document.comments?.items;
  if (!items?.[commentId]) return null;
  const visited = new Set<string>();
  let id = commentId;
  while (items[id]?.parentId && !visited.has(id)) {
    visited.add(id);
    const parentId: string = items[id]!.parentId!;
    if (!items[parentId]) break;
    id = parentId;
  }
  return id;
}

/** Append in the same undoable transaction as the changed comment. */
export function appendReviewChange(
  before: EditorState,
  after: EditorState,
  detail: {
    id: string;
    kind: EditorReviewActivityKind;
    commentId: string;
    actorName: string;
    actorId?: string;
    timestamp: number;
    parentId?: string;
  },
): EditorState {
  if (after.document === before.document) return before;
  const target =
    before.document.comments?.items[detail.commentId] ??
    after.document.comments?.items[detail.commentId];
  if (!target) return after;
  const threadId =
    getReviewThreadId(before, detail.commentId) ??
    getReviewThreadId(after, detail.commentId) ??
    detail.commentId;
  const previousCount = before.document.comments?.order.length ?? 0;
  const nextCount = after.document.comments?.order.length ?? 0;
  return appendReviewActivity(after, {
    id: detail.id,
    kind: detail.kind,
    commentId: detail.commentId,
    threadId,
    ...(detail.parentId ? { parentId: detail.parentId } : {}),
    actorName: detail.actorName,
    ...(detail.actorId ? { actorId: detail.actorId } : {}),
    targetAuthor: target.author,
    timestamp: detail.timestamp,
    ...(detail.kind === "comment-deleted"
      ? { affectedCount: Math.max(1, previousCount - nextCount) }
      : {}),
  });
}
