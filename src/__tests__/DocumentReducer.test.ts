import { describe, it, expect } from "vitest";
import { reduceDocumentState } from "../core/runtime/DocumentReducer.js";
import { Operations } from "../core/operations/OperationFactory.js";
import { createTextRun, createParagraph, createSection } from "../core/document/DocumentFactory.js";
import { EditorState } from "../core/runtime/EditorState.js";
import { LayoutState } from "../core/layout/LayoutTypes.js";
import { DocumentModel, createDocumentMetadata } from "../core/document/DocumentTypes.js";

describe("DocumentReducer", () => {
  const setupSimpleState = (): EditorState => {
    const run = createTextRun("Hello");
    const block = createParagraph("Hello");
    block.children = [run]; // Ensure we know the ID
    const section = createSection([block]);
    const document: DocumentModel = {
      id: "doc:test",
      revision: 0,
      metadata: createDocumentMetadata("Test Doc"),
      sections: [section],
    };

    return {
      document,
      selection: {
        anchor: {
          sectionId: section.id,
          blockId: block.id,
          inlineId: run.id,
          offset: 0,
        },
        focus: {
          sectionId: section.id,
          blockId: block.id,
          inlineId: run.id,
          offset: 0,
        },
      },
    };
  };

  it("should handle SET_ALIGNMENT", () => {
    const state = setupSimpleState();
    const op = Operations.setAlignment("center");
    const nextState = reduceDocumentState(state, op);

    const blockId = state.selection!.anchor.blockId;
    const block = nextState.document.sections[0].children.find(
      (b) => b.id === blockId,
    );
    expect(block).toBeDefined();
    if (block) {
      expect(block.align).toBe("center");
    }
    expect(nextState.document.revision).toBe(state.document.revision + 1);
  });

  it("should handle SET_SELECTION", () => {
    const state = setupSimpleState();
    const newSelection = {
      anchor: { ...state.selection!.anchor, offset: 5 },
      focus: { ...state.selection!.focus, offset: 5 },
    };
    const op = Operations.setSelection(newSelection);
    const nextState = reduceDocumentState({ ...state, pendingMarks: { bold: true } }, op);

    expect(nextState.selection).toEqual(newSelection);
    expect(nextState.pendingMarks).toBeUndefined();
  });

  it("should handle TOGGLE_MARK on collapsed selection", () => {
    const state = setupSimpleState();
    const op = Operations.toggleMark("bold");
    const nextState = reduceDocumentState(state, op);

    expect(nextState.pendingMarks).toEqual({ bold: true });

    const nextState2 = reduceDocumentState(nextState, op);
    expect(nextState2.pendingMarks).toEqual({ bold: false });
  });

  it("should handle SET_MARK on range selection", () => {
    const state = setupSimpleState();
    const selection = {
      anchor: { ...state.selection!.anchor, offset: 0 },
      focus: { ...state.selection!.focus, offset: 2 },
    };
    const op = Operations.setMark("italic", true);
    const nextState = reduceDocumentState({ ...state, selection }, op);

    const updatedBlock = nextState.document.sections[0].children[0];
    const italicRun = updatedBlock.children.find(r => r.text === "He");
    expect(italicRun?.marks.italic).toBe(true);
  });

  it("should handle INSERT_TEXT without pending marks", () => {
    const state = setupSimpleState();
    const op = Operations.insertText("A");
    const nextState = reduceDocumentState(state, op);

    const block = nextState.document.sections[0].children[0];
    expect(block.children[0].text).toBe("AHello");
    expect(nextState.selection!.anchor.offset).toBe(1);
  });

  it("should handle INSERT_TEXT with pending marks", () => {
    const state = setupSimpleState();
    const stateWithMarks = { ...state, pendingMarks: { bold: true } };
    const op = Operations.insertText("B");
    const nextState = reduceDocumentState(stateWithMarks, op);

    const block = nextState.document.sections[0].children[0];
    const boldRun = block.children.find(r => r.text === "B");
    expect(boldRun).toBeDefined();
    expect(boldRun?.marks.bold).toBe(true);
    expect(nextState.pendingMarks).toBeUndefined();
  });

  it("should handle DELETE_TEXT (backspace)", () => {
    const state = setupSimpleState();
    // Insert "A" at offset 0, text becomes "AHello", offset 1
    const stateWithText = reduceDocumentState(state, Operations.insertText("A"));
    const op = Operations.deleteText();
    const nextState = reduceDocumentState(stateWithText, op);

    const block = nextState.document.sections[0].children[0];
    expect(block.children[0].text).toBe("Hello");
    expect(nextState.selection!.anchor.offset).toBe(0);
  });

  it("should merge blocks on DELETE_TEXT at start of block", () => {
    const run1 = createTextRun("Block1");
    const block1 = createParagraph("Block1");
    block1.children = [run1];
    const run2 = createTextRun("Block2");
    const block2 = createParagraph("Block2");
    block2.children = [run2];
    const section = createSection([block1, block2]);
    const document: DocumentModel = {
      id: "doc:test",
      revision: 0,
      metadata: createDocumentMetadata("Test Doc"),
      sections: [section],
    };

    const selectionAtStartOfBlock2 = {
      anchor: {
        sectionId: section.id,
        blockId: block2.id,
        inlineId: run2.id,
        offset: 0,
      },
      focus: {
        sectionId: section.id,
        blockId: block2.id,
        inlineId: run2.id,
        offset: 0,
      },
    };

    const state: EditorState = { document, selection: selectionAtStartOfBlock2 };
    const op = Operations.deleteText();
    const nextState = reduceDocumentState(state, op);

    expect(nextState.document.sections[0].children.length).toBe(1);
    expect(nextState.document.sections[0].children[0].children.map(r => r.text).join("")).toBe("Block1Block2");
  });

  it("should handle INSERT_PARAGRAPH", () => {
    const state = setupSimpleState();
    const op = Operations.insertParagraph();
    const nextState = reduceDocumentState(state, op);

    expect(nextState.document.sections[0].children.length).toBe(2);
    expect(nextState.selection!.anchor.blockId).not.toBe(state.selection!.anchor.blockId);
  });

  it("should handle MOVE_SELECTION ArrowRight/ArrowLeft", () => {
    const state = setupSimpleState();
    const opRight = Operations.moveSelection("ArrowRight");
    const stateMovedRight = reduceDocumentState(state, opRight);
    expect(stateMovedRight.selection!.anchor.offset).toBe(1);

    const opLeft = Operations.moveSelection("ArrowLeft");
    const stateMovedLeft = reduceDocumentState(stateMovedRight, opLeft);
    expect(stateMovedLeft.selection!.anchor.offset).toBe(0);
  });

  it("should handle APPEND_PARAGRAPH", () => {
    const state = setupSimpleState();
    const op = Operations.appendParagraph("New");
    const nextState = reduceDocumentState(state, op);

    const section = nextState.document.sections[0];
    const lastBlock = section.children[section.children.length - 1];
    expect(lastBlock.children[0].text).toBe("New");
  });

  it("should handle MOVE_SELECTION ArrowDown with layout", () => {
    const state = setupSimpleState();
    const blockId = state.selection!.anchor.blockId;

    const mockLayout: LayoutState = {
      pages: [{ id: "p1", width: 800, height: 1000, fragments: [] }],
      fragmentsByBlockId: {
        [blockId]: [
          {
            id: "f1",
            blockId,
            pageId: "p1",
            x: 0, y: 0, width: 500, height: 100,
            startOffset: 0,
            endOffset: 100,
            lines: [
              { id: "l1", offsetStart: 0, offsetEnd: 2, x: 0, y: 0, width: 200, height: 20, ascent: 15, descent: 5 },
              { id: "l2", offsetStart: 2, offsetEnd: 5, x: 0, y: 20, width: 200, height: 20, ascent: 15, descent: 5 },
            ]
          }
        ]
      }
    };

    const op = Operations.moveSelection("ArrowDown");
    const nextState = reduceDocumentState(state, op, mockLayout);

    expect(nextState.selection!.anchor.offset).toBeGreaterThanOrEqual(2);
  });
});
