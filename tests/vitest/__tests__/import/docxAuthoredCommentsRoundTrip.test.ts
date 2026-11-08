import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import {
  insertCommentAtSelection,
  editCommentText,
  replyToComment,
} from "@/core/commands/commentAuthoring.js";
import { setSelectedCommentResolved } from "@/core/commands/reviewNavigation.js";
import { appendReviewActivity } from "@/core/commands/reviewActivity.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

describe("author-created DOCX comment round-trip", () => {
  it("preserves a new anchored discussion, threaded reply, author, body and resolved state", async () => {
    const paragraph = createEditorParagraph("Please review this clause.");
    const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
    const selected = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 7),
        focus: paragraphOffsetToPosition(paragraph, 13),
      },
    };
    const withRoot = insertCommentAtSelection(selected, {
      id: "comment:root",
      author: "Reviewer",
      text: "Clarify <scope> & conditions.",
      date: 1760000000000,
    });
    const withReply = replyToComment(withRoot, "comment:root", {
      id: "comment:reply",
      author: "Writer",
      text: "Clarified; thanks!",
      date: 1760000001000,
    });
    const resolved = setSelectedCommentResolved(withReply, true);
    const editedRoot = editCommentText(resolved, "comment:root",
      "Updated <scope> & conditions.");
    const edited = editCommentText(editedRoot, "comment:reply", "Final response!");
    const withActivity = appendReviewActivity(edited, {
      id: "audit1", kind: "comment-edited", commentId: "comment:root",
      threadId: "comment:root", actorName: "Reviewer", targetAuthor: "Reviewer",
      timestamp: 1760000002000,
    });
    expect(withActivity.document.reviewActivity).toHaveLength(1);
    const file = await exportEditorDocumentToDocx(withActivity.document);
    const zip = await JSZip.loadAsync(file);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    const commentsXml = await zip.file("word/comments.xml")!.async("string");
    const extendedXml = await zip.file("word/commentsExtended.xml")!.async("string");
    expect(documentXml).toContain("w:commentRangeStart");
    expect(documentXml).toContain("w:commentRangeEnd");
    expect(commentsXml).toContain("Updated &lt;scope&gt; &amp; conditions.");
    expect(commentsXml).toContain("Final response!");
    expect(extendedXml).toContain("w15:paraIdParent=");
    expect(extendedXml).toContain('w15:done="1"');

    const imported = await importDocxToEditorDocument(file);
    // Activity is editor-local metadata, not an OOXML audit trail.
    expect(imported.reviewActivity).toBeUndefined();
    expect(imported.comments?.order).toHaveLength(2);
    const comments = imported.comments!;
    const original = comments.items[comments.order[0]!]!;
    const answer = comments.items[comments.order[1]!]!;
    expect(original.author).toBe("Reviewer");
    expect(original.text).toBe("Updated <scope> & conditions.");
    expect(original.start?.offset).toBe(7);
    expect(original.end?.offset).toBe(13);
    expect(original.resolved).toBe(true);
    expect(answer.author).toBe("Writer");
    expect(answer.text).toBe("Final response!");
    expect(answer.parentId).toBe(original.id);
    expect(answer.start).toBeUndefined();

    const reexported = await exportEditorDocumentToDocx(imported);
    const reimported = await importDocxToEditorDocument(reexported);
    const entries = reimported.comments!.order.map(
      (id) => reimported.comments!.items[id]!,
    );
    expect(entries[0]?.resolved).toBe(true);
    expect(entries[1]?.parentId).toBe(entries[0]?.id);
    expect(entries[1]?.text).toBe("Final response!");
  });
});
