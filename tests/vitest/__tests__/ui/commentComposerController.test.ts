import { describe, expect, it, vi } from "vitest";
import { createRoot } from "solid-js";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { paragraphOffsetToPosition, type EditorState } from "@/core/model.js";
import { createEditorCommentComposer } from "@/ui/app/createEditorCommentComposer.js";
import type { OasisReviewAccess } from "@/core/commands/commentPermissions.js";

function harness(initialAccess?: OasisReviewAccess) {
  const paragraph = createEditorParagraph("first second");
  let state: EditorState = createEditorStateFromDocument(createEditorDocument([paragraph]));
  state = {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, 5),
    },
  };
  let readOnly = false;
  let reviewAccess = initialAccess;
  let transactions = 0;
  const focusInput = vi.fn();
  const composer = createEditorCommentComposer({
    state: () => state,
    isReadOnly: () => readOnly,
    applyTransactionalState: (producer) => {
      const next = producer(state);
      if (next.document !== state.document) transactions += 1;
      state = next;
    },
    focusInput,
    access: () => reviewAccess,
  });
  return {
    composer,
    focusInput,
    get state() { return state; },
    get transactions() { return transactions; },
    select: (start: number, end: number) => {
      state = {
        ...state,
        selection: {
          anchor: paragraphOffsetToPosition(paragraph, start),
          focus: paragraphOffsetToPosition(paragraph, end),
        },
      };
    },
    setReadOnly: (value: boolean) => { readOnly = value; },
    setAccess: (value: OasisReviewAccess | undefined) => { reviewAccess = value; },
    replaceDocument: () => {
      state = createEditorStateFromDocument(
        createEditorDocument([createEditorParagraph("replacement")]),
      );
    },
  };
}

describe("per-editor comment composer", () => {
  it("captures the selection before modal focus and submits one undoable change", () => {
    createRoot((dispose) => {
      const app = harness();
      expect(app.composer.canCreate()).toBe(true);
      expect(app.composer.openNew()).toBe(true);
      app.select(6, 12);
      expect(app.composer.submit("  Alice  ", "  Please clarify. ")).toBe(true);
      expect(app.transactions).toBe(1);
      const id = app.state.document.comments?.order[0];
      expect(id).toBeTruthy();
      expect(app.state.document.comments?.items[id!]).toMatchObject({
        author: "Alice",
        text: "Please clarify.",
        start: { offset: 0 },
        end: { offset: 5 },
      });
      expect(app.composer.lastAuthor()).toBe("Alice");
      expect(app.composer.draft()).toBeNull();
      expect(app.focusInput).toHaveBeenCalledOnce();
      dispose();
    });
  });

  it("creates a reply to the comment selected when the dialog opened", () => {
    createRoot((dispose) => {
      const app = harness();
      app.composer.openNew();
      app.composer.submit("Alice", "First");
      app.select(0, 5);
      expect(app.composer.canReply()).toBe(true);
      expect(app.composer.openReply()).toBe(true);
      const parentId = app.composer.draft()?.parentId;
      expect(parentId).toBeTruthy();
      app.select(6, 12);
      expect(app.composer.submit("Bob", "Answer")).toBe(true);
      const ids = app.state.document.comments?.order ?? [];
      expect(ids).toHaveLength(2);
      expect(app.state.document.comments?.items[ids[1]!]?.parentId).toBe(parentId);
      expect(app.transactions).toBe(2);
      dispose();
    });
  });

  it("replies to a highlighted thread by id even when it is not selected", () => {
    createRoot((dispose) => {
      const app = harness();
      app.composer.openNew();
      app.composer.submit("Alice", "Original");
      const rootId = app.state.document.comments!.order[0]!;
      app.select(6, 12);
      expect(app.composer.canReply()).toBe(false);
      expect(app.composer.openReplyToId(rootId)).toBe(true);
      expect(app.composer.draft()?.parentId).toBe(rootId);
      expect(app.composer.submit("Bob", "Reply from popup")).toBe(true);
      const comments = app.state.document.comments!;
      const replyId = comments.order[1]!;
      expect(comments.items[replyId]?.parentId).toBe(rootId);
      expect(app.composer.openReplyToId("not-a-comment")).toBe(false);
      dispose();
    });
  });

  it("edits a selected comment, preserving its identity and creation author", () => {
    createRoot((dispose) => {
      const app = harness();
      app.composer.openNew();
      app.composer.submit("Alice", "Initial text");
      const id = app.state.document.comments!.order[0]!;
      const before = app.state.document.comments!.items[id]!;
      app.select(0, 5);
      expect(app.composer.canEdit()).toBe(true);
      expect(app.composer.openEdit()).toBe(true);
      expect(app.composer.draft()).toMatchObject({
        mode: "edit", commentId: id, commentAuthor: "Alice",
        commentText: "Initial text",
      });
      app.select(6, 12);
      expect(app.composer.submit("Impostor", "  Corrected text  ")).toBe(true);
      const after = app.state.document.comments!.items[id]!;
      expect(after.text).toBe("Corrected text");
      expect(after.author).toBe(before.author);
      expect(after.date).toBe(before.date);
      expect(after.start).toEqual(before.start);
      expect(after.end).toEqual(before.end);
      expect(app.transactions).toBe(2);
      expect(app.composer.lastAuthor()).toBe("Alice");
      dispose();
    });
  });

  it("edits a reply by id and closes an unchanged draft without an extra undo entry", () => {
    createRoot((dispose) => {
      const app = harness();
      app.composer.openNew();
      app.composer.submit("Alice", "Root");
      const rootId = app.state.document.comments!.order[0]!;
      app.composer.openReplyToId(rootId);
      app.composer.submit("Bob", "Response");
      const replyId = app.state.document.comments!.order[1]!;
      app.select(6, 12);
      expect(app.composer.openEditToId(replyId)).toBe(true);
      expect(app.composer.draft()?.commentText).toBe("Response");
      expect(app.composer.submit("Any name", "Updated reply")).toBe(true);
      expect(app.state.document.comments!.items[replyId]).toMatchObject({
        text: "Updated reply", author: "Bob", parentId: rootId,
      });
      const count = app.transactions;
      expect(app.composer.openEditToId(replyId)).toBe(true);
      expect(app.composer.submit("Any name", "Updated reply")).toBe(true);
      expect(app.transactions).toBe(count);
      expect(app.composer.draft()).toBeNull();
      dispose();
    });
  });

  it("disallows stale edits and editing in read-only mode", () => {
    createRoot((dispose) => {
      const app = harness();
      app.composer.openNew();
      app.composer.submit("Alice", "Original");
      const id = app.state.document.comments!.order[0]!;
      app.setReadOnly(true);
      expect(app.composer.openEditToId(id)).toBe(false);
      app.setReadOnly(false);
      expect(app.composer.openEditToId(id)).toBe(true);
      app.replaceDocument();
      expect(app.composer.submit("Alice", "Stale update")).toBe(false);
      expect(app.state.document.comments).toBeUndefined();
      dispose();
    });
  });

  it("uses host actor identity and prevents edits from a different user", () => {
    createRoot((dispose) => {
      const alice = { identity: { id: "user-a", displayName: "Alice" } };
      const bob = { identity: { id: "user-b", displayName: "Bob" } };
      const app = harness(alice);
      expect(app.composer.authorLocked()).toBe(true);
      expect(app.composer.authorName()).toBe("Alice");
      expect(app.composer.openNew()).toBe(true);
      // Host display name wins over a caller-supplied impersonation.
      expect(app.composer.submit("Impostor", "A comment")).toBe(true);
      const id = app.state.document.comments!.order[0]!;
      expect(app.state.document.comments!.items[id]).toMatchObject({
        author: "Alice", authorId: "user-a",
      });
      app.setAccess(bob);
      app.select(0, 5);
      expect(app.composer.canEdit()).toBe(false);
      expect(app.composer.openEditToId(id)).toBe(false);
      expect(app.composer.canDeleteId(id)).toBe(false);
      expect(app.composer.deleteById(id)).toBe(false);
      expect(app.composer.canResolveId(id)).toBe(false);
      expect(app.state.document.comments!.order).toHaveLength(1);
      app.setAccess({ identity: { id: "admin", displayName: "Mod" }, canModerate: true });
      expect(app.composer.canEditId(id)).toBe(true);
      expect(app.composer.openEditToId(id)).toBe(true);
      expect(app.composer.submit("Mod", "Moderated")).toBe(true);
      expect(app.state.document.comments!.items[id]?.author).toBe("Alice");
      expect(app.state.document.comments!.items[id]?.text).toBe("Moderated");
      dispose();
    });
  });

  it("refuses changes if review permissions change while editing", () => {
    createRoot((dispose) => {
      const app = harness({ identity: { id: "alice", displayName: "Alice" } });
      app.composer.openNew();
      app.composer.submit("", "Original");
      const id = app.state.document.comments!.order[0]!;
      app.composer.openEditToId(id);
      const tx = app.transactions;
      app.setAccess({ identity: { id: "bob", displayName: "Bob" } });
      expect(app.composer.submit("Alice", "Should not save")).toBe(false);
      expect(app.transactions).toBe(tx);
      expect(app.state.document.comments!.items[id]?.text).toBe("Original");
      dispose();
    });
  });

  it("denies writes when read-only or the document changed while the dialog was open", () => {
    createRoot((dispose) => {
      const app = harness();
      app.setReadOnly(true);
      expect(app.composer.openNew()).toBe(false);
      app.setReadOnly(false);
      expect(app.composer.openNew()).toBe(true);
      app.replaceDocument();
      expect(app.composer.submit("Alice", "Outdated comment")).toBe(false);
      expect(app.transactions).toBe(0);
      expect(app.state.document.comments).toBeUndefined();
      app.composer.close();
      dispose();
    });
  });

  it("does not share drafts between two editor instances", () => {
    createRoot((dispose) => {
      const first = harness();
      const second = harness();
      first.composer.openNew();
      expect(first.composer.draft()?.mode).toBe("new");
      expect(second.composer.draft()).toBeNull();
      expect(second.composer.lastAuthor()).toBe("");
      first.composer.close();
      dispose();
    });
  });
});
