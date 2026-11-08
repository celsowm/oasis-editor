import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  alignSelectedFloatingObject,
  canAlignSelectedFloatingObject,
  canNudgeSelectedFloatingObject,
  nudgeSelectedFloatingObject,
} from "@/core/commands/floatingAlignCommands.js";
import {
  getParagraphs,
  getRunImage,
  getRunTextBox,
  paragraphOffsetToPosition,
  type EditorImageRunData,
  type EditorState,
  type EditorTextBoxData,
} from "@/core/model.js";

function placeOn(state: EditorState, offset: number): EditorState {
  const paragraph = getParagraphs(state)[0]!;
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, offset),
      focus: paragraphOffsetToPosition(paragraph, offset + 1),
    },
  };
}

function buildImageState(image: EditorImageRunData): EditorState {
  const paragraph = createEditorParagraphFromRuns([
    { text: "￼", image },
    { text: "after" },
  ]);
  const base = createEditorStateFromDocument(createEditorDocument([paragraph]));
  return {
    ...base,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, 1),
    },
  };
}

function buildTextBoxState(textBox: EditorTextBoxData): EditorState {
  const paragraph = createEditorParagraphFromRuns([
    { text: "￼", textBox },
    { text: "after" },
  ]);
  const base = createEditorStateFromDocument(createEditorDocument([paragraph]));
  return {
    ...base,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, 1),
    },
  };
}

const baseImage: EditorImageRunData = { src: "asset:1", width: 200, height: 100 };

describe("align floating object", () => {
  it("exposes a capability for an inline image selection", () => {
    expect(canAlignSelectedFloatingObject(buildImageState(baseImage))).toBe(
      true,
    );
  });

  it("exposes a capability for a text box selection", () => {
    const textBox: EditorTextBoxData = { width: 150, height: 100, blocks: [] };
    expect(canAlignSelectedFloatingObject(buildTextBoxState(textBox))).toBe(
      true,
    );
  });

  it("denies the capability for a plain text selection", () => {
    const state = buildImageState(baseImage);
    expect(canAlignSelectedFloatingObject(placeOn(state, 3))).toBe(false);
  });

  it("floats an inline image and aligns it to the margin center", () => {
    const state = buildImageState(baseImage);
    const next = alignSelectedFloatingObject(state, "center");
    expect(next).not.toBe(state);
    const run = getParagraphs(next)[0]!.runs[0]!;
    const image = getRunImage(run)!;
    expect(image.floating).toBeDefined();
    expect(image.floating?.wrap).toBe("square");
    expect(image.floating?.positionH).toEqual({
      relativeFrom: "margin",
      align: "center",
      offset: 0,
    });
  });

  it("aligns a floating image left", () => {
    const floatingImage: EditorImageRunData = {
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: 0 },
        positionV: { relativeFrom: "paragraph", offset: 0 },
      },
    };
    const state = buildImageState(floatingImage);
    const next = alignSelectedFloatingObject(state, "left");
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating?.positionH?.align).toBe("left");
    expect(image.floating?.positionH?.relativeFrom).toBe("margin");
  });

  it("aligns a text box right", () => {
    const textBox: EditorTextBoxData = { width: 150, height: 100, blocks: [] };
    const state = buildTextBoxState(textBox);
    const next = alignSelectedFloatingObject(state, "right");
    const run = getParagraphs(next)[0]!.runs[0]!;
    const box = getRunTextBox(run)!;
    expect(box.floating?.positionH?.align).toBe("right");
    expect(box.floating?.positionH?.relativeFrom).toBe("margin");
  });

  it("leaves the state untouched when no object is selected", () => {
    const state = buildImageState(baseImage);
    const plain = placeOn(state, 3);
    expect(alignSelectedFloatingObject(plain, "center")).toBe(plain);
  });
});

describe("nudge floating object", () => {
  const EMU = 9525;

  it("exposes a capability for an inline image selection", () => {
    expect(canNudgeSelectedFloatingObject(buildImageState(baseImage))).toBe(
      true,
    );
  });

  it("denies the capability for a plain text selection", () => {
    const state = buildImageState(baseImage);
    expect(canNudgeSelectedFloatingObject(placeOn(state, 3))).toBe(false);
  });

  it("floats an inline image and shifts its offsets by the pixel delta", () => {
    const state = buildImageState(baseImage);
    const next = nudgeSelectedFloatingObject(state, 10, -5);
    expect(next).not.toBe(state);
    const run = getParagraphs(next)[0]!.runs[0]!;
    const image = getRunImage(run)!;
    expect(image.floating?.wrap).toBe("square");
    expect(image.floating?.positionH?.offset).toBe(10 * EMU);
    expect(image.floating?.positionV?.offset).toBe(-5 * EMU);
  });

  it("adds to existing offsets on a floating object", () => {
    const floatingImage: EditorImageRunData = {
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: 100 },
        positionV: { relativeFrom: "paragraph", offset: 50 },
      },
    };
    const state = buildImageState(floatingImage);
    const next = nudgeSelectedFloatingObject(state, 1, 2);
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating?.positionH?.offset).toBe(100 + EMU);
    expect(image.floating?.positionV?.offset).toBe(50 + 2 * EMU);
  });

  it("nudges a text box", () => {
    const textBox: EditorTextBoxData = { width: 150, height: 100, blocks: [] };
    const state = buildTextBoxState(textBox);
    const next = nudgeSelectedFloatingObject(state, 3, 0);
    const run = getParagraphs(next)[0]!.runs[0]!;
    const box = getRunTextBox(run)!;
    expect(box.floating?.positionH?.offset).toBe(3 * EMU);
  });

  it("leaves the state untouched when no object is selected", () => {
    const state = buildImageState(baseImage);
    const plain = placeOn(state, 3);
    expect(nudgeSelectedFloatingObject(plain, 1, 1)).toBe(plain);
  });
});
