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

function run(key: "characterScale" | "characterSpacing" | "baselineShift") {
  return getParagraphs(setTextStyleValue(buildState("hello"), key, 5))[0]!
    .runs[0]!.styles?.[key];
}

describe("advanced value character styles (format.scale / format.spacing / format.position)", () => {
  it("sets character scale", () => {
    const state = buildState("hello");
    const next = setTextStyleValue(state, "characterScale", 150);
    expect(getParagraphs(next)[0]!.runs[0]!.styles?.characterScale).toBe(150);
  });

  it("sets character spacing", () => {
    expect(run("characterSpacing")).toBe(5);
  });

  it("sets baseline shift (position)", () => {
    expect(run("baselineShift")).toBe(5);
  });

  it("clears each value when null is passed", () => {
    const set = setTextStyleValue(buildState("hello"), "characterScale", 150);
    const cleared = setTextStyleValue(set, "characterScale", null);
    expect(
      getParagraphs(cleared)[0]!.runs[0]!.styles?.characterScale,
    ).toBeUndefined();
  });

  it("sets and clears the text effect (w:effect)", () => {
    const state = buildState("hello");
    const next = setTextStyleValue(state, "textEffect", "sparkleText");
    expect(
      getParagraphs(next)[0]!.runs[0]!.styles?.textEffect,
    ).toBe("sparkleText");
    const cleared = setTextStyleValue(next, "textEffect", null);
    expect(
      getParagraphs(cleared)[0]!.runs[0]!.styles?.textEffect,
    ).toBeUndefined();
  });
});
