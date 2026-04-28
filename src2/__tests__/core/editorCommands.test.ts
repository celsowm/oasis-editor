import { describe, expect, it, beforeEach } from "vitest";
import {
  deleteBackward,
  deleteForward,
  extendSelectionLeft,
  extendSelectionRight,
  getSelectedText,
  insertPlainTextAtSelection,
  insertTextAtSelection,
  moveSelectionDown,
  moveSelectionLeft,
  moveSelectionRight,
  moveSelectionUp,
  splitBlockAtSelection,
} from "../../core/editorCommands.js";
import { createEditor2StateFromTexts, resetEditor2Ids } from "../../core/editorState.js";

describe("editor-2 commands", () => {
  beforeEach(() => {
    resetEditor2Ids();
  });

  it("inserts text into the current block", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 2 });
    const next = insertTextAtSelection(state, "X");

    expect(next.blocks.map((block) => block.text)).toEqual(["heXllo"]);
    expect(next.selection.focus.offset).toBe(3);
  });

  it("splits the current block on enter", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 2 });
    const next = splitBlockAtSelection(state);

    expect(next.blocks.map((block) => block.text)).toEqual(["he", "llo"]);
    expect(next.selection.focus.blockId).toBe(next.blocks[1].id);
    expect(next.selection.focus.offset).toBe(0);
  });

  it("deletes one character backward inside a block", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 3 });
    const next = deleteBackward(state);

    expect(next.blocks.map((block) => block.text)).toEqual(["helo"]);
    expect(next.selection.focus.offset).toBe(2);
  });

  it("merges with the previous block when backspacing at block start", () => {
    const state = createEditor2StateFromTexts(["abc", "def"], { blockIndex: 1, offset: 0 });
    const next = deleteBackward(state);

    expect(next.blocks.map((block) => block.text)).toEqual(["abcdef"]);
    expect(next.selection.focus.blockId).toBe(next.blocks[0].id);
    expect(next.selection.focus.offset).toBe(3);
  });

  it("moves left and right across block boundaries", () => {
    const start = createEditor2StateFromTexts(["ab", "cd"], { blockIndex: 1, offset: 0 });
    const left = moveSelectionLeft(start);
    const right = moveSelectionRight(left);

    expect(left.selection.focus.blockId).toBe(left.blocks[0].id);
    expect(left.selection.focus.offset).toBe(2);
    expect(right.selection.focus.blockId).toBe(right.blocks[1].id);
    expect(right.selection.focus.offset).toBe(0);
  });

  it("moves up and down with clamped offsets", () => {
    const start = createEditor2StateFromTexts(["abcd", "xy"], { blockIndex: 0, offset: 3 });
    const down = moveSelectionDown(start);
    const up = moveSelectionUp(down);

    expect(down.selection.focus.blockId).toBe(down.blocks[1].id);
    expect(down.selection.focus.offset).toBe(2);
    expect(up.selection.focus.blockId).toBe(up.blocks[0].id);
    expect(up.selection.focus.offset).toBe(2);
  });

  it("replaces an expanded selection when inserting text", () => {
    const state = createEditor2StateFromTexts(["hello"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 0, offset: 4 },
    });
    const next = insertTextAtSelection(state, "X");

    expect(next.blocks.map((block) => block.text)).toEqual(["hXo"]);
    expect(next.selection.focus.offset).toBe(2);
  });

  it("deletes an expanded cross-block selection with backspace", () => {
    const state = createEditor2StateFromTexts(["abc", "def", "ghi"], {
      anchor: { blockIndex: 0, offset: 2 },
      focus: { blockIndex: 2, offset: 1 },
    });
    const next = deleteBackward(state);

    expect(next.blocks.map((block) => block.text)).toEqual(["abhi"]);
    expect(next.selection.focus.blockId).toBe(next.blocks[0].id);
    expect(next.selection.focus.offset).toBe(2);
  });

  it("extends selection left and right from the focus", () => {
    const start = createEditor2StateFromTexts(["abcd"], { blockIndex: 0, offset: 2 });
    const left = extendSelectionLeft(start);
    const right = extendSelectionRight(left);

    expect(left.selection.anchor.offset).toBe(2);
    expect(left.selection.focus.offset).toBe(1);
    expect(right.selection.anchor.offset).toBe(2);
    expect(right.selection.focus.offset).toBe(2);
  });

  it("deletes one character forward inside a block", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 1 });
    const next = deleteForward(state);

    expect(next.blocks.map((block) => block.text)).toEqual(["hllo"]);
    expect(next.selection.focus.offset).toBe(1);
  });

  it("deletes an expanded selection with delete", () => {
    const state = createEditor2StateFromTexts(["abc", "def"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 1, offset: 2 },
    });
    const next = deleteForward(state);

    expect(next.blocks.map((block) => block.text)).toEqual(["af"]);
    expect(next.selection.focus.offset).toBe(1);
  });

  it("extracts selected text across blocks with newlines", () => {
    const state = createEditor2StateFromTexts(["abc", "def", "ghi"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 2, offset: 2 },
    });

    expect(getSelectedText(state)).toBe("bc\ndef\ngh");
  });

  it("pastes plain text with newlines as multiple blocks", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 2 });
    const next = insertPlainTextAtSelection(state, "A\nB");

    expect(next.blocks.map((block) => block.text)).toEqual(["heA", "Bllo"]);
    expect(next.selection.focus.blockId).toBe(next.blocks[1].id);
    expect(next.selection.focus.offset).toBe(1);
  });
});
