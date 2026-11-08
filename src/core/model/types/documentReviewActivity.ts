/**
 * Local review timeline entries, created on successful comment mutations.
 * These are transaction-scoped editor data and are intentionally not emitted
 * as WordprocessingML. The host can persist/export them separately if needed.
 *
 * The array is deliberately NOT capped: it rides snapshot-based undo/redo, so
 * truncating it here would desynchronize history from the document state and
 * silently drop entries on undo/redo. Long sessions accumulate entries; hosts
 * that need bounded history should persist/rotate it out-of-band.
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
