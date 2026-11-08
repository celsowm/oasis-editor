import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { paragraphOffsetToPosition, type EditorSection } from "@/core/model.js";
import {
  clearHeaderFooterStory,
  editHeaderFooter,
  enableHeaderFooterStory,
  exitHeaderFooter,
  getHeaderFooterStoryKey,
  insertPageNumber,
} from "@/core/commands/headerFooter.js";

function fixture() {
  const paragraph = createEditorParagraph("Body text");
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  return {
    state: {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 2),
        focus: paragraphOffsetToPosition(paragraph, 2),
      },
    },
  };
}

function section(state: { document: { sections?: EditorSection[] } }): EditorSection {
  return state.document.sections![0]!;
}

describe("header/footer story authoring", () => {
  it("maps side/kind pairs onto the correct section story fields", () => {
    expect(getHeaderFooterStoryKey("header", "default")).toBe("header");
    expect(getHeaderFooterStoryKey("header", "firstPage")).toBe("firstPageHeader");
    expect(getHeaderFooterStoryKey("header", "evenPage")).toBe("evenPageHeader");
    expect(getHeaderFooterStoryKey("footer", "firstPage")).toBe("firstPageFooter");
    expect(getHeaderFooterStoryKey("footer", "evenPage")).toBe("evenPageFooter");
  });

  it("enables a default header story once and never overwrites existing content", () => {
    const { state } = fixture();
    expect(section(state).header).toBeUndefined();
    const enabled = enableHeaderFooterStory(state, "header");
    expect(section(enabled).header).toHaveLength(1);
    expect(section(enabled).header![0]).toMatchObject({
      type: "paragraph",
      style: { styleId: "header" },
    });
    // Second call is a no-op — does not reset existing content.
    expect(enableHeaderFooterStory(enabled, "header")).toBe(enabled);
    // Does not change the editing zone.
    expect(enabled.activeZone).toBe("main");
  });

  it("enables first-page and even-page variant stories per side", () => {
    const { state } = fixture();
    const header = enableHeaderFooterStory(state, "header", "firstPage");
    expect(section(header).firstPageHeader).toHaveLength(1);
    expect(section(header).header).toBeUndefined();
    const evenFooter = enableHeaderFooterStory(header, "footer", "evenPage");
    expect(section(evenFooter).evenPageFooter).toHaveLength(1);
    expect(section(evenFooter).footer).toBeUndefined();
  });

  it("enters header editing: seeds a story and moves the caret + zone into it", () => {
    const { state } = fixture();
    const editing = editHeaderFooter(state, "header");
    expect(section(editing).header).toHaveLength(1);
    expect(editing.activeZone).toBe("header");
    const headerParagraph = section(editing).header![0] as {
      id: string;
    };
    expect(editing.selection.anchor.paragraphId).toBe(headerParagraph.id);
  });

  it("preserves existing header content when entering editing", () => {
    const { state } = fixture();
    let editing = editHeaderFooter(state, "header");
    const existing = section(editing).header![0];
    editing = editHeaderFooter(editing, "header");
    expect(editing.activeZone).toBe("header");
    expect(section(editing).header![0]).toBe(existing);
  });

  it("clears a story and, when it was being edited, returns to the body", () => {
    const { state } = fixture();
    const editing = editHeaderFooter(state, "footer");
    expect(editing.activeZone).toBe("footer");
    const cleared = clearHeaderFooterStory(editing, "footer");
    expect(section(cleared).footer).toBeUndefined();
    expect(cleared.activeZone).toBe("main");
  });

  it("clear is a no-op when the story does not exist", () => {
    const { state } = fixture();
    expect(clearHeaderFooterStory(state, "footer")).toBe(state);
  });

  it("exit moves the caret and zone back to the start of the body", () => {
    const { state } = fixture();
    const editing = editHeaderFooter(state, "footer");
    const exited = exitHeaderFooter(editing);
    expect(exited.activeZone).toBe("main");
    const firstBody = (section(exited).blocks[0] as { id: string });
    expect(exited.selection.anchor.paragraphId).toBe(firstBody.id);
    expect(exited.selection.anchor).toEqual(exited.selection.focus);
  });

  it("inserts a PAGE field run into the active header story", () => {
    const { state } = fixture();
    const editing = editHeaderFooter(state, "header");
    const withPage = insertPageNumber(editing);
    const headerParagraph = section(withPage).header![0] as {
      runs: Array<{ kind: string; text?: string }>;
    };
    const runs = headerParagraph.runs;
    const fieldRun = runs.find((run) => run.kind === "field");
    expect(fieldRun).toMatchObject({ kind: "field", text: "1" });
    expect(withPage.activeZone).toBe("header");
  });
});
