import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import {
  collectCommentThreadReplies,
  editCommentText,
  getCommentRangeForSelection,
  insertCommentAtSelection,
  replyToComment,
} from "@/core/commands/commentAuthoring.js";
import {
  deleteSelectedComment,
  getSelectedReviewComment,
  setSelectedCommentResolved,
} from "@/core/commands/reviewNavigation.js";
import {
  buildCommentExportPlan,
  buildCommentsExtendedPartXml,
  buildCommentsPartXml,
} from "@/export/docx/commentsXml.js";

function fixture() {
  const paragraph = createEditorParagraph("alpha beta gamma");
  const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
  const select = (start: number, end = start) => ({
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, start),
      focus: paragraphOffsetToPosition(paragraph, end),
    },
  });
  return { paragraph, state, select };
}

const root = {
  id: "comment:test-root",
  author: "Alice",
  text: "Review <this> & that",
  date: 1760000000000,
};
const reply = {
  id: "comment:test-reply",
  author: "Bob",
  text: "Acknowledged",
  date: 1760000001000,
};

describe("document comment authoring", () => {
  it("anchors a comment to the selection without changing document text", () => {
    const { state, select, paragraph } = fixture();
    const withComment = insertCommentAtSelection(select(0, 5), root);
    expect(withComment).not.toBe(state);
    expect(withComment.document.comments?.order).toEqual([root.id]);
    expect(withComment.document.comments?.items[root.id]).toMatchObject({
      author: root.author,
      text: root.text,
      start: { paragraphId: paragraph.id, offset: 0 },
      end: { paragraphId: paragraph.id, offset: 5 },
    });
    expect(state.document.comments).toBeUndefined();
    expect(withComment.document.sections?.[0]?.blocks).toBe(state.document.sections?.[0]?.blocks);
  });

  it("extends a caret to the word under it; blank text is not annotatable", () => {
    const { select, paragraph } = fixture();
    const range = getCommentRangeForSelection(select(7));
    expect(range).toEqual({
      start: { paragraphId: paragraph.id, offset: 6 },
      end: { paragraphId: paragraph.id, offset: 10 },
    });
    const empty = createEditorStateFromDocument(
      createEditorDocument([createEditorParagraph("")]),
    );
    expect(getCommentRangeForSelection(empty)).toBeNull();
    expect(insertCommentAtSelection(empty, root)).toBe(empty);
  });

  it("projects nested replies in order and protects against cyclic parent ids", () => {
    const { select } = fixture();
    const anchored = insertCommentAtSelection(select(0, 5), root);
    const first = replyToComment(anchored, root.id, reply);
    const second = replyToComment(first, reply.id, {
      id: "comment:grandchild",
      author: "Carol",
      text: "A nested answer",
      date: 1760000002000,
    });
    const registry = second.document.comments!;
    expect(collectCommentThreadReplies(registry.items, root.id).map((x) => x.id))
      .toEqual([reply.id, "comment:grandchild"]);
    expect(collectCommentThreadReplies(registry.items, "unknown")).toEqual([]);
    registry.items[root.id]!.parentId = "comment:grandchild";
    expect(collectCommentThreadReplies(registry.items, root.id).map((x) => x.id))
      .toEqual([reply.id, "comment:grandchild"]);
  });

  it("edits an existing root or reply without changing authors, anchors, dates or thread links", () => {
    const { select } = fixture();
    const selected = select(0, 5);
    const first = insertCommentAtSelection(selected, root);
    const threaded = replyToComment(first, root.id, reply);
    const edited = editCommentText(threaded, root.id, "  Updated <root> & details  ");
    expect(edited.document.comments?.items[root.id]).toMatchObject({
      id: root.id,
      text: "Updated <root> & details",
      author: root.author,
      date: root.date,
      start: { offset: 0 },
      end: { offset: 5 },
    });
    const editReply = editCommentText(edited, reply.id, "  Updated answer  ");
    expect(editReply.document.comments?.items[reply.id]).toMatchObject({
      text: "Updated answer", author: reply.author, date: reply.date,
      parentId: root.id,
    });
    expect(editReply.document.comments?.order).toEqual([root.id, reply.id]);
    expect(threaded.document.comments?.items[root.id]?.text).toBe(root.text);
    expect(editCommentText(edited, root.id, "Updated <root> & details")).toBe(edited);
    expect(editCommentText(edited, root.id, "    ")).toBe(edited);
    expect(editCommentText(edited, "unknown", "Anything")).toBe(edited);
    const xml = buildCommentsPartXml(buildCommentExportPlan(editReply.document)!);
    expect(xml).toContain("Updated &lt;root&gt; &amp; details");
    expect(xml).toContain("Updated answer");
  });

  it("handles very deep reply chains iteratively, without recursive stack growth", () => {
    const items: Record<string, {
      id: string; author: string; text: string; parentId?: string;
    }> = { root: { id: "root", author: "A", text: "Root" } };
    for (let i = 0; i < 1500; i += 1) {
      const id = `reply-${i}`;
      items[id] = {
        id, author: "A", text: "Answer",
        parentId: i === 0 ? "root" : `reply-${i - 1}`,
      };
    }
    const results = collectCommentThreadReplies(items, "root");
    expect(results).toHaveLength(1500);
    expect(results[0]?.id).toBe("reply-0");
    expect(results[1499]?.id).toBe("reply-1499");
  });

  it("rejects empty authors/bodies and duplicate ids", () => {
    const { select } = fixture();
    const chosen = select(0, 5);
    expect(insertCommentAtSelection(chosen, { ...root, author: "  " })).toBe(chosen);
    expect(insertCommentAtSelection(chosen, { ...root, text: "  " })).toBe(chosen);
    const first = insertCommentAtSelection(chosen, root);
    expect(insertCommentAtSelection(first, root)).toBe(first);
    expect(replyToComment(first, "missing", reply)).toBe(first);
  });

  it("creates a thread reply and exports its relationship and escaped bodies to DOCX", () => {
    const { select } = fixture();
    const anchored = insertCommentAtSelection(select(0, 5), root);
    const threaded = replyToComment(anchored, root.id, reply);
    expect(threaded.document.comments?.order).toEqual([root.id, reply.id]);
    const answer = threaded.document.comments?.items[reply.id];
    expect(answer).toMatchObject({ parentId: root.id, author: "Bob", text: "Acknowledged" });
    expect(answer?.start).toBeUndefined();
    expect(answer?.end).toBeUndefined();
    const plan = buildCommentExportPlan(threaded.document)!;
    const bodyXml = buildCommentsPartXml(plan);
    const extendedXml = buildCommentsExtendedPartXml(plan);
    expect(bodyXml).toContain("Review &lt;this&gt; &amp; that");
    expect(bodyXml).toContain("Acknowledged");
    expect(extendedXml).toContain("w15:paraIdParent=");
    expect(extendedXml.match(/<w15:commentEx /g)).toHaveLength(2);
    expect(getSelectedReviewComment(threaded)?.id).toBe(root.id);
    const resolved = setSelectedCommentResolved(threaded, true);
    const resolvedXml = buildCommentsExtendedPartXml(buildCommentExportPlan(resolved.document)!);
    expect(resolvedXml).toContain('w15:done="1"');
    const deleted = deleteSelectedComment(threaded);
    expect(deleted.document.comments?.order).toEqual([]);
    expect(Object.keys(deleted.document.comments?.items ?? {})).toEqual([]);
    expect(anchored.document.comments?.order).toEqual([root.id]);
  });
});
