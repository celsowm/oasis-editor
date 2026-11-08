import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  canSetSelectedImageTransparency,
  getSelectedImageTransparency,
  getSelectedImageRun,
  setSelectedImageTransparency,
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

function transparencyOf(state: EditorState): number | null {
  const run = getSelectedImageRun(state)!;
  const image = getRunImage(run.run)!;
  return image.transparency ?? 0;
}

describe("selected image transparency (picture.transparency)", () => {
  it("reports the transparency of the selected image, defaulting to 0", () => {
    expect(getSelectedImageTransparency(buildImageState(baseImage))).toBe(0);
  });

  it("reports the stored transparency value", () => {
    const state = buildImageState({ ...baseImage, transparency: 0.45 });
    expect(getSelectedImageTransparency(state)).toBe(0.45);
  });

  it("exposes a capability only when an image is selected", () => {
    const state = buildImageState(baseImage);
    expect(canSetSelectedImageTransparency(state)).toBe(true);

    const paragraph = getParagraphs(state)[0]!;
    const unselected: EditorState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 3),
        focus: paragraphOffsetToPosition(paragraph, 4),
      },
    };
    expect(canSetSelectedImageTransparency(unselected)).toBe(false);
  });

  it("sets the transparency on the selected image", () => {
    const state = buildImageState(baseImage);
    const next = setSelectedImageTransparency(state, 0.5);
    expect(next).not.toBe(state);
    expect(transparencyOf(next)).toBe(0.5);
  });

  it("clamps transparency to at most 1", () => {
    const state = buildImageState(baseImage);
    const next = setSelectedImageTransparency(state, 2);
    expect(transparencyOf(next)).toBe(1);
  });

  it("removes transparency when set to zero (restores full opacity)", () => {
    const state = buildImageState({ ...baseImage, transparency: 0.4 });
    const next = setSelectedImageTransparency(state, 0);
    const run = getSelectedImageRun(next)!;
    const image = getRunImage(run.run)!;
    expect(image.transparency).toBeUndefined();
    expect(getSelectedImageTransparency(next)).toBe(0);
  });

  it("preserves other image fields", () => {
    const state = buildImageState({
      ...baseImage,
      rotation: 45,
      border: { color: "#ff0000", widthPt: 2 },
    });
    const next = setSelectedImageTransparency(state, 0.2);
    const image = getRunImage(getSelectedImageRun(next)!.run)!;
    expect(image.rotation).toBe(45);
    expect(image.border).toEqual({ color: "#ff0000", widthPt: 2 });
    expect(image.transparency).toBe(0.2);
  });

  it("leaves the state untouched when the image is not selected", () => {
    const state = buildImageState(baseImage);
    const paragraph = getParagraphs(state)[0]!;
    const unselected: EditorState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 3),
        focus: paragraphOffsetToPosition(paragraph, 4),
      },
    };
    expect(setSelectedImageTransparency(unselected, 0.5)).toBe(unselected);
  });
});
