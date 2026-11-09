import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorSectionBreakType, EditorState } from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";
import { updateSectionSettings } from "@/core/commands/block.js";

function buildState(): EditorState {
  const paragraph = createEditorParagraphFromRuns([{ text: "hello" }]);
  return createEditorStateFromDocument(createEditorDocument([paragraph]));
}

function applyStartType(
  state: EditorState,
  breakType: EditorSectionBreakType,
): EditorState {
  const idx = state.activeSectionIndex ?? 0;
  return updateSectionSettings(state, idx, { breakType });
}

describe("section start type (layout.section / Word Page Setup > Section start)", () => {
  it.each<EditorSectionBreakType>([
    "nextPage",
    "continuous",
    "evenPage",
    "oddPage",
    "nextColumn",
  ])("writes %s onto the active section", (breakType) => {
    const state = buildState();
    const next = applyStartType(state, breakType);
    const idx = next.activeSectionIndex ?? 0;
    expect(getDocumentSections(next.document)[idx]!.breakType).toBe(breakType);
  });

  it("defaults to no explicit start type (nextPage is the Word default)", () => {
    const idx = buildState().activeSectionIndex ?? 0;
    expect(
      getDocumentSections(buildState().document)[idx]!.breakType,
    ).toBeUndefined();
  });

  it("changes an existing start type to another value", () => {
    const state = buildState();
    const continuous = applyStartType(state, "continuous");
    const even = applyStartType(continuous, "evenPage");
    const idx = even.activeSectionIndex ?? 0;
    expect(getDocumentSections(even.document)[idx]!.breakType).toBe("evenPage");
  });
});
