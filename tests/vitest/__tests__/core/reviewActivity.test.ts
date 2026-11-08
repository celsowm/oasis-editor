import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import { insertCommentAtSelection, replyToComment } from "@/core/commands/commentAuthoring.js";
import { deleteReviewCommentById, setReviewCommentResolvedById } from "@/core/commands/reviewNavigation.js";
import { appendReviewActivity, appendReviewChange, getReviewThreadId } from "@/core/commands/reviewActivity.js";
import { cloneEditorState } from "@/core/cloneState.js";
import {
  applyEditorHistoryTransaction,
  createEmptyEditorHistoryState,
  takeEditorRedoStep,
  takeEditorUndoStep,
} from "@/ui/editorHistory.js";

function fixture() {
  const paragraph = createEditorParagraph("Alpha beta");
  const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
  return {
    state: {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 0),
        focus: paragraphOffsetToPosition(paragraph, 5),
      },
    },
  };
}
const common = { actorName: "Alice", actorId: "alice", timestamp: 1750000000000 };

describe("review activity", () => {
  it("keeps successful comment creation, reply, edit and resolution in the same immutable state", () => {
    const { state } = fixture();
    const created = insertCommentAtSelection(state, {
      id: "root", author: "Alice", authorId: "alice", text: "Please review", date: 1,
    });
    const withActivity = appendReviewChange(state, created, {
      ...common, id: "event-1", kind: "comment-created", commentId: "root",
    });
    expect(state.document.reviewActivity).toBeUndefined();
    expect(withActivity.document.comments?.items.root?.text).toBe("Please review");
    expect(withActivity.document.reviewActivity).toEqual([{
      id: "event-1", kind: "comment-created", commentId: "root", threadId: "root",
      actorName: "Alice", actorId: "alice", targetAuthor: "Alice", timestamp: 1750000000000,
    }]);
    const replied = replyToComment(withActivity, "root", {
      id: "child", author: "Bob", authorId: "bob", text: "Answer", date: 2,
    });
    const withReplyEvent = appendReviewChange(withActivity, replied, {
      ...common, actorName: "Bob", actorId: "bob", id: "event-2",
      kind: "comment-replied", commentId: "child", parentId: "root",
    });
    expect(getReviewThreadId(withReplyEvent, "child")).toBe("root");
    expect(withReplyEvent.document.reviewActivity?.[1]).toMatchObject({
      id: "event-2", kind: "comment-replied", commentId: "child",
      threadId: "root", parentId: "root", actorName: "Bob",
    });
    const resolved = setReviewCommentResolvedById(withReplyEvent, "root", true);
    const withResolved = appendReviewChange(withReplyEvent, resolved, {
      ...common, id: "event-3", kind: "comment-resolved", commentId: "root",
    });
    expect(withResolved.document.reviewActivity?.map(e => e.kind))
      .toEqual(["comment-created", "comment-replied", "comment-resolved"]);
    expect(withActivity.document.reviewActivity).toHaveLength(1);
    expect(cloneEditorState(withResolved).document.reviewActivity)
      .toEqual(withResolved.document.reviewActivity);
  });

  it("keeps deleted authors, thread identity and removed count without storing comment bodies", () => {
    const { state } = fixture();
    const first = insertCommentAtSelection(state, {
      id: "parent", author: "Reviewer", text: "Sensitive body", date: 1,
    });
    const second = replyToComment(first, "parent", {
      id: "reply", author: "Writer", text: "Private answer", date: 2,
    });
    const deleted = deleteReviewCommentById(second, "parent");
    const updated = appendReviewChange(second, deleted, {
      id: "delete-id", kind: "comment-deleted", commentId: "parent",
      actorName: "Moderator", timestamp: 123,
    });
    expect(updated.document.comments?.order).toEqual([]);
    expect(updated.document.reviewActivity?.[0]).toMatchObject({
      kind: "comment-deleted", commentId: "parent", threadId: "parent",
      actorName: "Moderator", targetAuthor: "Reviewer", affectedCount: 2,
    });
    expect(JSON.stringify(updated.document.reviewActivity)).not.toContain("Sensitive body");
    expect(JSON.stringify(updated.document.reviewActivity)).not.toContain("Private answer");
    expect(second.document.reviewActivity).toBeUndefined();
  });

  it("does not create events for no-ops, invalid identifiers or duplicate event ids", () => {
    const { state } = fixture();
    const noOp = appendReviewChange(state, state, {
      ...common, id: "ghost", kind: "comment-edited", commentId: "missing",
    });
    expect(noOp).toBe(state);
    expect(getReviewThreadId(state, "missing")).toBeNull();
    expect(appendReviewActivity(state, {
      id: "", kind: "comment-created", commentId: "x", threadId: "x",
      actorName: "A", targetAuthor: "B", timestamp: 1,
    })).toBe(state);
    const withActivity = appendReviewActivity(state, {
      id: "evt", kind: "comment-created", commentId: "x", threadId: "x",
      actorName: "A", targetAuthor: "B", timestamp: 1,
    });
    expect(appendReviewActivity(withActivity, withActivity.document.reviewActivity![0]!))
      .toBe(withActivity);
  });

  it("rides snapshot undo/redo: undoing a comment edit also removes its activity entry", () => {
    const { state } = fixture();
    const created = insertCommentAtSelection(state, {
      id: "root", author: "Alice", text: "Please review", date: 1,
    });
    const withActivity = appendReviewChange(state, created, {
      ...common, id: "event-1", kind: "comment-created", commentId: "root",
    });
    expect(withActivity.document.reviewActivity).toHaveLength(1);

    // The comment change and its activity are produced in the SAME transaction,
    // so history only ever snapshots the pre-transaction document (no activity).
    const history = applyEditorHistoryTransaction(
      createEmptyEditorHistoryState(), state, withActivity,
    );
    const undone = takeEditorUndoStep(history, withActivity);
    expect(undone).not.toBeNull();
    expect(undone!.nextState.document.reviewActivity).toBeUndefined();
    expect(undone!.nextState.document.comments).toBeUndefined();

    const redone = takeEditorRedoStep(undone!.history, undone!.nextState);
    expect(redone).not.toBeNull();
    expect(redone!.nextState.document.reviewActivity).toEqual([
      expect.objectContaining({ id: "event-1", kind: "comment-created" }),
    ]);
  });
});
