import { describe, expect, it, vi } from "vitest";
import { createRoot } from "solid-js";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { paragraphOffsetToPosition, type EditorState } from "@/core/model.js";
import { createEditorCommentComposer } from "@/ui/app/createEditorCommentComposer.js";

function harness() {
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
