import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  canFlipSelectedImage,
  flipSelectedImage,
  getSelectedImageFlip,
  getSelectedImageRun,
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

function flipOf(state: EditorState): { flipH: boolean; flipV: boolean } {
  const run = getSelectedImageRun(state)!;
  const image = getRunImage(run.run)!;
  return { flipH: Boolean(image.flipH), flipV: Boolean(image.flipV) };
}

describe("flipSelectedImage", () => {
  it("reports the flip state of the selected image, defaulting to false", () => {
    expect(getSelectedImageFlip(buildImageState(baseImage))).toEqual({
      flipH: false,
      flipV: false,
    });
  });

  it("exposes a capability only when an image is selected", () => {
    const state = buildImageState(baseImage);
    expect(canFlipSelectedImage(state)).toBe(true);

    const paragraph = getParagraphs(state)[0]!;
    const unselected: EditorState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 3),
        focus: paragraphOffsetToPosition(paragraph, 4),
      },
    };
    expect(canFlipSelectedImage(unselected)).toBe(false);
  });

  it("flips horizontally, toggling back on a repeat", () => {
    const state = buildImageState(baseImage);
    expect(flipOf(state)).toEqual({ flipH: false, flipV: false });

    const flipped = flipSelectedImage(state, "horizontal");
    expect(flipOf(flipped)).toEqual({ flipH: true, flipV: false });

    const unflipped = flipSelectedImage(flipped, "horizontal");
    expect(flipOf(unflipped)).toEqual({ flipH: false, flipV: false });
  });

  it("flips vertically independently of horizontal", () => {
    const state = buildImageState({
      ...baseImage,
      flipH: true,
    });
    const next = flipSelectedImage(state, "vertical");
    expect(flipOf(next)).toEqual({ flipH: true, flipV: true });
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
    expect(flipSelectedImage(unselected, "horizontal")).toBe(unselected);
  });

  it("preserves other image fields", () => {
    const state = buildImageState({
      ...baseImage,
      rotation: 45,
      crop: { left: 0.2 },
    });
    const next = flipSelectedImage(state, "horizontal");
    const image = getRunImage(getSelectedImageRun(next)!.run)!;
    expect(image.rotation).toBe(45);
    expect(image.crop).toEqual({ left: 0.2 });
    expect(flipOf(next).flipH).toBe(true);
  });
});
