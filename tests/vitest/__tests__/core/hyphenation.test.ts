import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorState } from "@/core/model.js";
import {
  getHyphenationSettings,
  isAutoHyphenationEnabled,
  setHyphenationSettings,
} from "@/core/commands/hyphenation.js";

function buildState(): EditorState {
  const paragraph = createEditorParagraphFromRuns([{ text: "hello" }]);
  return createEditorStateFromDocument(createEditorDocument([paragraph]));
}

describe("document hyphenation settings (layout.hyphenation)", () => {
  it("defaults to automatic hyphenation off", () => {
    const state = buildState();
    expect(isAutoHyphenationEnabled(state)).toBe(false);
    expect(getHyphenationSettings(state)).toEqual({
      value: false,
      zone: undefined,
      caps: undefined,
      limit: undefined,
    });
  });

  it("turns automatic hyphenation on", () => {
    const on = setHyphenationSettings(buildState(), { value: true });
    expect(isAutoHyphenationEnabled(on)).toBe(true);
    expect(on.document.settings?.autoHyphenation).toBe(true);
  });

  it("turns automatic hyphenation off", () => {
    const on = setHyphenationSettings(buildState(), { value: true });
    const off = setHyphenationSettings(on, { value: false });
    expect(isAutoHyphenationEnabled(off)).toBe(false);
  });

  it("sets zone, caps and limit while leaving unrelated settings intact", () => {
    const withOpts = setHyphenationSettings(buildState(), {
      value: true,
      zone: 36,
      caps: false,
      limit: 2,
    });
    expect(getHyphenationSettings(withOpts)).toEqual({
      value: true,
      zone: 36,
      caps: false,
      limit: 2,
    });
    // A later single-field update keeps the others.
    const limited = setHyphenationSettings(withOpts, { limit: 5 });
    expect(getHyphenationSettings(limited)).toEqual({
      value: true,
      zone: 36,
      caps: false,
      limit: 5,
    });
  });
});
