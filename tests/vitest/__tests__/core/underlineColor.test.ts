import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { setTextStyleValue } from "@/core/commands/textFormatting.js";
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

describe("value character styles (format.underlineColor)", () => {
  it("sets the underline color on the selection", () => {
    const state = buildState("hello");
    const next = setTextStyleValue(state, "underlineColor", "#ff0000");
    expect(getParagraphs(next)[0]!.runs[0]!.styles?.underlineColor).toBe(
      "#ff0000",
    );
  });

  it("clears the underline color when a null value is passed", () => {
    const state = setTextStyleValue(buildState("hello"), "underlineColor", "#ff0000");
    const cleared = setTextStyleValue(state, "underlineColor", null);
    expect(
      getParagraphs(cleared)[0]!.runs[0]!.styles?.underlineColor,
    ).toBeUndefined();
  });
});
