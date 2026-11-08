import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  canRotateSelectedImage,
  getSelectedImageRotation,
  getSelectedImageRun,
  rotateSelectedImageByStep,
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

function rotationOf(state: EditorState): number {
  const run = getSelectedImageRun(state)!;
  return getRunImage(run.run)!.rotation ?? 0;
}

describe("rotateSelectedImageByStep", () => {
  it("exposes a capability only when an image is selected", () => {
    const state = buildImageState(baseImage);
    expect(canRotateSelectedImage(state)).toBe(true);

    const paragraph = getParagraphs(state)[0]!;
    const unselected: EditorState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 3),
        focus: paragraphOffsetToPosition(paragraph, 4),
      },
    };
    expect(canRotateSelectedImage(unselected)).toBe(false);
  });

  it("rotates left counter-clockwise by 90 degrees", () => {
    const state = buildImageState(baseImage);
    const next = rotateSelectedImageByStep(state, "left");
    expect(next).not.toBe(state);
    expect(rotationOf(next)).toBe(90);
  });

  it("rotates right clockwise by 90 degrees", () => {
    const state = buildImageState({ ...baseImage, rotation: 90 });
    const next = rotateSelectedImageByStep(state, "right");
    expect(rotationOf(next)).toBe(0);
  });

  it("wraps angles back into the [0, 360) range", () => {
    const state = buildImageState({ ...baseImage, rotation: 350 });
    const next = rotateSelectedImageByStep(state, "right");
    expect(rotationOf(next)).toBe(260);
  });

  it("honours a custom step", () => {
    const state = buildImageState(baseImage);
    const next = rotateSelectedImageByStep(state, "left", 45);
    expect(rotationOf(next)).toBe(45);
  });

  it("reports the current rotation through getSelectedImageRotation", () => {
    const state = buildImageState({ ...baseImage, rotation: 45 });
    expect(getSelectedImageRotation(state)).toBe(45);
    expect(getSelectedImageRotation(buildImageState(baseImage))).toBe(0);
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
    expect(rotateSelectedImageByStep(unselected, "left")).toBe(unselected);
  });
});
