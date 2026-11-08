import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  canResetSelectedImage,
  getSelectedImageRun,
  resetSelectedImage,
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

describe("reset selected picture (picture.reset)", () => {
  it("exposes a capability only when an image is selected", () => {
    const state = buildImageState(baseImage);
    expect(canResetSelectedImage(state)).toBe(true);

    const paragraph = getParagraphs(state)[0]!;
    const unselected: EditorState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 3),
        focus: paragraphOffsetToPosition(paragraph, 4),
      },
    };
    expect(canResetSelectedImage(unselected)).toBe(false);
  });

  it("clears crop, mask, fit/fill mode and transparency", () => {
    const state = buildImageState({
      ...baseImage,
      crop: { left: 0.1, right: 0.2 },
      cropShape: { preset: "ellipse" },
      cropFit: "fill",
      transparency: 0.4,
    });
    const next = resetSelectedImage(state);
    expect(next).not.toBe(state);
    const image = getRunImage(getSelectedImageRun(next)!.run)!;
    expect(image.crop).toBeUndefined();
    expect(image.cropShape).toBeUndefined();
    expect(image.cropFit).toBeUndefined();
    expect(image.transparency).toBeUndefined();
  });

  it("clears border, rotation and flips", () => {
    const state = buildImageState({
      ...baseImage,
      border: { color: "#ff0000", widthPt: 2 },
      rotation: 45,
      flipH: true,
      flipV: true,
    });
    const next = resetSelectedImage(state);
    const image = getRunImage(getSelectedImageRun(next)!.run)!;
    expect(image.border).toBeUndefined();
    expect(image.rotation).toBeUndefined();
    expect(image.flipH).toBeUndefined();
    expect(image.flipV).toBeUndefined();
  });

  it("preserves box size and floating layout", () => {
    const state = buildImageState({
      ...baseImage,
      width: 300,
      height: 150,
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: 0 },
        positionV: { relativeFrom: "paragraph", offset: 0 },
      },
    });
    const next = resetSelectedImage(state);
    const image = getRunImage(getSelectedImageRun(next)!.run)!;
    expect(image.width).toBe(300);
    expect(image.height).toBe(150);
    expect(image.floating?.wrap).toBe("square");
  });

  it("leaves the state untouched when no image is selected", () => {
    const state = buildImageState(baseImage);
    const paragraph = getParagraphs(state)[0]!;
    const unselected: EditorState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 3),
        focus: paragraphOffsetToPosition(paragraph, 4),
      },
    };
    expect(resetSelectedImage(unselected)).toBe(unselected);
  });

  it("is idempotent on a plain picture", () => {
    const state = buildImageState(baseImage);
    const next = resetSelectedImage(state);
    expect(next).not.toBe(state);
    const image = getRunImage(getSelectedImageRun(next)!.run)!;
    expect(image.crop).toBeUndefined();
    expect(image.border).toBeUndefined();
    expect(image.width).toBe(200);
  });
});
