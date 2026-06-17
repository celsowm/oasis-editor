import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  applyMoveWithText,
  floatingToWrapPreset,
  isFloatingFixedPosition,
  wrapPresetToFloating,
  type WrapPreset,
} from "@/core/commands/floatingLayout.js";
import {
  getSelectedImageRun,
  getSelectedImageWrapPreset,
  isSelectedImageFixedPosition,
  setImageWrapPolygon,
  setSelectedImageFixedPosition,
  setSelectedImageWrapPreset,
} from "@/core/commands/image.js";
import {
  getSelectedTextBoxWrapPreset,
  setSelectedTextBoxWrapPreset,
} from "@/core/commands/textBox.js";
import {
  paragraphOffsetToPosition,
  type EditorImageRunData,
  type EditorState,
  type EditorTextBoxData,
} from "@/core/model.js";

const PRESETS: WrapPreset[] = [
  "square",
  "tight",
  "through",
  "topAndBottom",
  "behind",
  "front",
];

describe("floatingLayout preset helpers", () => {
  it("maps inline to no floating layout", () => {
    expect(wrapPresetToFloating(undefined, "inline")).toBeUndefined();
    expect(floatingToWrapPreset(undefined)).toBe("inline");
  });

  it("round-trips every floating preset", () => {
    for (const preset of PRESETS) {
      const floating = wrapPresetToFloating(undefined, preset);
      expect(floating).toBeDefined();
      expect(floating!.type).toBe("floating");
      expect(floatingToWrapPreset(floating)).toBe(preset);
    }
  });

  it("uses wrapNone + behindDoc for behind, wrapNone + !behindDoc for front", () => {
    const behind = wrapPresetToFloating(undefined, "behind")!;
    expect(behind.wrap).toBe("none");
    expect(behind.behindDoc).toBe(true);

    const front = wrapPresetToFloating(undefined, "front")!;
    expect(front.wrap).toBe("none");
    expect(front.behindDoc).toBe(false);
  });

  it("seeds a default anchor when promoting an inline object", () => {
    const floating = wrapPresetToFloating(undefined, "square")!;
    expect(floating.positionH?.relativeFrom).toBe("column");
    expect(floating.positionV?.relativeFrom).toBe("paragraph");
    expect(floating.allowOverlap).toBe(true);
  });

  it("preserves prior position when switching presets", () => {
    const start = wrapPresetToFloating(undefined, "square")!;
    const moved = applyMoveWithText(start, true);
    const next = wrapPresetToFloating(moved, "tight")!;
    expect(next.positionV?.relativeFrom).toBe("page");
    expect(next.wrap).toBe("tight");
  });

  it("toggles fixed position via positionV.relativeFrom", () => {
    const floating = wrapPresetToFloating(undefined, "square")!;
    expect(isFloatingFixedPosition(floating)).toBe(false);
    const fixed = applyMoveWithText(floating, true);
    expect(isFloatingFixedPosition(fixed)).toBe(true);
    const unfixed = applyMoveWithText(fixed, false);
    expect(isFloatingFixedPosition(unfixed)).toBe(false);
  });
});

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

const baseImage: EditorImageRunData = {
  src: "asset:1",
  width: 120,
  height: 80,
};

describe("image wrap-preset commands", () => {
  it("promotes an inline image to floating and reflects the preset", () => {
    const state = buildImageState(baseImage);
    expect(getSelectedImageWrapPreset(state)).toBe("inline");

    const next = setSelectedImageWrapPreset(state, "square");
    expect(getSelectedImageWrapPreset(next)).toBe("square");
  });

  it("returns to inline (no floating field) when choosing inline", () => {
    const floating = setSelectedImageWrapPreset(
      buildImageState(baseImage),
      "square",
    );
    const inline = setSelectedImageWrapPreset(floating, "inline");
    expect(getSelectedImageWrapPreset(inline)).toBe("inline");
  });

  it("toggles fixed position only when floating", () => {
    const floating = setSelectedImageWrapPreset(
      buildImageState(baseImage),
      "square",
    );
    expect(isSelectedImageFixedPosition(floating)).toBe(false);
    const fixed = setSelectedImageFixedPosition(floating, true);
    expect(isSelectedImageFixedPosition(fixed)).toBe(true);
  });
});

describe("setImageWrapPolygon", () => {
  it("stores and clears a wrap polygon by run id, preserving selection", () => {
    const state = buildImageState(baseImage);
    const runId = getSelectedImageRun(state)!.run.id;
    const polygon = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 },
    ];

    const withPolygon = setImageWrapPolygon(state, runId, polygon);
    expect(getSelectedImageRun(withPolygon)!.run.image?.wrapPolygon).toEqual(
      polygon,
    );
    // Selection is unchanged so the layout-options popup stays anchored.
    expect(withPolygon.selection).toEqual(state.selection);

    const cleared = setImageWrapPolygon(withPolygon, runId, []);
    expect(
      getSelectedImageRun(cleared)!.run.image?.wrapPolygon,
    ).toBeUndefined();
  });

  it("is a no-op for an unknown run id", () => {
    const state = buildImageState(baseImage);
    expect(setImageWrapPolygon(state, "does-not-exist", [{ x: 0, y: 0 }])).toBe(
      state,
    );
  });
});

describe("text box wrap-preset commands", () => {
  const textBox: EditorTextBoxData = {
    width: 200,
    height: 120,
    blocks: [createEditorParagraphFromRuns([{ text: "inside" }])],
  };

  it("promotes an inline text box to floating", () => {
    const state = buildTextBoxState(textBox);
    expect(getSelectedTextBoxWrapPreset(state)).toBe("inline");
    const next = setSelectedTextBoxWrapPreset(state, "behind");
    expect(getSelectedTextBoxWrapPreset(next)).toBe("behind");
  });
});
