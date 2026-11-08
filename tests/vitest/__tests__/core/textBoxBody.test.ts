import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  setSelectedShapePreset,
} from "@/core/commands/shapeFillCommands.js";
import {
  canStyleSelectedTextBox,
  setSelectedTextBoxTextDirection,
  setSelectedTextBoxVerticalAlign,
} from "@/core/commands/textBoxBodyCommands.js";
import {
  getParagraphs,
  getRunTextBox,
  paragraphOffsetToPosition,
  type EditorState,
  type EditorTextBoxData,
} from "@/core/model.js";

function buildState(shape?: EditorTextBoxData["shape"]): EditorState {
  const textBox: EditorTextBoxData = {
    width: 150,
    height: 100,
    blocks: [],
    shape: shape ?? { preset: "rect", fill: "#4472C4" },
  };
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

function boxOf(state: EditorState): EditorTextBoxData {
  const run = getParagraphs(state)[0]!.runs[0]!;
  return getRunTextBox(run)!;
}

function plainSelection(state: EditorState): EditorState {
  const paragraph = getParagraphs(state)[0]!;
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 3),
      focus: paragraphOffsetToPosition(paragraph, 4),
    },
  };
}

describe("shape change preset", () => {
  it("changes the selected shape's preset geometry", () => {
    const state = buildState();
    const next = setSelectedShapePreset(state, "ellipse");
    expect(next).not.toBe(state);
    expect(boxOf(next).shape?.preset).toBe("ellipse");
    expect(boxOf(next).shape?.fill).toBe("#4472C4");
  });

  it("leaves the state untouched when no shape is selected", () => {
    const state = plainSelection(buildState());
    expect(setSelectedShapePreset(state, "triangle")).toBe(state);
  });
});

describe("text box text direction", () => {
  it("exposes a capability only when a text box is selected", () => {
    expect(canStyleSelectedTextBox(buildState())).toBe(true);
    expect(canStyleSelectedTextBox(plainSelection(buildState()))).toBe(false);
  });

  it("sets vertical text direction (vert90)", () => {
    const state = buildState();
    const next = setSelectedTextBoxTextDirection(state, "vert");
    expect(boxOf(next).body?.vert).toBe("vert");
  });

  it("sets stacked word-art direction", () => {
    const state = buildState();
    const next = setSelectedTextBoxTextDirection(state, "wordArtVert");
    expect(boxOf(next).body?.vert).toBe("wordArtVert");
  });

  it("resets to horizontal", () => {
    const state = setSelectedTextBoxTextDirection(buildState(), "vert");
    const next = setSelectedTextBoxTextDirection(state, "horz");
    expect(boxOf(next).body?.vert).toBe("horz");
  });

  it("leaves the state untouched when no text box is selected", () => {
    const plain = plainSelection(buildState());
    expect(setSelectedTextBoxTextDirection(plain, "vert")).toBe(plain);
  });
});

describe("text box vertical align", () => {
  it("sets middle anchor", () => {
    const state = buildState();
    const next = setSelectedTextBoxVerticalAlign(state, "ctr");
    expect(boxOf(next).body?.anchor).toBe("ctr");
  });

  it("sets bottom anchor", () => {
    const state = buildState();
    const next = setSelectedTextBoxVerticalAlign(state, "b");
    expect(boxOf(next).body?.anchor).toBe("b");
  });

  it("sets top anchor", () => {
    const state = buildState();
    const next = setSelectedTextBoxVerticalAlign(state, "t");
    expect(boxOf(next).body?.anchor).toBe("t");
  });

  it("leaves the state untouched when no text box is selected", () => {
    const plain = plainSelection(buildState());
    expect(setSelectedTextBoxVerticalAlign(plain, "b")).toBe(plain);
  });
});
