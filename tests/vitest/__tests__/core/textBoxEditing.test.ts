import { getRunImage, getRunTextBox, getRunField, getRunFieldChar, getRunFieldInstruction, getRunFootnoteReference, getRunEndnoteReference, getRunSym } from "@/core/model.js";
import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { insertTextAtSelection } from "@/core/commands/text.js";
import {
  getSelectedTextBoxRun,
  resizeSelectedTextBox,
} from "@/core/commands/textBox.js";
import {
  paragraphOffsetToPosition,
  type EditorParagraphNode,
  type EditorState,
  type EditorTextBoxData,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";

const EMU_PER_PX = 9525;

function buildStateWithSelectedTextBox(textBox: EditorTextBoxData): {
  state: EditorState;
  paragraph: EditorParagraphNode;
} {
  const paragraph = createEditorParagraphFromRuns([
    { text: "￼", textBox },
    { text: "after" },
  ]);
  const document = createEditorDocument([paragraph]);
  const base = createEditorStateFromDocument(document);
  const state: EditorState = {
    ...base,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, 1),
    },
  };
  return { state, paragraph };
}

function resizedTextBox(state: EditorState): EditorTextBoxData {
  const selected = getSelectedTextBoxRun(state);
  return getRunTextBox(selected!.run)!;
}

describe("text box editing preservation", () => {
  it("keeps an anchored text box when typing after sibling normal text", () => {
    const innerParagraph = createEditorParagraphFromRuns([
      { text: "insidebox" },
    ]);

    const textBox: EditorTextBoxData = {
      width: 248,
      height: 147,
      blocks: [innerParagraph],
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: -275590 },
        positionV: { relativeFrom: "paragraph", offset: 87630 },
      },
      shape: {
        preset: "rect",
        fill: "#FFFFFF",
        borderColor: "#000000",
        borderWidthPt: 0.75,
      },
      body: {
        paddingLeft: 10,
        paddingTop: 5,
        paddingRight: 10,
        paddingBottom: 5,
        anchor: "t",
        wrap: "square",
        autoFit: true,
      },
    };

    const paragraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        textBox,
      },
      {
        text: "normaltext",
      },
    ]);

    const document = createEditorDocument([paragraph]);

    const state = createEditorStateFromDocument(document, {
      paragraphIndex: 0,
      offset: "\uFFFCnormaltext".length,
    });

    const next = insertTextAtSelection(state, "x");

    const nextParagraph = next.document.sections![0]!
      .blocks[0] as EditorParagraphNode;

    const allText = nextParagraph.runs.map((run) => run.text).join("");
    expect(allText).toBe("\uFFFCnormaltextx");

    const textBoxRuns = nextParagraph.runs.filter((run) => getRunTextBox(run));
    expect(textBoxRuns).toHaveLength(1);
    expect(textBoxRuns[0]!.text).toBe("\uFFFC");

    const inner = getRunTextBox(textBoxRuns[0]!)!.blocks[0] as EditorParagraphNode;
    expect(inner.runs.map((run) => run.text).join("")).toBe("insidebox");
  });
});

describe("resizeSelectedTextBox", () => {
  const baseFloatingTextBox = (): EditorTextBoxData => ({
    width: 248,
    height: 147,
    blocks: [createEditorParagraphFromRuns([{ text: "inside" }])],
    floating: {
      type: "floating",
      wrap: "square",
      positionH: { relativeFrom: "column", offset: -275590 },
      positionV: { relativeFrom: "paragraph", offset: 87630 },
    },
    body: { autoFit: true },
  });

  it("resizing from the south-east keeps the anchor offset and clears autoFit", () => {
    const { state } = buildStateWithSelectedTextBox(baseFloatingTextBox());
    const next = resizeSelectedTextBox(state, 348, 247, {
      handleDirection: "se",
    });
    const textBox = resizedTextBox(next);

    expect(textBox.width).toBe(348);
    expect(textBox.height).toBe(247);
    expect(textBox.floating!.positionH!.offset).toBe(-275590);
    expect(textBox.floating!.positionV!.offset).toBe(87630);
    expect(textBox.body!.autoFit).toBe(false);
  });

  it("resizing width-only from the east leaves autoFit untouched", () => {
    const { state } = buildStateWithSelectedTextBox(baseFloatingTextBox());
    const next = resizeSelectedTextBox(state, 348, 147, {
      handleDirection: "e",
    });
    const textBox = resizedTextBox(next);

    expect(textBox.width).toBe(348);
    expect(textBox.floating!.positionH!.offset).toBe(-275590);
    expect(textBox.body!.autoFit).toBe(true);
  });

  it("resizing from the west shifts the horizontal offset so the east edge stays fixed", () => {
    const { state } = buildStateWithSelectedTextBox(baseFloatingTextBox());
    const next = resizeSelectedTextBox(state, 348, 147, {
      handleDirection: "w",
    });
    const textBox = resizedTextBox(next);

    expect(textBox.width).toBe(348);
    expect(textBox.floating!.positionH!.offset).toBe(
      -275590 - 100 * EMU_PER_PX,
    );
    expect(textBox.floating!.positionV!.offset).toBe(87630);
  });

  it("resizing from the north shifts the vertical offset and clears autoFit", () => {
    const { state } = buildStateWithSelectedTextBox(baseFloatingTextBox());
    const next = resizeSelectedTextBox(state, 248, 247, {
      handleDirection: "n",
    });
    const textBox = resizedTextBox(next);

    expect(textBox.height).toBe(247);
    expect(textBox.floating!.positionV!.offset).toBe(87630 - 100 * EMU_PER_PX);
    expect(textBox.floating!.positionH!.offset).toBe(-275590);
    expect(textBox.body!.autoFit).toBe(false);
  });

  it("does not shift an align-anchored axis", () => {
    const textBoxData = baseFloatingTextBox();
    textBoxData.floating!.positionH = {
      relativeFrom: "column",
      align: "right",
    };
    const { state } = buildStateWithSelectedTextBox(textBoxData);
    const next = resizeSelectedTextBox(state, 348, 147, {
      handleDirection: "w",
    });
    const textBox = resizedTextBox(next);

    expect(textBox.floating!.positionH!.align).toBe("right");
    expect(textBox.floating!.positionH!.offset).toBeUndefined();
  });

  it("clamps to a minimum size and preserves the selection", () => {
    const { state } = buildStateWithSelectedTextBox(baseFloatingTextBox());
    const next = resizeSelectedTextBox(state, 10, 5, {
      handleDirection: "se",
    });
    const textBox = resizedTextBox(next);

    expect(textBox.width).toBe(24);
    expect(textBox.height).toBe(24);

    const normalized = normalizeSelection(next);
    expect(normalized.startParagraphOffset).toBe(0);
    expect(normalized.endParagraphOffset).toBe(1);
  });

  it("resizes an inline (non-floating) text box without touching position", () => {
    const inlineTextBox: EditorTextBoxData = {
      width: 200,
      height: 100,
      blocks: [createEditorParagraphFromRuns([{ text: "inline" }])],
    };
    const { state } = buildStateWithSelectedTextBox(inlineTextBox);
    const next = resizeSelectedTextBox(state, 260, 140, {
      handleDirection: "w",
    });
    const textBox = resizedTextBox(next);

    expect(textBox.width).toBe(260);
    expect(textBox.height).toBe(140);
    expect(textBox.floating).toBeUndefined();
  });
});
