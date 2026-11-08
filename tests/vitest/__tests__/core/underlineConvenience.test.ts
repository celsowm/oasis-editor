import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { setTextStyleValue, toggleTextStyle } from "@/core/commands/textFormatting.js";
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

function applyUnderlineStyle(
  state: EditorState,
  underlineStyle: "double" | "words",
): EditorState {
  return toggleTextStyle(
    setTextStyleValue(state, "underlineStyle", underlineStyle),
    "underline",
  );
}

function underlinedRun(state: EditorState) {
  return getParagraphs(state)[0]!.runs.find((r) => r.styles?.underline);
}

describe("convenience underline toggles (format.doubleUnderline / format.wordUnderline)", () => {
  it("double underline sets underlineStyle double and enables underline", () => {
    const next = applyUnderlineStyle(buildState("hello"), "double");
    expect(underlinedRun(next)?.styles?.underline).toBe(true);
    expect(underlinedRun(next)?.styles?.underlineStyle).toBe("double");
  });

  it("word underline sets underlineStyle words and enables underline", () => {
    const next = applyUnderlineStyle(buildState("hello"), "words");
    expect(underlinedRun(next)?.styles?.underline).toBe(true);
    expect(underlinedRun(next)?.styles?.underlineStyle).toBe("words");
  });

  it("does not change the run text", () => {
    const next = applyUnderlineStyle(buildState("hello"), "double");
    expect(
      getParagraphs(next)[0]!.runs.map((r) => r.text).join(""),
    ).toBe("hello");
  });
});
