import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { applyHorizontalLine } from "@/core/commands/horizontalLine.js";
import {
  getParagraphs,
  paragraphOffsetToPosition,
  type EditorState,
} from "@/core/model.js";

function buildState(text: string): EditorState {
  const paragraph = createEditorParagraphFromRuns([{ text }]);
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, text.length),
    },
  };
}

describe("horizontal line (insert.horizontalLine)", () => {
  it("applies a single 1.5pt bottom border to the selected paragraph", () => {
    const state = buildState("hello");
    const next = applyHorizontalLine(state);
    expect(getParagraphs(next)[0]!.style?.borderBottom).toEqual({
      width: 1.5,
      type: "solid",
      color: "#000000",
    });
  });

  it("leaves the other paragraph borders untouched", () => {
    const state = buildState("hello");
    const next = applyHorizontalLine(state);
    const style = getParagraphs(next)[0]!.style!;
    expect(style.borderTop).toBeUndefined();
    expect(style.borderRight).toBeUndefined();
    expect(style.borderLeft).toBeUndefined();
  });
});
