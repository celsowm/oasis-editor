import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  canReorderSelectedFloatingObject,
  reorderSelectedFloatingObject,
} from "@/core/commands/floatingReorderCommands.js";
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

describe("reorder floating object", () => {
  it("exposes a capability for an inline image selection", () => {
    expect(
      canReorderSelectedFloatingObject(buildImageState(baseImage)),
    ).toBe(true);
  });

  it("exposes a capability for a text box selection", () => {
    const textBox: EditorTextBoxData = { width: 150, height: 100, blocks: [] };
    expect(
      canReorderSelectedFloatingObject(buildTextBoxState(textBox)),
    ).toBe(true);
  });

  it("denies the capability for a plain text selection", () => {
    const state = buildImageState(baseImage);
    expect(canReorderSelectedFloatingObject(placeOn(state, 3))).toBe(false);
  });

  it("brings an inline image to the front", () => {
    const state = buildImageState(baseImage);
    const next = reorderSelectedFloatingObject(state, "front");
    expect(next).not.toBe(state);
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating).toBeDefined();
    expect(image.floating?.wrap).toBe("none");
    expect(image.floating?.behindDoc).toBe(false);
  });

  it("sends a floating image behind the text", () => {
    const floatingImage: EditorImageRunData = {
      ...baseImage,
      floating: {
        type: "floating",
        wrap: "square",
        behindDoc: false,
        positionH: { relativeFrom: "column", offset: 0 },
        positionV: { relativeFrom: "paragraph", offset: 0 },
      },
    };
    const state = buildImageState(floatingImage);
    const next = reorderSelectedFloatingObject(state, "back");
    const image = getRunImage(getParagraphs(next)[0]!.runs[0]!)!;
    expect(image.floating?.behindDoc).toBe(true);
    expect(image.floating?.wrap).toBe("none");
  });

  it("sends a text box behind and brings it forward again", () => {
    const textBox: EditorTextBoxData = { width: 150, height: 100, blocks: [] };
    const back = reorderSelectedFloatingObject(
      buildTextBoxState(textBox),
      "back",
    );
    const box = getRunTextBox(getParagraphs(back)[0]!.runs[0]!)!;
    expect(box.floating?.behindDoc).toBe(true);
    const front = reorderSelectedFloatingObject(back, "front");
    const boxFront = getRunTextBox(getParagraphs(front)[0]!.runs[0]!)!;
    expect(boxFront.floating?.behindDoc).toBe(false);
  });

  it("leaves the state untouched when no object is selected", () => {
    const state = buildImageState(baseImage);
    const plain = placeOn(state, 3);
    expect(reorderSelectedFloatingObject(plain, "front")).toBe(plain);
  });
});
