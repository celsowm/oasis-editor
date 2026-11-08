import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { sortSelectedParagraphs } from "@/core/commands/paragraphSort.js";
import { getParagraphs } from "@/core/model.js";
import type { EditorState } from "@/core/model.js";

function buildState(texts: string[]): EditorState {
  const paragraphs = texts.map((text) => createEditorParagraphFromRuns([{ text }]));
  const state = createEditorStateFromDocument(
    createEditorDocument(paragraphs),
  );
  // Select across the full range of paragraphs.
  const first = paragraphs[0]!;
  const last = paragraphs[paragraphs.length - 1]!;
  return {
    ...state,
    selection: {
      anchor: { paragraphId: first.id, runId: first.runs[0]!.id, offset: 0 },
      focus: {
        paragraphId: last.id,
        runId: last.runs[last.runs.length - 1]!.id,
        offset: last.runs[last.runs.length - 1]!.text.length,
      },
    },
  };
}

function texts(state: EditorState): string[] {
  return getParagraphs(state).map((p) =>
    p.runs.map((r) => r.text).join(""),
  );
}

describe("paragraph sort (para.sort)", () => {
  it("sorts selected paragraphs ascending by text", () => {
    const state = buildState(["c", "a", "b"]);
    const next = sortSelectedParagraphs(state, false);
    expect(texts(next)).toEqual(["a", "b", "c"]);
  });

  it("sorts selected paragraphs descending when requested", () => {
    const state = buildState(["c", "a", "b"]);
    const next = sortSelectedParagraphs(state, true);
    expect(texts(next)).toEqual(["c", "b", "a"]);
  });

  it("uses natural numeric ordering for paragraphs starting with a number", () => {
    const state = buildState(["10 apples", "2 oranges", "1 banana"]);
    const next = sortSelectedParagraphs(state, false);
    expect(texts(next)).toEqual(["1 banana", "2 oranges", "10 apples"]);
  });

  it("is a no-op for a single paragraph", () => {
    const state = buildState(["only"]);
    const next = sortSelectedParagraphs(state, false);
    expect(texts(next)).toEqual(["only"]);
  });

  it("preserves equal-key paragraphs in original order (stable)", () => {
    const state = buildState(["x", "x", "a"]);
    const next = sortSelectedParagraphs(state, false);
    // Both "x" stay in their relative order after "a".
    expect(texts(next)).toEqual(["a", "x", "x"]);
  });

  it("preserves the selection by remapping paragraph ids", () => {
    const state = buildState(["c", "a", "b"]);
    const before = state.selection.anchor.paragraphId;
    const next = sortSelectedParagraphs(state, false);
    // The anchor paragraph still exists and is selected.
    const ids = new Set(getParagraphs(next).map((p) => p.id));
    expect(ids.has(before)).toBe(true);
    expect(next.selection.anchor.paragraphId === before).toBe(true);
  });
});
