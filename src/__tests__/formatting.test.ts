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
});
