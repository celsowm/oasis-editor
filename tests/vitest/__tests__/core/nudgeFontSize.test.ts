import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getParagraphs,
  paragraphOffsetToPosition,
  type EditorState,
} from "@/core/model.js";
import { nudgeFontSize } from "@/core/commands/textFormatting.js";
import { PT_PER_PX } from "@/core/units.js";

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

function fontSizePt(state: EditorState): number {
  const run = getParagraphs(state)[0]!.runs[0]!;
  const px = run.styles?.fontSize ?? 11 / PT_PER_PX;
  return Math.round(px * PT_PER_PX * 100) / 100;
}

describe("font size nudge (format.growFont1 / shrinkFont1)", () => {
  it("grows the selection font size by exactly 1 point", () => {
    const next = nudgeFontSize(buildState("hello"), 1);
    expect(fontSizePt(next)).toBe(12);
  });

  it("shrinks the selection font size by exactly 1 point", () => {
    const next = nudgeFontSize(buildState("hello"), -1);
    expect(fontSizePt(next)).toBe(10);
  });

  it("is a no-op on a collapsed selection", () => {
    const state = buildState("hello");
    const collapsed = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(getParagraphs(state)[0]!, 1),
        focus: paragraphOffsetToPosition(getParagraphs(state)[0]!, 1),
      },
    };
    expect(nudgeFontSize(collapsed, 1)).toBe(collapsed);
  });

  it("clamps to Word's 1-1638 pt range on repeated growth", () => {
    const next = nudgeFontSize(buildState("hello"), 1637);
    expect(fontSizePt(next)).toBe(1638);
    const shrunk = nudgeFontSize(buildState("hello"), -100);
    expect(fontSizePt(shrunk)).toBe(1);
  });
});
