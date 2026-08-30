import { describe, expect, it } from "vitest";
import {
  applySelectedImageCropFill,
  applySelectedImageCropFit,
  getSelectedImageCropShape,
  getSelectedImageRun,
  resetSelectedImageCrop,
  setSelectedImageCropShape,
} from "@/core/commands/image.js";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getRunImage,
  paragraphOffsetToPosition,
  type EditorImageRunData,
  type EditorState,
} from "@/core/model.js";
import {
  resolveCroppedImage,
  resolveMovedImageCrop,
  type CropSessionGeometry,
} from "@/ui/cropGeometry.js";

function imageState(image: EditorImageRunData): EditorState {
  const paragraph = createEditorParagraphFromRuns([
    { text: "￼", image },
    { text: "after" },
  ]);
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, 1),
    },
  };
}

function selectedImage(state: EditorState): EditorImageRunData {
  return getRunImage(getSelectedImageRun(state)!.run)!;
}

const geometry: CropSessionGeometry = {
  handleDirection: "e",
  startWidth: 200,
  startHeight: 100,
  startCrop: { left: 0.1, right: 0.1 },
};

describe("Word-style image crop", () => {
  it("changes source crop without stretching the remaining image", () => {
    const result = resolveCroppedImage(geometry, -20, 0);
    expect(result.width).toBe(180);
    expect(result.height).toBe(100);
    expect(result.crop.left).toBeCloseTo(0.1);
    expect(result.crop.right).toBeGreaterThan(0.1);
  });

  it("moves the west and north crop edges without distorting the source", () => {
    const west = resolveCroppedImage(
      { ...geometry, handleDirection: "w" },
      -20,
      0,
    );
    expect(west.width).toBe(220);
    expect(west.crop.left).toBeLessThan(0.1);
    expect(west.crop.right).toBeCloseTo(0.1);

    const north = resolveCroppedImage(
      {
        ...geometry,
        handleDirection: "n",
        startCrop: { ...geometry.startCrop, top: 0.1 },
      },
      0,
      -10,
    );
    expect(north.height).toBe(110);
    expect(north.crop.top).toBeLessThan(0.1);
    expect(north.crop.bottom).toBeCloseTo(0);
  });

  it("moves the source image without changing the visible frame", () => {
    const result = resolveMovedImageCrop(geometry, 20, 0);
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
    expect(result.crop.left).toBeLessThan(0.1);
    expect(result.crop.right).toBeGreaterThan(0.1);
  });

  it("implements fill, fit, shape and reset", () => {
    const base = imageState({
      src: "asset:1",
      width: 200,
      height: 100,
      intrinsicWidth: 1000,
      intrinsicHeight: 1000,
    });
    const filled = applySelectedImageCropFill(base);
    expect(selectedImage(filled).crop?.top).toBeCloseTo(0.25);
    expect(selectedImage(filled).cropFit).toBe("fill");

    const fit = applySelectedImageCropFit(filled);
    expect(selectedImage(fit).crop).toBeUndefined();
    expect(selectedImage(fit).cropFit).toBe("fit");

    const shaped = setSelectedImageCropShape(fit, "ellipse");
    expect(getSelectedImageCropShape(shaped)?.preset).toBe("ellipse");

    const reset = resetSelectedImageCrop(shaped);
    expect(selectedImage(reset).crop).toBeUndefined();
    expect(selectedImage(reset).cropFit).toBeUndefined();
    expect(getSelectedImageCropShape(reset)).toBeNull();
  });
});
