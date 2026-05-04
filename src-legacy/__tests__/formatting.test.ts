import { describe, it, expect } from "vitest";
import { DocumentRuntime } from "../core/runtime/DocumentRuntime.js";
import { Operations } from "../core/operations/OperationFactory.js";
import { isTextBlock } from "../core/document/BlockTypes.js";

describe("TOGGLE_MARK range reproduction", () => {
  it("should toggle bold mark on a range selection", () => {
    const runtime = new DocumentRuntime();
    const state = runtime.getState();
    const section = state.document.sections[0];
    const paragraph = section.children[1]; // The Lorem Ipsum paragraph
    
    if (!isTextBlock(paragraph)) throw new Error("Paragraph 1 should be a text block");
    
    const firstRun = paragraph.children[0];
    
    // Select the first run entirely
    const selection = {
      anchor: { sectionId: section.id, blockId: paragraph.id, inlineId: firstRun.id, offset: 0 },
      focus: { sectionId: section.id, blockId: paragraph.id, inlineId: firstRun.id, offset: firstRun.text.length }
    };
    
    runtime.dispatch(Operations.setSelection(selection));
    
    // First run is already bold in the factory
    expect(firstRun.marks.bold).toBe(true);
    
    // Dispatch TOGGLE_MARK
    runtime.dispatch(Operations.toggleMark("bold"));
    
    const nextState = runtime.getState();
    const nextSection = nextState.document.sections[0];
    const nextParagraph = nextSection.children[1];
    
    if (!isTextBlock(nextParagraph)) throw new Error("Next paragraph 1 should be a text block");
    
    const nextFirstRun = nextParagraph.children[0];
    
    // This is expected to FAIL currently because TOGGLE_MARK returns state for ranges
    expect(nextFirstRun.marks.bold).toBeFalsy();
  });

  it("should add italic mark to a range selection that doesn't have it", () => {
    const runtime = new DocumentRuntime();
    const state = runtime.getState();
    const section = state.document.sections[0];
    const paragraph = section.children[1]; // The Lorem Ipsum paragraph
    
    if (!isTextBlock(paragraph)) throw new Error("Paragraph 1 should be a text block");
    
    const secondRun = paragraph.children[1]; // "consectetur adipiscing elit. " (no marks)
    
    const selection = {
      anchor: { sectionId: section.id, blockId: paragraph.id, inlineId: secondRun.id, offset: 0 },
      focus: { sectionId: section.id, blockId: paragraph.id, inlineId: secondRun.id, offset: secondRun.text.length }
    };
    
    runtime.dispatch(Operations.setSelection(selection));
    expect(secondRun.marks.italic).toBeFalsy();
    
    runtime.dispatch(Operations.toggleMark("italic"));
    
    const nextState = runtime.getState();
    const nextParagraph = nextState.document.sections[0].children[1];
    if (!isTextBlock(nextParagraph)) throw new Error("Next paragraph should be a text block");
    const nextSecondRun = nextParagraph.children[1];
    
    expect(nextSecondRun.marks.italic).toBe(true);
  });

  it("should stop underlining after toggling underline off at a collapsed caret", () => {
    const runtime = new DocumentRuntime();
    const state = runtime.getState();
    const section = state.document.sections[0];
    const paragraph = section.children[1];

    if (!isTextBlock(paragraph)) throw new Error("Paragraph should be a text block");

    const targetRun = paragraph.children[1];
    const collapsedSelection = {
      anchor: {
        sectionId: section.id,
        blockId: paragraph.id,
        inlineId: targetRun.id,
        offset: targetRun.text.length,
      },
      focus: {
        sectionId: section.id,
        blockId: paragraph.id,
        inlineId: targetRun.id,
        offset: targetRun.text.length,
      },
    };

    runtime.dispatch(Operations.setSelection(collapsedSelection));
    runtime.dispatch(Operations.toggleMark("underline"));
    expect(runtime.getState().pendingMarks?.underline).toBe(true);

    runtime.dispatch(Operations.insertText("UNDERLINED_TEXT"));

    const afterFirstInsert = runtime.getState();
    const updatedParagraph = afterFirstInsert.document.sections[0].children[1];
    if (!isTextBlock(updatedParagraph)) throw new Error("Paragraph should be a text block");

    const underlinedRun = updatedParagraph.children.find((run) => run.text.includes("UNDERLINED_TEXT"));
    expect(underlinedRun?.marks.underline).toBe(true);

    const caretAfterFirstInsert = afterFirstInsert.selection;
    expect(caretAfterFirstInsert).not.toBeNull();

    runtime.dispatch(Operations.toggleMark("underline"));
    expect(runtime.getState().pendingMarks?.underline).toBe(false);

    runtime.dispatch(Operations.insertText(" NORMAL_TEXT"));

    const finalState = runtime.getState();
    const finalParagraph = finalState.document.sections[0].children[1];
    if (!isTextBlock(finalParagraph)) throw new Error("Paragraph should be a text block");

    const normalRun = finalParagraph.children.find((run) => run.text.includes(" NORMAL_TEXT"));
    expect(normalRun).toBeDefined();
    expect(normalRun?.marks.underline).toBeFalsy();
    expect(finalState.pendingMarks?.underline).toBe(false);
  });
});
