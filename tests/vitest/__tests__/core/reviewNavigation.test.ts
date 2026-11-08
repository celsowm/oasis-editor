import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getParagraphs,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
  type EditorState,
} from "@/core/model.js";
import {
  collectNavigableComments,
  collectNavigableRevisions,
  deleteSelectedComment,
  getSelectedReviewComment,
  navigateComment,
  navigateRevision,
  setSelectedCommentResolved,
} from "@/core/commands/reviewNavigation.js";

function revisionFixture() {
  const a = createEditorParagraphFromRuns([
    { text: "Normal " },
    { text: "inserted" },
    { text: " gap " },
    { text: "removed" },
  ]);
  a.runs[1]!.revision = {
    id: "insert-1", type: "insert", author: "Editor", date: 100,
  };
  a.runs[3]!.revision = {
    id: "delete-1", type: "delete", author: "Editor", date: 200,
  };
  const b = createEditorParagraphFromRuns([
    { text: "then " },
    { text: "another" },
  ]);
  b.runs[1]!.revision = {
    id: "insert-2", type: "insert", author: "Editor", date: 300,
  };
  const state = createEditorStateFromDocument(createEditorDocument([a, b]));
  return { state, a, b };
}

function select(
  state: EditorState, paragraphId: string, start: number, end = start,
): EditorState {
  const paragraph = getParagraphs(state).find((p) => p.id === paragraphId)!;
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, start),
      focus: paragraphOffsetToPosition(paragraph, end),
    },
  };
}

function selectionOffset(state: EditorState, boundary: "anchor" | "focus") {
  const position = state.selection[boundary];
  const paragraph = getParagraphs(state).find((p) => p.id === position.paragraphId)!;
  return positionToParagraphOffset(paragraph, position);
}

function commentsFixture() {
  const p1 = createEditorParagraph("First comment target");
  const p2 = createEditorParagraph("Second comment target");
  const document = createEditorDocument([p1, p2]);
  document.comments = {
    order: ["first", "reply", "grandchild", "second"],
    items: {
      first: {
        id: "first", author: "Alice", text: "Review first",
        docxIdHint: 17,
        start: { paragraphId: p1.id, offset: 0 },
        end: { paragraphId: p1.id, offset: 5 },
      },
      reply: {
        id: "reply", parentId: "first", author: "Bob", text: "Reply",
      },
      grandchild: {
        id: "grandchild", parentId: "reply", author: "Alice", text: "Nested",
      },
      second: {
        id: "second", author: "Carol", text: "Review second",
        resolved: true,
        start: { paragraphId: p2.id, offset: 0 },
        end: { paragraphId: p2.id, offset: 6 },
      },
    },
  };
  return { state: createEditorStateFromDocument(document), p1, p2 };
}

describe("Review change navigation", () => {
  it("navigates in text order, skips the current selection and wraps", () => {
    const { state, a, b } = revisionFixture();
    expect(collectNavigableRevisions(state).map((r) => r.id)).toEqual([
      "insert-1", "delete-1", "insert-2",
    ]);
    const start = select(state, a.id, 0);
    const first = navigateRevision(start, "next");
    expect(first.selection.anchor.paragraphId).toBe(a.id);
    expect(selectionOffset(first, "anchor")).toBe(7);
    expect(selectionOffset(first, "focus")).toBe(15);
    expect(first.document).toBe(start.document);

    const second = navigateRevision(first, "next");
    expect(selectionOffset(second, "anchor")).toBe(20);
    const third = navigateRevision(second, "next");
    expect(third.selection.anchor.paragraphId).toBe(b.id);
    expect(selectionOffset(third, "anchor")).toBe(5);
    const wrapped = navigateRevision(third, "next");
    expect(wrapped.selection.anchor.paragraphId).toBe(a.id);
    expect(selectionOffset(wrapped, "anchor")).toBe(7);
    const previous = navigateRevision(third, "previous");
    expect(previous.selection.anchor.paragraphId).toBe(a.id);
    expect(selectionOffset(previous, "anchor")).toBe(20);
  });

  it("never changes a document without tracked revisions", () => {
    const p = createEditorParagraph("No revisions");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(collectNavigableRevisions(state)).toEqual([]);
    expect(navigateRevision(state, "next")).toBe(state);
    expect(navigateRevision(state, "previous")).toBe(state);
  });
});

describe("Review comment navigation and management", () => {
  it("skips unanchored replies, navigates anchors and wraps", () => {
    const { state, p1, p2 } = commentsFixture();
    expect(collectNavigableComments(state)).toEqual(["first", "second"]);
    const first = navigateComment(select(state, p1.id, 0), "next");
    expect(first.selection.anchor.paragraphId).toBe(p2.id);
    expect(selectionOffset(first, "focus")).toBe(6);
    expect(first.document).toBe(state.document);
    const previous = navigateComment(first, "previous");
    expect(previous.selection.anchor.paragraphId).toBe(p1.id);
    const wrap = navigateComment(previous, "previous");
    expect(wrap.selection.anchor.paragraphId).toBe(p2.id);
  });

  it("resolves and reopens only the selected thread, with immutable metadata", () => {
    const { state, p1 } = commentsFixture();
    const selected = select(state, p1.id, 0, 5);
    expect(getSelectedReviewComment(selected)?.id).toBe("first");
    const resolved = setSelectedCommentResolved(selected, true);
    expect(resolved.document).not.toBe(state.document);
    expect(resolved.document.comments?.items.first?.resolved).toBe(true);
    expect(resolved.document.comments?.items.first?.docxIdHint).toBe(17);
    expect(resolved.document.comments?.items.second?.resolved).toBe(true);
    expect(selected.document.comments?.items.first?.resolved).toBeUndefined();
    expect(setSelectedCommentResolved(resolved, true)).toBe(resolved);
    const reopened = setSelectedCommentResolved(resolved, false);
    expect(reopened.document.comments?.items.first?.resolved).toBe(false);
    expect(reopened.document.comments?.items.second?.resolved).toBe(true);
  });

  it("deleting a comment removes its replies and descendants, not other threads", () => {
    const { state, p1 } = commentsFixture();
    const selected = select(state, p1.id, 0, 5);
    const deleted = deleteSelectedComment(selected);
    expect(deleted.document.comments?.order).toEqual(["second"]);
    expect(Object.keys(deleted.document.comments?.items ?? {})).toEqual(["second"]);
    expect(state.document.comments?.order).toHaveLength(4);
    expect(deleteSelectedComment(deleted)).toBe(deleted);
  });

  it("does not alter anything if no comment is under the selection", () => {
    const { state, p1 } = commentsFixture();
    const outside = select(state, p1.id, 10);
    expect(getSelectedReviewComment(outside)).toBeNull();
    expect(setSelectedCommentResolved(outside, true)).toBe(outside);
    expect(deleteSelectedComment(outside)).toBe(outside);
  });
});
