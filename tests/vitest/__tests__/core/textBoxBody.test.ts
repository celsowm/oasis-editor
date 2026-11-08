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
  getSelectedTextBoxAlt,
  rotateSelectedTextBoxByStep,
  setSelectedTextBoxAlt,
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

describe("text box alt text", () => {
  it("sets the accessibility description", () => {
    const state = buildState();
    const next = setSelectedTextBoxAlt(state, "A blue rectangle");
    expect(next).not.toBe(state);
    expect(getSelectedTextBoxAlt(next)).toBe("A blue rectangle");
  });

  it("clears the description via null", () => {
    const state = setSelectedTextBoxAlt(buildState(), "A blue rectangle");
    const next = setSelectedTextBoxAlt(state, null);
    expect(getSelectedTextBoxAlt(next)).toBeNull();
  });

  it("reports the alt text of the selected text box", () => {
    expect(getSelectedTextBoxAlt(buildState())).toBeNull();
  });

  it("leaves the state untouched when no text box is selected", () => {
    const plain = plainSelection(buildState());
    expect(setSelectedTextBoxAlt(plain, "x")).toBe(plain);
  });
});

describe("text box rotate by step", () => {
  it("rotates left counter-clockwise by 90 degrees", () => {
    const state = buildState();
    const next = rotateSelectedTextBoxByStep(state, "left");
    expect(next).not.toBe(state);
    expect(boxOf(next).rotation).toBe(90);
  });

  it("rotates right clockwise by 90 degrees", () => {
    const once = rotateSelectedTextBoxByStep(buildState(), "left");
    expect(boxOf(once).rotation).toBe(90);
    const back = rotateSelectedTextBoxByStep(once, "right");
    expect(boxOf(back).rotation).toBeUndefined();
  });

  it("wraps angles back into the [0, 360) range", () => {
    // 4 left 90° steps from 0 = 360°, which normalizes to undefined.
    const s1 = rotateSelectedTextBoxByStep(buildState(), "left");
    const s2 = rotateSelectedTextBoxByStep(s1, "left");
    const s3 = rotateSelectedTextBoxByStep(s2, "left");
    const s4 = rotateSelectedTextBoxByStep(s3, "left");
    expect(boxOf(s4).rotation).toBeUndefined();
  });

  it("honours a custom step", () => {
    const state = buildState();
    const next = rotateSelectedTextBoxByStep(state, "left", 45);
    expect(boxOf(next).rotation).toBe(45);
  });

  it("leaves the state untouched when no text box is selected", () => {
    const plain = plainSelection(buildState());
    expect(rotateSelectedTextBoxByStep(plain, "left")).toBe(plain);
  });
});
