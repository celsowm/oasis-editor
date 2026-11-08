import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorState } from "@/core/model.js";
import {
  getSectionVerticalAlign,
  setSectionVerticalAlign,
} from "@/core/commands/pageSetup.js";

function buildState(): EditorState {
  const paragraph = createEditorParagraphFromRuns([{ text: "hello" }]);
  return createEditorStateFromDocument(createEditorDocument([paragraph]));
}

describe("section vertical alignment (layout.verticalAlign)", () => {
  it("defaults to undefined (top is the Word default)", () => {
    expect(getSectionVerticalAlign(buildState())).toBeUndefined();
  });

  it("sets center / bottom / both on the active section", () => {
    const state = buildState();
    expect(
      getSectionVerticalAlign(setSectionVerticalAlign(state, "center")),
    ).toBe("center");
    expect(
      getSectionVerticalAlign(setSectionVerticalAlign(state, "bottom")),
    ).toBe("bottom");
    expect(
      getSectionVerticalAlign(setSectionVerticalAlign(state, "both")),
    ).toBe("both");
  });

  it("treats top / null / undefined as clearing the field", () => {
    const state = buildState();
    const centered = setSectionVerticalAlign(state, "center");
    expect(getSectionVerticalAlign(centered)).toBe("center");
    expect(getSectionVerticalAlign(setSectionVerticalAlign(centered, "top"))).toBeUndefined();
    expect(
      getSectionVerticalAlign(setSectionVerticalAlign(centered, null)),
    ).toBeUndefined();
  });
});
