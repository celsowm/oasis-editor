import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getSelectedImageBorder,
  getSelectedImageRun,
  setSelectedImageBorder,
} from "@/core/commands/image.js";
import {
  getParagraphs,
  getRunImage,
  paragraphOffsetToPosition,
  type EditorImageRunData,
  type EditorState,
} from "@/core/model.js";

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

const baseImage: EditorImageRunData = {
  src: "asset:1",
  width: 200,
  height: 100,
};

function borderOf(state: EditorState): EditorImageRunData["border"] {
  const run = getSelectedImageRun(state)!;
  return getRunImage(run.run)!.border;
}

describe("setSelectedImageBorder", () => {
  it("creates a border from a colour alone", () => {
    const next = setSelectedImageBorder(buildImageState(baseImage), {
      color: "#C00000",
    });
    expect(borderOf(next)).toEqual({ color: "#C00000" });
  });

  it("merges a weight onto an existing border, keeping the colour", () => {
    const withColor = setSelectedImageBorder(buildImageState(baseImage), {
      color: "#C00000",
    });
    const withWeight = setSelectedImageBorder(withColor, { widthPt: 2.25 });
    expect(borderOf(withWeight)).toEqual({ color: "#C00000", widthPt: 2.25 });

    const withDash = setSelectedImageBorder(withWeight, { dash: "lgDashDot" });
    expect(borderOf(withDash)).toEqual({
      color: "#C00000",
      widthPt: 2.25,
      dash: "lgDashDot",
    });
  });

  it("falls back to black when a weight is chosen before any colour", () => {
    const next = setSelectedImageBorder(buildImageState(baseImage), {
      widthPt: 3,
    });
    expect(borderOf(next)).toEqual({ color: "#000000", widthPt: 3 });
  });

  it("removes the border entirely on { color: null }", () => {
    const withBorder = setSelectedImageBorder(buildImageState(baseImage), {
      color: "#C00000",
      widthPt: 3,
      dash: "dash",
    });
    const cleared = setSelectedImageBorder(withBorder, { color: null });
    expect(borderOf(cleared)).toBeUndefined();
    const run = getSelectedImageRun(cleared)!;
    expect(getRunImage(run.run)).not.toHaveProperty("border");
  });

  it("leaves the state untouched when the image is not selected", () => {
    const state = buildImageState(baseImage);
    const paragraph = getParagraphs(state)[0]!;
    // Collapse the selection inside the trailing text, past the image run.
    const unselected: EditorState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 3),
        focus: paragraphOffsetToPosition(paragraph, 4),
      },
    };
    expect(setSelectedImageBorder(unselected, { color: "#FF0000" })).toBe(
      unselected,
    );
  });

  it("preserves the selection and other image fields", () => {
    const state = buildImageState({
      ...baseImage,
      rotation: 30,
      crop: { left: 0.1 },
    });
    const next = setSelectedImageBorder(state, { color: "#4472C4" });
    const image = getRunImage(getSelectedImageRun(next)!.run)!;
    expect(image.rotation).toBe(30);
    expect(image.crop).toEqual({ left: 0.1 });
    expect(getSelectedImageBorder(next)).toEqual({ color: "#4472C4" });
  });

  it("reports null through getSelectedImageBorder when there is no border", () => {
    expect(getSelectedImageBorder(buildImageState(baseImage))).toBeNull();
  });
});
