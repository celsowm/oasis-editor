import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getDocumentParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { COLUMN_BREAK_MARKER } from "@/core/units.js";
import { insertColumnBreakAtSelection } from "@/core/commands/text.js";

function fixtureWithSelection(offset: number) {
  const paragraph = createEditorParagraph("Body text");
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  return {
    paragraph,
    state: {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, offset),
        focus: paragraphOffsetToPosition(paragraph, offset),
      },
    },
  };
}

describe("hard column break authoring", () => {
  it("inserts the column break marker inline at the selection", () => {
    const { paragraph, state } = fixtureWithSelection(4);
    const next = insertColumnBreakAtSelection(state);

    const [result] = getDocumentParagraphs(next.document);
    expect(result.id).toBe(paragraph.id);
    expect(getParagraphText(result)).toBe("Body\u000B text");
  });

  it("keeps the break inside a single paragraph (no split)", () => {
    const { state } = fixtureWithSelection(4);
    const next = insertColumnBreakAtSelection(state);

    const paragraphs = getDocumentParagraphs(next.document);
    expect(paragraphs).toHaveLength(1);
    expect(getParagraphText(paragraphs[0]!).includes(COLUMN_BREAK_MARKER)).toBe(
      true,
    );
  });

  it("inserts at the start and end of the paragraph without error", () => {
    for (const offset of [0, 9]) {
      const { state } = fixtureWithSelection(offset);
      const next = insertColumnBreakAtSelection(state);
      const [paragraph] = getDocumentParagraphs(next.document);
      expect(getParagraphText(paragraph!).includes(COLUMN_BREAK_MARKER)).toBe(
        true,
      );
    }
  });

  it("places the caret after the inserted marker", () => {
    const { paragraph, state } = fixtureWithSelection(4);
    const next = insertColumnBreakAtSelection(state);

    const expected = paragraphOffsetToPosition(paragraph, 5);
    expect(next.selection.anchor.paragraphId).toBe(expected.paragraphId);
    expect(next.selection.anchor.offset).toBe(expected.offset);
    expect(next.selection.focus.paragraphId).toBe(expected.paragraphId);
    expect(next.selection.focus.offset).toBe(expected.offset);
  });
});
