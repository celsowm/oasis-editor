import { describe, it, expect } from "vitest";
import {
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  DEFAULT_EDITOR_PAGE_SETTINGS,
  getParagraphs,
  paragraphOffsetToPosition,
  syncActiveSectionToSelection,
  type EditorDocument,
  type EditorParagraphNode,
  type EditorState,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";

function twoSectionState(): EditorState {
  const document: EditorDocument = {
    id: "doc:1",
    blocks: [],
    sections: [
      {
        id: "section:1",
        blocks: [createEditorParagraph("Capa")],
        pageSettings: DEFAULT_EDITOR_PAGE_SETTINGS,
      },
      {
        id: "section:2",
        blocks: [createEditorParagraph("Corpo"), createEditorParagraph("Fim")],
        pageSettings: DEFAULT_EDITOR_PAGE_SETTINGS,
      },
    ],
  } as EditorDocument;
  return createEditorStateFromDocument(document);
}

function getSectionParagraphs(
  state: EditorState,
  sectionIndex: number,
): EditorParagraphNode[] {
  return state.document.sections![sectionIndex]!.blocks as EditorParagraphNode[];
}

describe("syncActiveSectionToSelection", () => {
  it("activates the section that owns a selection placed in a later section", () => {
    const state = twoSectionState();
    const [corpo, fim] = getSectionParagraphs(state, 1);
    const next = syncActiveSectionToSelection({
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(corpo!, 0),
        focus: paragraphOffsetToPosition(fim!, 2),
      },
    });

    expect(next.activeSectionIndex).toBe(1);
    expect(getParagraphs(next).map((p) => p.id)).toEqual([corpo!.id, fim!.id]);
    const normalized = normalizeSelection(next);
    expect(normalized.isCollapsed).toBe(false);
    expect(normalized.startIndex).toBe(0);
    expect(normalized.endIndex).toBe(1);
  });

  it("leaves the state alone when the selection spans two sections", () => {
    const state = twoSectionState();
    const [capa] = getSectionParagraphs(state, 0);
    const [corpo] = getSectionParagraphs(state, 1);
    const crossing: EditorState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(capa!, 0),
        focus: paragraphOffsetToPosition(corpo!, 1),
      },
    };
    expect(syncActiveSectionToSelection(crossing)).toBe(crossing);
  });

  it("returns the same state when the active section already matches", () => {
    const state = twoSectionState();
    expect(syncActiveSectionToSelection(state)).toBe(state);
  });
});
