import { describe, it, expect } from "vitest";
import { createEditorStateFromTexts } from "@/core/editorState.js";
import {
  deleteCharsBackwardRaw,
  insertTextAtSelection,
} from "@/core/commands/text.js";
import { getParagraphs, positionToParagraphOffset } from "@/core/model.js";

const textOf = (state: ReturnType<typeof createEditorStateFromTexts>): string =>
  getParagraphs(state)[0]
    .runs.map((run): string => run.text)
    .join("");

describe("deleteCharsBackwardRaw", () => {
  it("removes exactly `count` characters before the caret", () => {
    const state = createEditorStateFromTexts(["hello world"], { offset: 11 });
    const next = deleteCharsBackwardRaw(state, 5);
    expect(textOf(next)).toBe("hello ");
    const paragraph = getParagraphs(next)[0];
    expect(positionToParagraphOffset(paragraph, next.selection.focus)).toBe(6);
  });

  it("deletes from the middle, keeping the trailing text", () => {
    const state = createEditorStateFromTexts(["hello world"], { offset: 5 });
    const next = deleteCharsBackwardRaw(state, 3);
    expect(textOf(next)).toBe("he world");
  });

  it("is a no-op for a non-positive count", () => {
    const state = createEditorStateFromTexts(["hello"], { offset: 5 });
    expect(deleteCharsBackwardRaw(state, 0)).toBe(state);
    expect(deleteCharsBackwardRaw(state, -2)).toBe(state);
  });

  it("is a no-op when the paragraph has fewer characters before the caret", () => {
    const state = createEditorStateFromTexts(["hi"], { offset: 2 });
    expect(deleteCharsBackwardRaw(state, 5)).toBe(state);
  });

  it("never merges with the previous paragraph", () => {
    const state = createEditorStateFromTexts(["first", "second"], {
      anchor: { blockIndex: 1, offset: 0 },
      focus: { blockIndex: 1, offset: 0 },
    });
    const next = deleteCharsBackwardRaw(state, 1);
    expect(next).toBe(state);
    expect(getParagraphs(state)).toHaveLength(2);
  });

  it("removes styled text without marking revisions when track changes is on", () => {
    const base = createEditorStateFromTexts(["ab"], { offset: 2 });
    const withBold = insertTextAtSelection(base, "XY", { bold: true });
    const tracked = { ...withBold, trackChangesEnabled: true };
    const next = deleteCharsBackwardRaw(tracked, 2);
    expect(textOf(next)).toBe("ab");
    expect(
      getParagraphs(next)[0].runs.some((run): boolean => Boolean(run.revision)),
    ).toBe(false);
  });
});
