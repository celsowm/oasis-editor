import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getDocumentSections,
  getParagraphText,
  paragraphOffsetToPosition,
  type EditorParagraphNode,
  type EditorSectionBreakType,
} from "@/core/model.js";
import { insertSectionBreakAtSelection } from "@/core/commands/block.js";

function fixture() {
  const paragraph = createEditorParagraph("Body text");
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  return {
    state: {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 4),
        focus: paragraphOffsetToPosition(paragraph, 4),
      },
    },
  };
}

describe("section break type authoring", () => {
  it.each<EditorSectionBreakType>([
    "nextPage",
    "continuous",
    "evenPage",
    "oddPage",
    "nextColumn",
  ])("writes %s as the new section's breakType", (breakType) => {
    const { state } = fixture();
    const result = insertSectionBreakAtSelection(state, breakType);
    const sections = getDocumentSections(result.document);
    expect(sections).toHaveLength(2);
    // The break type belongs to the following (new) section.
    expect(sections[1]!.breakType).toBe(breakType);
    // The original section keeps no explicit break type.
    expect(sections[0]!.breakType).toBeUndefined();
  });

  it("splits the paragraph: text before stays, text after moves to the new section", () => {
    const { state } = fixture();
    const result = insertSectionBreakAtSelection(state, "oddPage");
    const sections = getDocumentSections(result.document);
    const first = sections[0]!.blocks[0] as EditorParagraphNode;
    const second = sections[1]!.blocks[0] as EditorParagraphNode;
    expect(getParagraphText(first)).toBe("Body");
    expect(getParagraphText(second)).toBe(" text");
  });

  it("moves the active section forward onto the new section", () => {
    const { state } = fixture();
    const result = insertSectionBreakAtSelection(state, "evenPage");
    expect(result.activeSectionIndex).toBe(1);
  });
});
