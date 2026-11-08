import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  canStyleSelectedShape,
  getSelectedShapeAppearance,
  setSelectedShapeFill,
  setSelectedShapeOutline,
  setSelectedShapeOutlineWidth,
} from "@/core/commands/shapeFillCommands.js";
import {
  getParagraphs,
  getRunTextBox,
  paragraphOffsetToPosition,
  type EditorState,
  type EditorTextBoxData,
} from "@/core/model.js";

function buildShapeState(shape?: EditorTextBoxData["shape"]): EditorState {
  const textBox: EditorTextBoxData = {
    width: 150,
    height: 100,
    blocks: [],
    shape: shape ?? { preset: "rect", fill: "#4472C4", borderColor: "#2F528F" },
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

function shapeOf(state: EditorState): EditorTextBoxData["shape"] | undefined {
  const run = getParagraphs(state)[0]!.runs[0]!;
  return getRunTextBox(run)?.shape;
}

describe("shape fill/outline", () => {
  it("exposes a capability only when a shape is selected", () => {
    expect(canStyleSelectedShape(buildShapeState())).toBe(true);

    const state = buildShapeState();
    const paragraph = getParagraphs(state)[0]!;
    const unselected: EditorState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 3),
        focus: paragraphOffsetToPosition(paragraph, 4),
      },
    };
    expect(canStyleSelectedShape(unselected)).toBe(false);
  });

  it("reads the current appearance", () => {
    const state = buildShapeState();
    expect(getSelectedShapeAppearance(state)).toEqual({
      preset: "rect",
      fill: "#4472C4",
      borderColor: "#2F528F",
    });
    const unselected = buildShapeState();
    const paragraph = getParagraphs(unselected)[0]!;
    expect(
      getSelectedShapeAppearance({
        ...unselected,
        selection: {
          anchor: paragraphOffsetToPosition(paragraph, 3),
          focus: paragraphOffsetToPosition(paragraph, 4),
        },
      }),
    ).toBeNull();
  });

  it("sets a solid fill", () => {
    const state = buildShapeState();
    const next = setSelectedShapeFill(state, "#FF0000");
    expect(next).not.toBe(state);
    expect(shapeOf(next)?.fill).toBe("#FF0000");
    // Other shape fields preserved.
    expect(shapeOf(next)?.preset).toBe("rect");
    expect(shapeOf(next)?.borderColor).toBe("#2F528F");
  });

  it("clears the fill via null", () => {
    const state = buildShapeState();
    const next = setSelectedShapeFill(state, null);
    expect(shapeOf(next)?.fill).toBeUndefined();
  });

  it("sets the outline color", () => {
    const state = buildShapeState();
    const next = setSelectedShapeOutline(state, "#00FF00");
    expect(shapeOf(next)?.borderColor).toBe("#00FF00");
    expect(shapeOf(next)?.fill).toBe("#4472C4");
  });

  it("removes the outline via null", () => {
    const state = buildShapeState();
    const next = setSelectedShapeOutline(state, null);
    expect(shapeOf(next)?.borderColor).toBeUndefined();
  });

  it("leaves the state untouched when no shape is selected", () => {
    const state = buildShapeState();
    const paragraph = getParagraphs(state)[0]!;
    const unselected: EditorState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 3),
        focus: paragraphOffsetToPosition(paragraph, 4),
      },
    };
    expect(setSelectedShapeFill(unselected, "#000000")).toBe(unselected);
    expect(setSelectedShapeOutline(unselected, "#000000")).toBe(unselected);
    expect(setSelectedShapeOutlineWidth(unselected, 3)).toBe(unselected);
  });

  it("sets the outline width in points", () => {
    const state = buildShapeState();
    const next = setSelectedShapeOutlineWidth(state, 4);
    expect(next).not.toBe(state);
    expect(shapeOf(next)?.borderWidthPt).toBe(4);
    // Other shape fields preserved.
    expect(shapeOf(next)?.borderColor).toBe("#2F528F");
    expect(shapeOf(next)?.fill).toBe("#4472C4");
  });

  it("clamps the outline width to non-negative", () => {
    const state = buildShapeState();
    const next = setSelectedShapeOutlineWidth(state, -2);
    expect(shapeOf(next)?.borderWidthPt).toBe(0);
  });
});
