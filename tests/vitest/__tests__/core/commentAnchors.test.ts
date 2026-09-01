import { describe, expect, it } from "vitest";
import type { EditorComment, EditorState } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { createEditorStateFromTexts } from "@/core/editorState.js";
import {
  insertPlainTextAtSelection,
  insertTextAtSelection,
} from "@/core/commands/text.js";

function withComments(
  state: EditorState,
  comments: EditorComment[],
): EditorState {
  return {
    ...state,
    document: {
      ...state.document,
      comments: {
        order: comments.map((comment) => comment.id),
        items: Object.fromEntries(
          comments.map((comment) => [comment.id, comment]),
        ),
      },
    },
  };
}

describe("live comment anchors", () => {
  it("shifts comment anchors when text is inserted before the range", () => {
    let state = createEditorStateFromTexts(["abcd"], { offset: 0 });
    const paragraph = getParagraphs(state)[0]!;
    state = withComments(state, [
      {
        id: "comment:root",
        author: "A",
        text: "Review",
        start: { paragraphId: paragraph.id, offset: 1 },
        end: { paragraphId: paragraph.id, offset: 3 },
      },
    ]);

    const next = insertTextAtSelection(state, "X");
    const comment = next.document.comments!.items["comment:root"]!;
    expect(comment.start).toMatchObject({
      paragraphId: paragraph.id,
      offset: 2,
    });
    expect(comment.end).toMatchObject({
      paragraphId: paragraph.id,
      offset: 4,
    });
  });

  it("moves the trailing anchor to the new paragraph on split", () => {
    let state = createEditorStateFromTexts(["abcd"], { offset: 2 });
    const paragraph = getParagraphs(state)[0]!;
    state = withComments(state, [
      {
        id: "comment:root",
        author: "A",
        text: "Review",
        start: { paragraphId: paragraph.id, offset: 1 },
        end: { paragraphId: paragraph.id, offset: 3 },
      },
    ]);

    const next = insertPlainTextAtSelection(state, "\n");
    const paragraphs = getParagraphs(next);
    expect(paragraphs).toHaveLength(2);
    const comment = next.document.comments!.items["comment:root"]!;
    expect(comment.start).toMatchObject({
      paragraphId: paragraphs[0]!.id,
      offset: 1,
    });
    expect(comment.end).toMatchObject({
      paragraphId: paragraphs[1]!.id,
      offset: 1,
    });
  });

  it("preserves body-only replies while an anchored parent moves", () => {
    let state = createEditorStateFromTexts(["abcd"], { offset: 0 });
    const paragraph = getParagraphs(state)[0]!;
    const root: EditorComment = {
      id: "comment:root",
      author: "A",
      text: "Root",
      start: { paragraphId: paragraph.id, offset: 1 },
      end: { paragraphId: paragraph.id, offset: 3 },
    };
    const reply: EditorComment = {
      id: "comment:reply",
      parentId: root.id,
      author: "B",
      text: "Reply",
    };
    state = withComments(state, [root, reply]);

    const next = insertTextAtSelection(state, "X");
    const comments = next.document.comments!;
    expect(comments.items[reply.id]).toBe(reply);
    expect(comments.items[reply.id]!.parentId).toBe(root.id);
    expect(comments.items[root.id]!.start?.offset).toBe(2);
  });
});
