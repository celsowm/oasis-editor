import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorState } from "@/core/model.js";
import { getSectionBidi, setSectionBidi } from "@/core/commands/pageSetup.js";

function buildState(): EditorState {
  const paragraph = createEditorParagraphFromRuns([{ text: "hello" }]);
  return createEditorStateFromDocument(createEditorDocument([paragraph]));
}

describe("section right-to-left layout (layout.sectionRtl)", () => {
  it("defaults to undefined (off is the default)", () => {
    expect(getSectionBidi(buildState())).toBeUndefined();
  });

  it("sets the bidi flag on the active section", () => {
    const state = buildState();
    expect(getSectionBidi(setSectionBidi(state, true))).toBe(true);
  });

  it("treats false / null / undefined as clearing the flag", () => {
    const state = buildState();
    const on = setSectionBidi(state, true);
    expect(getSectionBidi(on)).toBe(true);
    expect(getSectionBidi(setSectionBidi(on, false))).toBeUndefined();
    expect(getSectionBidi(setSectionBidi(on, null))).toBeUndefined();
    expect(getSectionBidi(setSectionBidi(on, undefined))).toBeUndefined();
  });
});
