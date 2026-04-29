import { describe, expect, it, beforeEach } from "vitest";
import { getParagraphText, getParagraphs } from "../../core/model.js";
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
  toggleTextStyle,
} from "../../core/editorCommands.js";
import {
  createEditor2StateFromParagraphRuns,
  createEditor2StateFromTexts,
  resetEditor2Ids,
} from "../../core/editorState.js";

describe("editor-2 commands", () => {
  beforeEach(() => {
    resetEditor2Ids();
  });

  const paragraphTexts = (state: Parameters<typeof getParagraphs>[0]) =>
    getParagraphs(state).map((paragraph) => getParagraphText(paragraph));

  it("inserts text into the current block", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 2 });
    const next = insertTextAtSelection(state, "X");

    expect(paragraphTexts(next)).toEqual(["heXllo"]);
    expect(next.selection.focus.offset).toBe(3);
  });

  it("splits the current block on enter", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 2 });
    const next = splitBlockAtSelection(state);

    expect(paragraphTexts(next)).toEqual(["he", "llo"]);
    expect(next.selection.focus.paragraphId).toBe(getParagraphs(next)[1].id);
    expect(next.selection.focus.offset).toBe(0);
  });

  it("deletes one character backward inside a block", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 3 });
    const next = deleteBackward(state);

    expect(paragraphTexts(next)).toEqual(["helo"]);
    expect(next.selection.focus.offset).toBe(2);
  });

  it("merges with the previous block when backspacing at block start", () => {
    const state = createEditor2StateFromTexts(["abc", "def"], { blockIndex: 1, offset: 0 });
    const next = deleteBackward(state);

    expect(paragraphTexts(next)).toEqual(["abcdef"]);
    expect(next.selection.focus.paragraphId).toBe(getParagraphs(next)[0].id);
    expect(next.selection.focus.offset).toBe(3);
  });

  it("moves left and right across block boundaries", () => {
    const start = createEditor2StateFromTexts(["ab", "cd"], { blockIndex: 1, offset: 0 });
    const left = moveSelectionLeft(start);
    const right = moveSelectionRight(left);

    expect(left.selection.focus.paragraphId).toBe(getParagraphs(left)[0].id);
    expect(left.selection.focus.offset).toBe(2);
    expect(right.selection.focus.paragraphId).toBe(getParagraphs(right)[1].id);
    expect(right.selection.focus.offset).toBe(0);
  });

  it("moves up and down with clamped offsets", () => {
    const start = createEditor2StateFromTexts(["abcd", "xy"], { blockIndex: 0, offset: 3 });
    const down = moveSelectionDown(start);
    const up = moveSelectionUp(down);

    expect(down.selection.focus.paragraphId).toBe(getParagraphs(down)[1].id);
    expect(down.selection.focus.offset).toBe(2);
    expect(up.selection.focus.paragraphId).toBe(getParagraphs(up)[0].id);
    expect(up.selection.focus.offset).toBe(2);
  });

  it("replaces an expanded selection when inserting text", () => {
    const state = createEditor2StateFromTexts(["hello"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 0, offset: 4 },
    });
    const next = insertTextAtSelection(state, "X");

    expect(paragraphTexts(next)).toEqual(["hXo"]);
    expect(next.selection.focus.offset).toBe(2);
  });

  it("deletes an expanded cross-block selection with backspace", () => {
    const state = createEditor2StateFromTexts(["abc", "def", "ghi"], {
      anchor: { blockIndex: 0, offset: 2 },
      focus: { blockIndex: 2, offset: 1 },
    });
    const next = deleteBackward(state);

    expect(paragraphTexts(next)).toEqual(["abhi"]);
    expect(next.selection.focus.paragraphId).toBe(getParagraphs(next)[0].id);
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

    expect(paragraphTexts(next)).toEqual(["hllo"]);
    expect(next.selection.focus.offset).toBe(1);
  });

  it("deletes an expanded selection with delete", () => {
    const state = createEditor2StateFromTexts(["abc", "def"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 1, offset: 2 },
    });
    const next = deleteForward(state);

    expect(paragraphTexts(next)).toEqual(["af"]);
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

    expect(paragraphTexts(next)).toEqual(["heA", "Bllo"]);
    expect(next.selection.focus.paragraphId).toBe(getParagraphs(next)[1].id);
    expect(next.selection.focus.offset).toBe(1);
  });

  it("preserves surrounding runs when inserting inside a multi-run paragraph", () => {
    const state = createEditor2StateFromParagraphRuns(
      [
        [
          { text: "he", styles: { bold: true } },
          { text: "llo", styles: { italic: true } },
        ],
      ],
      { blockIndex: 0, offset: 2 },
    );
    const next = insertTextAtSelection(state, "X");
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["heX", "llo"]);
    expect(paragraph.runs[0]?.styles).toEqual({ bold: true });
    expect(paragraph.runs[1]?.styles).toEqual({ italic: true });
  });

  it("preserves multi-run fragments when deleting across run boundaries", () => {
    const state = createEditor2StateFromParagraphRuns(
      [
        [
          { text: "ab", styles: { bold: true } },
          { text: "cd", styles: { italic: true } },
          { text: "ef", styles: { underline: true } },
        ],
      ],
      {
        anchor: { blockIndex: 0, offset: 1 },
        focus: { blockIndex: 0, offset: 5 },
      },
    );
    const next = deleteBackward(state);
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["a", "f"]);
    expect(paragraph.runs[0]?.styles).toEqual({ bold: true });
    expect(paragraph.runs[1]?.styles).toEqual({ underline: true });
  });

  it("splits a multi-run paragraph without flattening the tail runs", () => {
    const state = createEditor2StateFromParagraphRuns(
      [
        [
          { text: "ab", styles: { bold: true } },
          { text: "cd", styles: { italic: true } },
        ],
      ],
      { blockIndex: 0, offset: 3 },
    );
    const next = splitBlockAtSelection(state);
    const [firstParagraph, secondParagraph] = getParagraphs(next);

    expect(firstParagraph.runs.map((run) => run.text)).toEqual(["ab", "c"]);
    expect(firstParagraph.runs.map((run) => run.styles)).toEqual([{ bold: true }, { italic: true }]);
    expect(secondParagraph.runs.map((run) => run.text)).toEqual(["d"]);
    expect(secondParagraph.runs[0]?.styles).toEqual({ italic: true });
  });

  it("toggles bold on an expanded selection by splitting runs", () => {
    const state = createEditor2StateFromTexts(["hello"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 0, offset: 4 },
    });
    const next = toggleTextStyle(state, "bold");
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["h", "ell", "o"]);
    expect(paragraph.runs.map((run) => run.styles)).toEqual([undefined, { bold: true }, undefined]);
  });

  it("removes underline when the full selected range is already underlined", () => {
    const state = createEditor2StateFromParagraphRuns(
      [[{ text: "hello", styles: { underline: true } }]],
      {
        anchor: { blockIndex: 0, offset: 1 },
        focus: { blockIndex: 0, offset: 4 },
      },
    );
    const next = toggleTextStyle(state, "underline");
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["h", "ell", "o"]);
    expect(paragraph.runs.map((run) => run.styles)).toEqual([{ underline: true }, undefined, { underline: true }]);
  });
});
