import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { toggleCharacterBorder, toggleTextStyle } from "@/core/commands/textFormatting.js";import {
  getParagraphs,
  paragraphOffsetToPosition,
  type EditorState,
} from "@/core/model.js";

function buildState(text: string): EditorState {
  const paragraph = createEditorParagraphFromRuns([{ text }]);
  const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, text.length),
    },
  };
}

describe("character toggles (format.smallCaps / format.allCaps / format.doubleStrikethrough / format.hidden / format.shadow / format.emboss / format.engrave)", () => {
  it("enables small caps on the selection", () => {
    const state = buildState("hello");
    const next = toggleTextStyle(state, "smallCaps");
    expect(getParagraphs(next)[0]!.runs[0]!.styles?.smallCaps).toBe(true);
  });

  it("disables small caps when it is already uniform", () => {
    const state = buildState("hello");
    const on = toggleTextStyle(state, "smallCaps");
    const off = toggleTextStyle(on, "smallCaps");
    expect(getParagraphs(off)[0]!.runs[0]!.styles?.smallCaps).toBeUndefined();
  });

  it("enables all caps on the selection", () => {
    const state = buildState("hello");
    const next = toggleTextStyle(state, "allCaps");
    expect(getParagraphs(next)[0]!.runs[0]!.styles?.allCaps).toBe(true);
  });

  it("enables double strikethrough on the selection", () => {
    const state = buildState("hello");
    const next = toggleTextStyle(state, "doubleStrike");
    expect(getParagraphs(next)[0]!.runs[0]!.styles?.doubleStrike).toBe(true);
  });

  it("enables hidden text on the selection", () => {
    const state = buildState("hello");
    const next = toggleTextStyle(state, "hidden");
    expect(getParagraphs(next)[0]!.runs[0]!.styles?.hidden).toBe(true);
  });

  it("disables hidden text when it is already uniform", () => {
    const state = buildState("hello");
    const on = toggleTextStyle(state, "hidden");
    const off = toggleTextStyle(on, "hidden");
    expect(getParagraphs(off)[0]!.runs[0]!.styles?.hidden).toBeUndefined();
  });

  it("enables shadow on the selection", () => {
    const state = buildState("hello");
    const next = toggleTextStyle(state, "shadow");
    expect(getParagraphs(next)[0]!.runs[0]!.styles?.shadow).toBe(true);
  });

  it("enables emboss on the selection", () => {
    const state = buildState("hello");
    const next = toggleTextStyle(state, "emboss");
    expect(getParagraphs(next)[0]!.runs[0]!.styles?.emboss).toBe(true);
  });

  it("enables engrave (imprint) on the selection", () => {
    const state = buildState("hello");
    const next = toggleTextStyle(state, "imprint");
    expect(getParagraphs(next)[0]!.runs[0]!.styles?.imprint).toBe(true);
  });

  it("enables outline on the selection", () => {
    const state = buildState("hello");
    const next = toggleTextStyle(state, "outline");
    expect(getParagraphs(next)[0]!.runs[0]!.styles?.outline).toBe(true);
  });

  it("disables outline when it is already uniform", () => {
    const state = buildState("hello");
    const on = toggleTextStyle(state, "outline");
    const off = toggleTextStyle(on, "outline");
    expect(getParagraphs(off)[0]!.runs[0]!.styles?.outline).toBeUndefined();
  });
});

describe("character border (format.border)", () => {
  it("applies the default character border on the selection", () => {
    const state = buildState("hello");
    const next = toggleCharacterBorder(state);
    expect(getParagraphs(next)[0]!.runs[0]!.styles?.textBorder).toEqual({
      width: 0.5,
      type: "solid",
      color: "#000000",
    });
  });

  it("clears the character border when it is already uniform", () => {
    const state = buildState("hello");
    const on = toggleCharacterBorder(state);
    const off = toggleCharacterBorder(on);
    expect(getParagraphs(off)[0]!.runs[0]!.styles?.textBorder).toBeUndefined();
  });

  it("is a no-op on a collapsed selection", () => {
    const paragraph = createEditorParagraphFromRuns([{ text: "hello" }]);
    const state = createEditorStateFromDocument(
      createEditorDocument([paragraph]),
    );
    const collapsed = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 0),
        focus: paragraphOffsetToPosition(paragraph, 0),
      },
    };
    const next = toggleCharacterBorder(collapsed);
    expect(
      getParagraphs(next)[0]!.runs[0]!.styles?.textBorder,
    ).toBeUndefined();
  });
});
