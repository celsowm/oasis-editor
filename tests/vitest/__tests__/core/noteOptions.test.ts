import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorState } from "@/core/model.js";
import {
  getNoteOptions,
  setNoteOptions,
} from "@/core/commands/noteOptions.js";

function buildState(): EditorState {
  return createEditorStateFromDocument(createEditorDocument([], "doc"));
}

describe("set note options (references.noteOptions)", () => {
  it("sets the footnote number format", () => {
    const next = setNoteOptions(buildState(), {
      kind: "footnote",
      numberFormat: "upperRoman",
    });
    expect(next.document.footnotes?.settings?.numberFormat).toBe("upperRoman");
  });

  it("sets the endnote start number, clamped to at least 1", () => {
    const next = setNoteOptions(buildState(), {
      kind: "endnote",
      startAt: 0,
    });
    expect(next.document.endnotes?.settings?.startAt).toBe(1);
  });

  it("sets the footnote restart rule", () => {
    const next = setNoteOptions(buildState(), {
      kind: "footnote",
      restart: "eachSection",
    });
    expect(next.document.footnotes?.settings?.restart).toBe("eachSection");
  });

  it("unsets a field when given null", () => {
    let state = setNoteOptions(buildState(), {
      kind: "footnote",
      numberFormat: "lowerLetter",
    });
    state = setNoteOptions(state, { kind: "footnote", numberFormat: null });
    expect(state.document.footnotes?.settings?.numberFormat).toBeUndefined();
  });

  it("is a no-op when nothing changes", () => {
    const state = buildState();
    expect(setNoteOptions(state, { kind: "footnote" })).toBe(state);
  });

  it("is a no-op when setting the current value", () => {
    let state = setNoteOptions(buildState(), {
      kind: "footnote",
      numberFormat: "upperRoman",
    });
    const before = state;
    state = setNoteOptions(state, {
      kind: "footnote",
      numberFormat: "upperRoman",
    });
    expect(state).toBe(before);
  });

  it("keeps separate footnote and endnote settings", () => {
    let state = setNoteOptions(buildState(), {
      kind: "footnote",
      numberFormat: "lowerRoman",
    });
    state = setNoteOptions(state, {
      kind: "endnote",
      numberFormat: "upperLetter",
    });
    expect(state.document.footnotes?.settings?.numberFormat).toBe("lowerRoman");
    expect(state.document.endnotes?.settings?.numberFormat).toBe("upperLetter");
  });

  it("reads current options", () => {
    let state = setNoteOptions(buildState(), {
      kind: "endnote",
      restart: "continuous",
    });
    expect(getNoteOptions(state, "endnote").restart).toBe("continuous");
  });
});
