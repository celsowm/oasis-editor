import { describe, it, expect } from "vitest";
import { DocumentRuntime } from "../core/runtime/DocumentRuntime.js";
import { Operations } from "../core/operations/OperationFactory.js";

describe("DocumentRuntime", () => {
  it("should manage document state", () => {
    const runtime = new DocumentRuntime();
    const initialState = runtime.getState();

    runtime.dispatch(Operations.insertText("Hello"));
    const nextState = runtime.getState();

    expect(nextState.document.revision).toBe(
      initialState.document.revision + 1,
    );
  });

  it("should support undo and redo", () => {
    const runtime = new DocumentRuntime();
    const initialState = runtime.getState();

    runtime.dispatch(Operations.insertText("A"));
    runtime.undo();
    expect(runtime.getState().document.revision).toBe(
      initialState.document.revision,
    );

    runtime.redo();
    expect(runtime.getState().document.revision).toBe(
      initialState.document.revision + 1,
    );
  });

  it("should insert an equation block", () => {
    const runtime = new DocumentRuntime();
    runtime.dispatch(Operations.insertEquation("E = mc^2", true));
    const state = runtime.getState();
    const lastSection = state.document.sections[state.document.sections.length - 1];
    const eqBlock = lastSection.children.find((b) => b.kind === "equation");
    expect(eqBlock).toBeDefined();
    expect(eqBlock!.kind).toBe("equation");
    expect((eqBlock as any).latex).toBe("E = mc^2");
    expect((eqBlock as any).display).toBe(true);
  });

  it("should insert a bookmark at cursor position", () => {
    const runtime = new DocumentRuntime();
    // Append a fresh paragraph
    runtime.dispatch(Operations.appendParagraph("Hello world"));
    const state1 = runtime.getState();
    const sections = state1.document.sections;
    const para = sections[sections.length - 1].children[sections[sections.length - 1].children.length - 1] as any;
    expect(para.children[0].text).toBe("Hello world");

    // Set selection to middle of text
    runtime.dispatch(Operations.setSelection({
      anchor: { sectionId: sections[sections.length - 1].id, blockId: para.id, inlineId: para.children[0].id, offset: 6 },
      focus: { sectionId: sections[sections.length - 1].id, blockId: para.id, inlineId: para.children[0].id, offset: 6 },
    }));

    // Insert bookmark
    runtime.dispatch(Operations.insertBookmark("MyBookmark"));
    const state2 = runtime.getState();
    const para2 = state2.document.sections[sections.length - 1].children[sections[sections.length - 1].children.length - 1] as any;
    expect(para2.children.length).toBe(3);
    expect(para2.children[0].text).toBe("Hello ");
    expect(para2.children[1].bookmarkStart).toBe("MyBookmark");
    expect(para2.children[1].bookmarkEnd).toBe("MyBookmark");
    expect(para2.children[2].text).toBe("world");
  });

  it("should insert a footnote at cursor position", () => {
    const runtime = new DocumentRuntime();
    runtime.dispatch(Operations.appendParagraph("Hello world"));
    const state1 = runtime.getState();
    const sections = state1.document.sections;
    const para = sections[sections.length - 1].children[sections[sections.length - 1].children.length - 1] as any;

    runtime.dispatch(Operations.setSelection({
      anchor: { sectionId: sections[sections.length - 1].id, blockId: para.id, inlineId: para.children[0].id, offset: 6 },
      focus: { sectionId: sections[sections.length - 1].id, blockId: para.id, inlineId: para.children[0].id, offset: 6 },
    }));

    runtime.dispatch(Operations.insertFootnote());
    const state2 = runtime.getState();
    expect(state2.document.footnotes).toBeDefined();
    expect(state2.document.footnotes!.length).toBe(1);
    
    const footnote = state2.document.footnotes![0];
    expect(footnote.id).toContain("footnote");
    expect(footnote.blocks[0].kind).toBe("paragraph");
    expect((footnote.blocks[0] as any).children[0].text).toBe("");
    expect(state2.editingMode).toBe("footnote");
    expect(state2.editingFootnoteId).toBe(footnote.id);
  });

  it("should insert an endnote at cursor position", () => {
    const runtime = new DocumentRuntime();
    runtime.dispatch(Operations.appendParagraph("Hello world"));
    const state1 = runtime.getState();
    const sections = state1.document.sections;
    const para = sections[sections.length - 1].children[sections[sections.length - 1].children.length - 1] as any;

    runtime.dispatch(Operations.setSelection({
      anchor: { sectionId: sections[sections.length - 1].id, blockId: para.id, inlineId: para.children[0].id, offset: 6 },
      focus: { sectionId: sections[sections.length - 1].id, blockId: para.id, inlineId: para.children[0].id, offset: 6 },
    }));

    runtime.dispatch(Operations.insertEndnote());
    const state2 = runtime.getState();
    expect(state2.document.endnotes).toBeDefined();
    expect(state2.document.endnotes!.length).toBe(1);
    expect(state2.document.endnotes![0].id).toContain("endnote");
    expect(state2.document.endnotes![0].blocks[0].kind).toBe("paragraph");
    expect((state2.document.endnotes![0].blocks[0] as any).children[0].text).toBe("");
  });

  it("should insert a comment at cursor position", () => {
    const runtime = new DocumentRuntime();
    runtime.dispatch(Operations.appendParagraph("Hello world"));
    const state1 = runtime.getState();
    const sections = state1.document.sections;
    const para = sections[sections.length - 1].children[sections[sections.length - 1].children.length - 1] as any;

    runtime.dispatch(Operations.setSelection({
      anchor: { sectionId: sections[sections.length - 1].id, blockId: para.id, inlineId: para.children[0].id, offset: 6 },
      focus: { sectionId: sections[sections.length - 1].id, blockId: para.id, inlineId: para.children[0].id, offset: 6 },
    }));

    runtime.dispatch(Operations.insertComment("Comment content"));
    const state2 = runtime.getState();
    const para2 = state2.document.sections[sections.length - 1].children[sections[sections.length - 1].children.length - 1] as any;
    expect(para2.children.length).toBe(3);
    expect(para2.children[0].text).toBe("Hello ");
    
    const commentRun = para2.children[1];
    expect(commentRun.commentId).toBeDefined();
    expect(para2.children[2].text).toBe("world");
    
    expect(state2.document.comments).toBeDefined();
    expect(state2.document.comments!.length).toBe(1);
    const comment = state2.document.comments![0];
    expect(comment.id).toBe(commentRun.commentId);
    expect(comment.author).toBe("Author");
    expect(comment.blocks[0].kind).toBe("paragraph");
    expect((comment.blocks[0] as any).children[0].text).toBe("Comment content");
  });
});
