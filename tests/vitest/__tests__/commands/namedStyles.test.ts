import { describe, expect, it } from "vitest";
import { createEditorStateFromParagraphRuns } from "@/core/editorState.js";
import { setTextStyleValue } from "@/core/commands/textFormatting.js";
import { setParagraphNamedStyle } from "@/core/commands/block.js";
import { getParagraphs } from "@/core/model.js";
import { getToolbarStyleState } from "@/ui/toolbarStyleState.js";

describe("named style commands", () => {
  it("applies a character style to every selected run", () => {
    const state = createEditorStateFromParagraphRuns(
      [[{ text: "Alpha" }, { text: " Beta" }]],
      {
        anchor: { blockIndex: 0, offset: 0 },
        focus: { blockIndex: 0, offset: 10 },
      },
    );
    const next = setTextStyleValue(state, "styleId", "Emphasis");
    expect(getParagraphs(next)[0]?.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          styles: expect.objectContaining({ styleId: "Emphasis" }),
        }),
      ]),
    );
    expect(
      getParagraphs(next)[0]?.runs.every(
        (run) => run.styles?.styleId === "Emphasis",
      ),
    ).toBe(true);
  });

  it("distinguishes mixed paragraph styles from Normal", () => {
    const state = createEditorStateFromParagraphRuns(
      [[{ text: "One" }], [{ text: "Two" }]],
      {
        anchor: { blockIndex: 0, offset: 0 },
        focus: { blockIndex: 1, offset: 3 },
      },
    );
    expect(getToolbarStyleState(state).mixedParagraphStyles).toBe(false);
    getParagraphs(state)[1]!.style = { styleId: "heading1" };
    expect(getToolbarStyleState(state).mixedParagraphStyles).toBe(true);
    expect(getToolbarStyleState(state).styleId).toBe("");
  });

  it("applies a paragraph style across a multi-paragraph selection", () => {
    const state = createEditorStateFromParagraphRuns(
      [[{ text: "One" }], [{ text: "Two" }]],
      {
        anchor: { blockIndex: 0, offset: 0 },
        focus: { blockIndex: 1, offset: 3 },
      },
    );
    const next = setParagraphNamedStyle(state, "heading1");
    expect(
      getParagraphs(next).map((paragraph) => paragraph.style?.styleId),
    ).toEqual(["heading1", "heading1"]);
  });
});
