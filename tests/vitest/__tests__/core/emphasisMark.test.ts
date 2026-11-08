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

function getMark(state: EditorState): unknown {
  return getParagraphs(state)[0]!.runs[0]!.styles?.emphasisMark;
}

describe("value character styles (format.emphasisMark)", () => {
  it("sets the emphasis mark on the selection", () => {
    const state = buildState("hello");
    const next = setTextStyleValue(state, "emphasisMark", "dot");
    expect(getMark(next)).toBe("dot");
  });

  it("supports the other available marks", () => {
    const marks: Array<"comma" | "circle" | "underDot"> = [
      "comma",
      "circle",
      "underDot",
    ];
    for (const mark of marks) {
      expect(
        getMark(setTextStyleValue(buildState("hello"), "emphasisMark", mark)),
      ).toBe(mark);
    }
  });

  it("clears the emphasis mark when a null value is passed", () => {
    const set = setTextStyleValue(buildState("hello"), "emphasisMark", "dot");
    const cleared = setTextStyleValue(set, "emphasisMark", null);
    expect(getMark(cleared)).toBeUndefined();
  });
});
