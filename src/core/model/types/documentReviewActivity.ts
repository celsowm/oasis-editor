/**
 * Local review timeline entries, created on successful comment mutations.
 * These are transaction-scoped editor data and are intentionally not emitted
 * as WordprocessingML. The host can persist/export them separately if needed.
 */
export type EditorReviewActivityKind =
  | "comment-created"
  | "comment-replied"
  | "comment-edited"
  | "comment-resolved"
  | "comment-reopened"
  | "comment-deleted";

export interface EditorReviewActivity {
  id: string;
  kind: EditorReviewActivityKind;
  commentId: string;
  /** Immediate parent when a reply is created. */
  parentId?: string;
  /** Stable root discussion id, even if subsequently removed. */
  threadId: string;
  actorName: string;
  actorId?: string;
  /** Snapshot label survives deletion without copying the comment body. */
  targetAuthor: string;
  timestamp: number;
  /** Number of comments deleted with the selected subtree. */
  affectedCount?: number;
}
