import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { toggleTextStyle } from "@/core/commands/textFormatting.js";
import {
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

describe("character toggles (format.smallCaps / format.allCaps / format.doubleStrikethrough / format.hidden)", () => {
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
});
