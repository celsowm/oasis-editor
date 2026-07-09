import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  applySelectedImageCropAspect,
  computeImageAspectCrop,
  getSelectedImageCrop,
  getSelectedImageRun,
  getSelectedImageSizeCm,
  setSelectedImageCrop,
  setSelectedImageHeightCm,
  setSelectedImageWidthCm,
} from "@/core/commands/image.js";
import { PX_PER_CM } from "@/core/units.js";
import {
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

const baseImage: EditorImageRunData = { src: "asset:1", width: 200, height: 100 };

function selectedImage(state: EditorState): EditorImageRunData {
  return getRunImage(getSelectedImageRun(state)!.run)!;
}

describe("image size (cm) commands", () => {
  it("reports the displayed size in centimetres", () => {
    const size = getSelectedImageSizeCm(buildImageState(baseImage));
    expect(size?.width).toBeCloseTo(200 / PX_PER_CM, 5);
    expect(size?.height).toBeCloseTo(100 / PX_PER_CM, 5);
  });

  it("sets width in cm and scales height to keep the aspect ratio", () => {
    const cm = 4;
    const next = setSelectedImageWidthCm(buildImageState(baseImage), cm);
    const image = selectedImage(next);
    expect(image.width).toBe(Math.round(cm * PX_PER_CM));
    // Original 2:1 ratio preserved (within integer-px rounding).
    expect(image.width / image.height).toBeCloseTo(2, 1);
  });

  it("sets height in cm and scales width to keep the aspect ratio", () => {
    const cm = 3;
    const next = setSelectedImageHeightCm(buildImageState(baseImage), cm);
    const image = selectedImage(next);
    expect(image.height).toBe(Math.round(cm * PX_PER_CM));
    expect(image.width / image.height).toBeCloseTo(2, 1);
  });

  it("ignores non-positive values", () => {
    const state = buildImageState(baseImage);
    expect(setSelectedImageWidthCm(state, 0)).toBe(state);
    expect(setSelectedImageHeightCm(state, -1)).toBe(state);
  });
});

describe("image crop commands", () => {
  it("stores and clears crop fractions", () => {
    const state = buildImageState(baseImage);
    expect(getSelectedImageCrop(state)).toBeNull();

    const cropped = setSelectedImageCrop(state, {
      crop: { left: 0.1, right: 0.1, top: 0, bottom: 0 },
    });
    expect(getSelectedImageCrop(cropped)).toMatchObject({
      left: 0.1,
      right: 0.1,
    });

    const cleared = setSelectedImageCrop(cropped, { crop: null });
    expect(getSelectedImageCrop(cleared)).toBeNull();
  });

  it("applies a centred crop for a narrower aspect ratio", () => {
    // 200x100 (ratio 2) → 16:9 (~1.778) is less wide than the box, so it trims
    // left/right and shrinks the box width, centred.
    const update = computeImageAspectCrop(baseImage, 16 / 9);
    expect(update.width).toBeCloseTo(100 * (16 / 9), 2);
    expect(update.crop?.left).toBeCloseTo(update.crop?.right ?? 0, 5);
    expect(update.crop?.top ?? 0).toBe(0);
  });

  it("trims top/bottom for a taller target ratio", () => {
    // ratio 2 → 3:1 (wider target) means trim top/bottom, shrink height.
    const update = computeImageAspectCrop(baseImage, 3);
    expect(update.height).toBeCloseTo(200 / 3, 2);
    expect(update.crop?.top).toBeCloseTo(update.crop?.bottom ?? 0, 5);
    expect(update.crop?.left ?? 0).toBe(0);
  });

  it("resets the crop via the reset preset", () => {
    const cropped = setSelectedImageCrop(buildImageState(baseImage), {
      crop: { left: 0.2 },
    });
    const reset = applySelectedImageCropAspect(cropped, "reset");
    expect(getSelectedImageCrop(reset)).toBeNull();
  });
});
