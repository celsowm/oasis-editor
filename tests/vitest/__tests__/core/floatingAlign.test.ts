import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  alignSelectedFloatingObject,
  canAlignSelectedFloatingObject,
  canNudgeSelectedFloatingObject,
  canSetSelectedFloatingFixedPosition,
  canSetSelectedFloatingPositionPreset,
  canSetSelectedFloatingRotation,
  canSetSelectedFloatingWrap,
  canSetSelectedFloatingWrapText,
  getSelectedFloatingWrapPreset,
  getSelectedFloatingWrapText,
  isSelectedFloatingFixedPosition,
  nudgeSelectedFloatingObject,
  setSelectedFloatingFixedPosition,
  setSelectedFloatingPositionPreset,
  setSelectedFloatingRotation,
  setSelectedFloatingWrapPreset,
  setSelectedFloatingWrapText,
} from "@/core/commands/floatingAlignCommands.js";
import {
  getParagraphs,
  getRunImage,
  getRunTextBox,
  paragraphOffsetToPosition,
  type EditorImageRunData,
  type EditorState,
  type EditorTextBoxData,
} from "@/core/model.js";

function placeOn(state: EditorState, offset: number): EditorState {
  const paragraph = getParagraphs(state)[0]!;
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, offset),
      focus: paragraphOffsetToPosition(paragraph, offset + 1),
    },
  };
}

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

function buildTextBoxState(textBox: EditorTextBoxData): EditorState {
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

const baseImage: EditorImageRunData = { src: "asset:1", width: 200, height: 100 };

describe("align floating object", () => {
  it("exposes a capability for an inline image selection", () => {
    expect(canAlignSelectedFloatingObject(buildImageState(baseImage))).toBe(
      true,
    );
  });

  it("exposes a capability for a text box selection", () => {
    const textBox: EditorTextBoxData = { width: 150, height: 100, blocks: [] };
    expect(canAlignSelectedFloatingObject(buildTextBoxState(textBox))).toBe(
      true,
    );
  });

  it("denies the capability for a plain text selection", () => {
    const state = buildImageState(baseImage);
    expect(canAlignSelectedFloatingObject(placeOn(state, 3))).toBe(false);
  });

  it("floats an inline image and aligns it to the margin center", () => {
    const state = buildImageState(baseImage);
    const next = alignSelectedFloatingObject(state, "center");
    expect(next).not.toBe(state);
    const run = getParagraphs(next)[0]!.runs[0]!;
    const image = getRunImage(run)!;
    expect(image.floating).toBeDefined();
    expect(image.floating?.wrap).toBe("square");
    expect(image.floating?.positionH).toEqual({
      relativeFrom: "margin",
      align: "center",
      offset: 0,
    });
  });

  it("aligns a floating image left", () => {
    const floatingImage: EditorImageRunData = {
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: 0 },
        positionV: { relativeFrom: "paragraph", offset: 0 },
      },
    };
    const state = buildImageState(floatingImage);
    const next = alignSelectedFloatingObject(state, "left");
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating?.positionH?.align).toBe("left");
    expect(image.floating?.positionH?.relativeFrom).toBe("margin");
  });

  it("aligns a text box right", () => {
    const textBox: EditorTextBoxData = { width: 150, height: 100, blocks: [] };
    const state = buildTextBoxState(textBox);
    const next = alignSelectedFloatingObject(state, "right");
    const run = getParagraphs(next)[0]!.runs[0]!;
    const box = getRunTextBox(run)!;
    expect(box.floating?.positionH?.align).toBe("right");
    expect(box.floating?.positionH?.relativeFrom).toBe("margin");
  });

  it("leaves the state untouched when no object is selected", () => {
    const state = buildImageState(baseImage);
    const plain = placeOn(state, 3);
    expect(alignSelectedFloatingObject(plain, "center")).toBe(plain);
  });
});

describe("nudge floating object", () => {
  const EMU = 9525;

  it("exposes a capability for an inline image selection", () => {
    expect(canNudgeSelectedFloatingObject(buildImageState(baseImage))).toBe(
      true,
    );
  });

  it("denies the capability for a plain text selection", () => {
    const state = buildImageState(baseImage);
    expect(canNudgeSelectedFloatingObject(placeOn(state, 3))).toBe(false);
  });

  it("floats an inline image and shifts its offsets by the pixel delta", () => {
    const state = buildImageState(baseImage);
    const next = nudgeSelectedFloatingObject(state, 10, -5);
    expect(next).not.toBe(state);
    const run = getParagraphs(next)[0]!.runs[0]!;
    const image = getRunImage(run)!;
    expect(image.floating?.wrap).toBe("square");
    expect(image.floating?.positionH?.offset).toBe(10 * EMU);
    expect(image.floating?.positionV?.offset).toBe(-5 * EMU);
  });

  it("adds to existing offsets on a floating object", () => {
    const floatingImage: EditorImageRunData = {
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: 100 },
        positionV: { relativeFrom: "paragraph", offset: 50 },
      },
    };
    const state = buildImageState(floatingImage);
    const next = nudgeSelectedFloatingObject(state, 1, 2);
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating?.positionH?.offset).toBe(100 + EMU);
    expect(image.floating?.positionV?.offset).toBe(50 + 2 * EMU);
  });

  it("nudges a text box", () => {
    const textBox: EditorTextBoxData = { width: 150, height: 100, blocks: [] };
    const state = buildTextBoxState(textBox);
    const next = nudgeSelectedFloatingObject(state, 3, 0);
    const run = getParagraphs(next)[0]!.runs[0]!;
    const box = getRunTextBox(run)!;
    expect(box.floating?.positionH?.offset).toBe(3 * EMU);
  });

  it("leaves the state untouched when no object is selected", () => {
    const state = buildImageState(baseImage);
    const plain = placeOn(state, 3);
    expect(nudgeSelectedFloatingObject(plain, 1, 1)).toBe(plain);
  });
});

describe("floating object fixed position (move with text)", () => {
  it("exposes a capability for a floating image selection", () => {
    const floatingImage: EditorImageRunData = {
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        positionV: { relativeFrom: "paragraph", offset: 0 },
      },
    };
    expect(
      canSetSelectedFloatingFixedPosition(buildImageState(floatingImage)),
    ).toBe(true);
  });

  it("denies the capability for a plain text selection", () => {
    const state = buildImageState(baseImage);
    expect(
      canSetSelectedFloatingFixedPosition(placeOn(state, 3)),
    ).toBe(false);
  });

  it("reports the current fixed state from the vertical anchor", () => {
    const floatingImage: EditorImageRunData = {
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        positionV: { relativeFrom: "page", offset: 0 },
      },
    };
    expect(
      isSelectedFloatingFixedPosition(buildImageState(floatingImage)),
    ).toBe(true);
  });

  it("pins a floating image to the page", () => {
    const floatingImage: EditorImageRunData = {
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        positionV: { relativeFrom: "paragraph", offset: 10 },
      },
    };
    const next = setSelectedFloatingFixedPosition(
      buildImageState(floatingImage),
      true,
    );
    expect(next).not.toBe(buildImageState(floatingImage));
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating?.positionV?.relativeFrom).toBe("page");
  });

  it("returns a text box to moving with the text", () => {
    const textBox: EditorTextBoxData = {
      width: 150,
      height: 100,
      blocks: [],
      floating: {
        type: "floating",
        wrap: "square",
        positionV: { relativeFrom: "page", offset: 0 },
      },
    };
    const pinned = setSelectedFloatingFixedPosition(
      buildTextBoxState(textBox),
      false,
    );
    const box = getRunTextBox(getParagraphs(pinned)[0]!.runs[0]!)!;
    expect(box.floating?.positionV?.relativeFrom).toBe("paragraph");
  });

  it("leaves the state untouched when no object is selected", () => {
    const state = buildImageState(baseImage);
    const plain = placeOn(state, 3);
    expect(setSelectedFloatingFixedPosition(plain, true)).toBe(plain);
  });
});

describe("floating object exact rotation", () => {
  it("exposes a capability for an image selection", () => {
    expect(canSetSelectedFloatingRotation(buildImageState(baseImage))).toBe(
      true,
    );
  });

  it("denies the capability for a plain text selection", () => {
    const state = buildImageState(baseImage);
    expect(canSetSelectedFloatingRotation(placeOn(state, 3))).toBe(false);
  });

  it("sets the exact rotation of a selected image", () => {
    const state = buildImageState(baseImage);
    const next = setSelectedFloatingRotation(state, 45);
    expect(next).not.toBe(state);
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.rotation).toBe(45);
  });

  it("sets the exact rotation of a selected text box", () => {
    const textBox: EditorTextBoxData = {
      width: 150,
      height: 100,
      blocks: [],
      rotation: 90,
    };
    const state = buildTextBoxState(textBox);
    const next = setSelectedFloatingRotation(state, 270);
    const box = getRunTextBox(getParagraphs(next)[0]!.runs[0]!)!;
    expect(box.rotation).toBe(270);
  });

  it("normalizes angles into the [0, 360) range", () => {
    const state = buildImageState(baseImage);
    const next = setSelectedFloatingRotation(state, 405);
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.rotation).toBe(45);
  });

  it("leaves the state untouched when no object is selected", () => {
    const state = buildImageState(baseImage);
    const plain = placeOn(state, 3);
    expect(setSelectedFloatingRotation(plain, 90)).toBe(plain);
  });
});

describe("floating object wrap preset", () => {
  it("exposes a capability for an inline image selection", () => {
    expect(canSetSelectedFloatingWrap(buildImageState(baseImage))).toBe(true);
  });

  it("denies the capability for a plain text selection", () => {
    const state = buildImageState(baseImage);
    expect(canSetSelectedFloatingWrap(placeOn(state, 3))).toBe(false);
  });

  it("reads the current wrap preset (inline for a non-floating image)", () => {
    expect(getSelectedFloatingWrapPreset(buildImageState(baseImage))).toBe(
      "inline",
    );
  });

  it("sets a square wrap on an inline image", () => {
    const state = buildImageState(baseImage);
    const next = setSelectedFloatingWrapPreset(state, "square");
    expect(next).not.toBe(state);
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating?.wrap).toBe("square");
    expect(getSelectedFloatingWrapPreset(next)).toBe("square");
  });

  it("returns a floating object to inline (removes the floating field)", () => {
    const floatingImage: EditorImageRunData = {
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: 0 },
        positionV: { relativeFrom: "paragraph", offset: 0 },
      },
    };
    const state = buildImageState(floatingImage);
    const next = setSelectedFloatingWrapPreset(state, "inline");
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating).toBeUndefined();
  });

  it("sets a behind-text wrap on a text box", () => {
    const textBox: EditorTextBoxData = {
      width: 150,
      height: 100,
      blocks: [],
    };
    const state = buildTextBoxState(textBox);
    const next = setSelectedFloatingWrapPreset(state, "behind");
    const box = getRunTextBox(getParagraphs(next)[0]!.runs[0]!)!;
    expect(box.floating?.wrap).toBe("none");
    expect(box.floating?.behindDoc).toBe(true);
  });

  it("leaves the state untouched when no object is selected", () => {
    const state = buildImageState(baseImage);
    const plain = placeOn(state, 3);
    expect(setSelectedFloatingWrapPreset(plain, "square")).toBe(plain);
  });
});

describe("floating object wrap text (arrange.wrapText)", () => {
  it("defaults to bothSides for a square-wrapped floating image", () => {
    const state = buildImageState({
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: 0 },
        positionV: { relativeFrom: "paragraph", offset: 0 },
      },
    });
    expect(getSelectedFloatingWrapText(state)).toBe("bothSides");
  });

  it("exposes a capability for an inline image selection", () => {
    expect(canSetSelectedFloatingWrapText(buildImageState(baseImage))).toBe(
      true,
    );
  });

  it("denies the capability for a plain text selection", () => {
    const state = buildImageState(baseImage);
    expect(canSetSelectedFloatingWrapText(placeOn(state, 3))).toBe(false);
  });

  it("reads the stored wrap side", () => {
    const state = buildImageState({
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        wrapText: "left",
        positionH: { relativeFrom: "column", offset: 0 },
        positionV: { relativeFrom: "paragraph", offset: 0 },
      },
    });
    expect(getSelectedFloatingWrapText(state)).toBe("left");
  });

  it("sets the wrap side on a floating image", () => {
    const state = buildImageState({
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: 0 },
        positionV: { relativeFrom: "paragraph", offset: 0 },
      },
    });
    const next = setSelectedFloatingWrapText(state, "right");
    expect(next).not.toBe(state);
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating?.wrapText).toBe("right");
    expect(getSelectedFloatingWrapText(next)).toBe("right");
  });

  it("sets the wrap side on a floating text box", () => {
    const textBox: EditorTextBoxData = {
      width: 150,
      height: 100,
      blocks: [],
      floating: {
        type: "floating",
        wrap: "tight",
        positionH: { relativeFrom: "column", offset: 0 },
        positionV: { relativeFrom: "paragraph", offset: 0 },
      },
    };
    const state = buildTextBoxState(textBox);
    const next = setSelectedFloatingWrapText(state, "largest");
    const box = getRunTextBox(getParagraphs(next)[0]!.runs[0]!)!;
    expect(box.floating?.wrapText).toBe("largest");
  });

  it("clears the wrap side back to bothSides, preserving the floating layout", () => {
    const state = buildImageState({
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        wrapText: "left",
        positionH: { relativeFrom: "column", offset: 0 },
        positionV: { relativeFrom: "paragraph", offset: 0 },
      },
    });
    const next = setSelectedFloatingWrapText(state, "bothSides");
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating?.wrap).toBe("square");
    expect(image.floating?.wrapText).toBeUndefined();
    expect(getSelectedFloatingWrapText(next)).toBe("bothSides");
  });

  it("leaves the state untouched when no object is selected", () => {
    const state = buildImageState(baseImage);
    const plain = placeOn(state, 3);
    expect(setSelectedFloatingWrapText(plain, "left")).toBe(plain);
  });
});

describe("floating object position preset (arrange.position)", () => {
  it("exposes a capability for an inline image selection", () => {
    expect(
      canSetSelectedFloatingPositionPreset(buildImageState(baseImage)),
    ).toBe(true);
  });

  it("denies the capability for a plain text selection", () => {
    const state = buildImageState(baseImage);
    expect(canSetSelectedFloatingPositionPreset(placeOn(state, 3))).toBe(
      false,
    );
  });

  it("promotes an inline image to a floating object at the top-left", () => {
    const state = buildImageState(baseImage);
    const next = setSelectedFloatingPositionPreset(state, "topLeft");
    expect(next).not.toBe(state);
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating?.type).toBe("floating");
    expect(image.floating?.wrap).toBe("square");
    expect(image.floating?.positionH?.relativeFrom).toBe("margin");
    expect(image.floating?.positionH?.align).toBe("left");
    expect(image.floating?.positionV?.relativeFrom).toBe("margin");
    expect(image.floating?.positionV?.align).toBe("top");
  });

  it("sets the middle-right preset on a text box", () => {
    const textBox: EditorTextBoxData = {
      width: 150,
      height: 100,
      blocks: [],
    };
    const state = buildTextBoxState(textBox);
    const next = setSelectedFloatingPositionPreset(state, "middleRight");
    const box = getRunTextBox(getParagraphs(next)[0]!.runs[0]!)!;
    expect(box.floating?.positionH?.align).toBe("right");
    expect(box.floating?.positionV?.align).toBe("ctr");
  });

  it("sets the bottom-center preset", () => {
    const state = buildImageState(baseImage);
    const next = setSelectedFloatingPositionPreset(state, "bottomCenter");
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating?.positionH?.align).toBe("center");
    expect(image.floating?.positionV?.align).toBe("bottom");
  });

  it("leaves the state untouched when no object is selected", () => {
    const state = buildImageState(baseImage);
    const plain = placeOn(state, 3);
    expect(setSelectedFloatingPositionPreset(plain, "topLeft")).toBe(plain);
  });
});
