import { describe, it, expect } from "vitest";
import {
  createEditorParagraph,
  createEditorDocument,
  createEditorStateFromTexts,
  createEditorStateFromParagraphRuns,
  createEditorStateFromDocument,
  createInitialEditorState,
  DEFAULT_EDITOR_STYLES,
} from "@/core/editorState.js";
import { DEFAULT_EDITOR_PAGE_SETTINGS } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";

// ---------------------------------------------------------------------------
// createEditorParagraph
// ---------------------------------------------------------------------------

describe("createEditorParagraph", () => {
  it("creates paragraph with a unique prefixed id", () => {
    const p1 = createEditorParagraph("hello");
    const p2 = createEditorParagraph("world");
    expect(p1.id).toMatch(/^paragraph:/);
    expect(p2.id).toMatch(/^paragraph:/);
    expect(p1.id).not.toBe(p2.id);
  });

  it("creates a single run with the given text", () => {
    const p = createEditorParagraph("hello");
    expect(p.runs).toHaveLength(1);
    expect(p.runs[0].text).toBe("hello");
  });

  it("creates empty paragraph by default", () => {
    const p = createEditorParagraph();
    expect(p.runs[0].text).toBe("");
  });
});

// ---------------------------------------------------------------------------
// createEditorDocument
// ---------------------------------------------------------------------------

describe("createEditorDocument", () => {
  it("applies default styles when not provided", () => {
    const p = createEditorParagraph("");
    const doc = createEditorDocument([p]);
    expect(doc.styles).toEqual(DEFAULT_EDITOR_STYLES);
  });

  it("applies default page settings", () => {
    const p = createEditorParagraph("");
    const doc = createEditorDocument([p]);
    expect(doc.pageSettings).toBeDefined();
    expect(doc.pageSettings!.width).toBe(816);
    expect(doc.pageSettings!.height).toBe(1056);
  });

  it("stores provided blocks", () => {
    const p1 = createEditorParagraph("a");
    const p2 = createEditorParagraph("b");
    const doc = createEditorDocument([p1, p2]);
    expect(doc.sections?.[0]?.blocks).toHaveLength(2);
  });

  it("carries custom metadata", () => {
    const p = createEditorParagraph("");
    const doc = createEditorDocument([p], undefined, undefined, undefined, {
      title: "My Doc",
    });
    expect(doc.metadata?.title).toBe("My Doc");
  });
});

// ---------------------------------------------------------------------------
// createEditorStateFromTexts
// ---------------------------------------------------------------------------

describe("createEditorStateFromTexts", () => {
  it("creates state with correct number of paragraphs", () => {
    const state = createEditorStateFromTexts(["hello", "world", "foo"]);
    const paragraphs = getParagraphs(state);
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0].runs[0].text).toBe("hello");
    expect(paragraphs[2].runs[0].text).toBe("foo");
  });

  it("positions selection at start by default", () => {
    const state = createEditorStateFromTexts(["hello"]);
    expect(state.selection.anchor.offset).toBe(0);
    expect(state.selection.focus.offset).toBe(0);
  });

  it("positions selection at given block and offset", () => {
    const state = createEditorStateFromTexts(["hello", "world"], {
      blockIndex: 1,
      offset: 3,
    });
    const paragraphs = getParagraphs(state);
    expect(state.selection.focus.paragraphId).toBe(paragraphs[1].id);
    expect(state.selection.focus.offset).toBe(3);
  });

  it("creates single empty paragraph for empty array", () => {
    const state = createEditorStateFromTexts([]);
    const paragraphs = getParagraphs(state);
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].runs[0].text).toBe("");
  });
});

// ---------------------------------------------------------------------------
// createInitialEditorState
// ---------------------------------------------------------------------------

describe("createInitialEditorState", () => {
  it("starts with one empty paragraph", () => {
    const state = createInitialEditorState();
    const paragraphs = getParagraphs(state);
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].runs[0].text).toBe("");
  });

  it("positions caret at offset 0", () => {
    const state = createInitialEditorState();
    expect(state.selection.anchor.offset).toBe(0);
  });

  it("active zone is main by default", () => {
    const state = createInitialEditorState();
    expect(state.activeZone).toBe("main");
  });
});

// ---------------------------------------------------------------------------
// createEditorStateFromDocument
// ---------------------------------------------------------------------------

describe("createEditorStateFromDocument", () => {
  it("starts in main zone when sections exist and main has content", () => {
    const mainParagraph = createEditorParagraph("main");
    const headerParagraph = createEditorParagraph("header");
    const doc = {
      id: "doc:1",
      sections: [
        {
          id: "section:1",
          pageSettings: DEFAULT_EDITOR_PAGE_SETTINGS,
          blocks: [mainParagraph],
          header: [headerParagraph],
        },
      ],
    };

    const state = createEditorStateFromDocument(doc as any);
    expect(state.activeZone).toBe("main");
    expect(state.selection.anchor.paragraphId).toBe(mainParagraph.id);
    expect(state.selection.focus.paragraphId).toBe(mainParagraph.id);
  });

  it("falls back to header zone when main is empty", () => {
    const headerParagraph = createEditorParagraph("header only");
    const doc = {
      id: "doc:1",
      sections: [
        {
          id: "section:1",
          pageSettings: DEFAULT_EDITOR_PAGE_SETTINGS,
          blocks: [],
          header: [headerParagraph],
        },
      ],
    };

    const state = createEditorStateFromDocument(doc as any);
    expect(state.activeZone).toBe("header");
    expect(state.selection.focus.paragraphId).toBe(headerParagraph.id);
  });
});

// ---------------------------------------------------------------------------
// createEditorStateFromParagraphRuns
// ---------------------------------------------------------------------------

describe("createEditorStateFromParagraphRuns", () => {
  it("creates multi-run paragraphs", () => {
    const state = createEditorStateFromParagraphRuns([
      [{ text: "Hello ", styles: { bold: true } }, { text: "world" }],
    ]);
    const paragraphs = getParagraphs(state);
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].runs).toHaveLength(2);
    expect(paragraphs[0].runs[0].styles?.bold).toBe(true);
  });

  it("positions anchor and focus independently", () => {
    const state = createEditorStateFromParagraphRuns(
      [[{ text: "Hello" }], [{ text: "World" }]],
      {
        anchor: { blockIndex: 0, offset: 2 },
        focus: { blockIndex: 1, offset: 3 },
      },
    );
    const paragraphs = getParagraphs(state);
    expect(state.selection.anchor.paragraphId).toBe(paragraphs[0].id);
    expect(state.selection.anchor.offset).toBe(2);
    expect(state.selection.focus.paragraphId).toBe(paragraphs[1].id);
    expect(state.selection.focus.offset).toBe(3);
  });
});
