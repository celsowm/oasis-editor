
import { describe, expect, it, beforeEach } from "vitest";
import { getParagraphs, paragraphOffsetToPosition, findParagraphTableLocation, type Editor2State } from "../../core/model.js";
import {
  insertTableAtSelection,
  toggleTextStyle,
} from "../../core/editorCommands.js";
import {
  createEditor2StateFromTexts,
  resetEditor2Ids,
} from "../../core/editorState.js";
import { createEditor2TableOperations } from "../../app/controllers/useEditor2TableOperations.js";

describe("table style commands", () => {
  beforeEach(() => {
    resetEditor2Ids();
  });

  it("applies style only to selected column through the controller", () => {
    // 1. Create a 3x3 table
    let state = createEditor2StateFromTexts(["start"], { blockIndex: 0, offset: 5 });
    state = insertTableAtSelection(state, 3, 3);
    
    // Fill text in cells to make them identifiable
    const nextBlocks = state.document.blocks.map(block => {
        if (block.type === "table") {
            const table = block;
            table.rows[0].cells[1].blocks[0].runs[0].text = "r0c1";
            table.rows[1].cells[0].blocks[0].runs[0].text = "r1c0";
            table.rows[1].cells[1].blocks[0].runs[0].text = "r1c1";
            table.rows[1].cells[2].blocks[0].runs[0].text = "r1c2";
            table.rows[2].cells[1].blocks[0].runs[0].text = "r2c1";
        }
        return block;
    });

    state = {
        ...state,
        document: {
            ...state.document,
            blocks: nextBlocks
        }
    };
    
    const paragraphs = getParagraphs(state);
    const p2 = paragraphs[2]; // r0c1
    const p5 = paragraphs[5]; // r1c1
    const p8 = paragraphs[8]; // r2c1
    
    const p4 = paragraphs[4]; // r1c0 (SHOULD NOT BE BOLD)
    const p6 = paragraphs[6]; // r1c2 (SHOULD NOT BE BOLD)
    
    // Set selection to p2[0] to p8[0] (which represents r0c1 to r2c1)
    state.selection = {
        anchor: paragraphOffsetToPosition(p2, 0),
        focus: paragraphOffsetToPosition(p8, 0)
    };

    let resultState = state;
    const ops = createEditor2TableOperations({
        applyTransactionalState: (producer) => {
            resultState = producer(resultState);
        },
        applySelectionToStatePreservingStructure: (s, sel) => ({ ...s, selection: sel }),
        focusInput: () => {},
        logger: { info: () => {}, debug: () => {}, warn: () => {}, error: () => {} } as any
    });

    // Apply bold style through the controller
    (ops as any).applySelectionAwareTextCommand((current: Editor2State) => toggleTextStyle(current, "bold"));
    
    const nextParagraphs = getParagraphs(resultState);
    
    // P2, P5, P8 should be bold.
    expect(nextParagraphs[2].runs[0].styles?.bold).toBe(true);
    expect(nextParagraphs[5].runs[0].styles?.bold).toBe(true);
    expect(nextParagraphs[8].runs[0].styles?.bold).toBe(true);
    
    // These SHOULD NOT be bold
    expect(nextParagraphs[4].runs[0].styles?.bold).not.toBe(true);
    expect(nextParagraphs[6].runs[0].styles?.bold).not.toBe(true);
  });
});
