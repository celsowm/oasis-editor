import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  selectCollapse,
  selectParagraph,
  selectSentence,
  selectTextOccurrence,
  selectWord,
} from "@/core/commands/selectUnit.js";
import {
  getParagraphText,
  getParagraphs,
  paragraphOffsetToPosition,
  type EditorParagraphNode,
  type EditorState,
} from "@/core/model.js";

function buildState(lines: string[]): EditorState {
  const blocks = lines.map((text) =>
    createEditorParagraphFromRuns([{ text }]),
  );
  return createEditorStateFromDocument(createEditorDocument(blocks));
}

/** Collapse the caret at flat paragraph `i`, offset `offset`. */
function caretAt(state: EditorState, i: number, offset: number): EditorState {
  const paragraph = getParagraphs(state)[i]!;
  const pos = paragraphOffsetToPosition(paragraph, offset);
  return { ...state, selection: { anchor: pos, focus: pos } };
}

function paraLength(paragraph: EditorParagraphNode): number {
  return getParagraphText(paragraph).length;
}

/** The text covered by the selection, in document order. */
function selectedSpan(state: EditorState): string {
  const paragraphs = getParagraphs(state);
  const aIdx = paragraphs.findIndex(
    (p) => p.id === state.selection.anchor.paragraphId,
  );
  const fIdx = paragraphs.findIndex(
    (p) => p.id === state.selection.focus.paragraphId,
  );
  const lo = Math.min(aIdx, fIdx);
  const hi = Math.max(aIdx, fIdx);
  const aOff =
    aIdx === fIdx
      ? Math.min(
          state.selection.anchor.offset,
          state.selection.focus.offset,
        )
      : aIdx < fIdx
        ? state.selection.anchor.offset
        : state.selection.focus.offset;
  const fOff =
    aIdx === fIdx
      ? Math.max(
          state.selection.anchor.offset,
          state.selection.focus.offset,
        )
      : aIdx < fIdx
        ? state.selection.focus.offset
        : state.selection.anchor.offset;
  if (lo === hi) {
    return getParagraphText(paragraphs[lo]!).slice(aOff, fOff);
  }
  return (
    getParagraphText(paragraphs[lo]!).slice(aOff) +
    paragraphs
      .slice(lo + 1, hi)
      .map(getParagraphText)
      .join("\n") +
    getParagraphText(paragraphs[hi]!).slice(0, fOff)
  );
}

describe("selection-unit commands (select.word / select.sentence / select.paragraph)", () => {
  it("selects the whole current paragraph from a collapsed caret", () => {
    const state = caretAt(buildState(["first", "second", "third"]), 1, 3);
    const next = selectParagraph(state);
    const paragraphs = getParagraphs(next);
    const aIdx = paragraphs.findIndex(
      (p) => p.id === next.selection.anchor.paragraphId,
    );
    const fIdx = paragraphs.findIndex(
      (p) => p.id === next.selection.focus.paragraphId,
    );
    expect(aIdx).toBe(1);
    expect(fIdx).toBe(1);
    expect(next.selection.anchor.offset).toBe(0);
    expect(next.selection.focus.offset).toBe(paraLength(paragraphs[1]!));
  });

  it("expands a partial multi-paragraph selection to whole paragraphs", () => {
    const base = buildState(["one two", "three four"]);
    const paragraphs = getParagraphs(base);
    const p0 = paragraphs[0]!;
    const p1 = paragraphs[1]!;
    const state: EditorState = {
      ...base,
      selection: {
        anchor: paragraphOffsetToPosition(p0, 2),
        focus: paragraphOffsetToPosition(p1, 4),
      },
    };
    const next = selectParagraph(state);
    const np = getParagraphs(next);
    const aIdx = np.findIndex(
      (p) => p.id === next.selection.anchor.paragraphId,
    );
    const fIdx = np.findIndex(
      (p) => p.id === next.selection.focus.paragraphId,
    );
    expect(aIdx).toBe(0);
    expect(fIdx).toBe(1);
    expect(next.selection.anchor.offset).toBe(0);
    expect(next.selection.focus.offset).toBe(paraLength(np[1]!));
    expect(selectedSpan(next)).toBe("one twothree four");
  });

  it("selects the word around the caret", () => {
    // "hello world here" — caret inside "world" (offset 7).
    const state = caretAt(buildState(["hello world here"]), 0, 7);
    const next = selectWord(state);
    expect(selectedSpan(next)).toBe("world");
  });

  it("clamps a word selection at the paragraph start/end", () => {
    const state = caretAt(buildState(["hello"]), 0, 0);
    const next = selectWord(state);
    expect(selectedSpan(next)).toBe("hello");
  });

  it("selects the sentence around the caret, including its terminator", () => {
    // "First. Second sentence. Third." — caret at offset 12 (in "Second").
    const state = caretAt(
      buildState(["First. Second sentence. Third."]),
      0,
      12,
    );
    const next = selectSentence(state);
    expect(selectedSpan(next)).toBe("Second sentence.");
  });

  it("selects the trailing sentence to the paragraph end", () => {
    const state = caretAt(buildState(["First. Second."]), 0, 9);
    const next = selectSentence(state);
    expect(selectedSpan(next)).toBe("Second.");
  });

  it("collapses the selection to the anchor end by default", () => {
    const base = buildState(["one two three"]);
    const paragraphs = getParagraphs(base);
    const p = paragraphs[0]!;
    const state: EditorState = {
      ...base,
      selection: {
        anchor: paragraphOffsetToPosition(p, 3),
        focus: paragraphOffsetToPosition(p, 7),
      },
    };
    const next = selectCollapse(state);
    expect(next.selection.anchor.paragraphId).toBe(p.id);
    expect(next.selection.focus.paragraphId).toBe(p.id);
    expect(next.selection.anchor.offset).toBe(3);
    expect(next.selection.focus.offset).toBe(3);
  });

  it("collapses the selection to the focus end when end is true", () => {
    const base = buildState(["one two three"]);
    const paragraphs = getParagraphs(base);
    const p = paragraphs[0]!;
    const state: EditorState = {
      ...base,
      selection: {
        anchor: paragraphOffsetToPosition(p, 3),
        focus: paragraphOffsetToPosition(p, 7),
      },
    };
    const next = selectCollapse(state, true);
    expect(next.selection.anchor.offset).toBe(7);
    expect(next.selection.focus.offset).toBe(7);
  });

  it("collapses to the earlier position regardless of selection direction", () => {
    const base = buildState(["one two three"]);
    const paragraphs = getParagraphs(base);
    const p = paragraphs[0]!;
    // Backwards selection: anchor is the later end.
    const state: EditorState = {
      ...base,
      selection: {
        anchor: paragraphOffsetToPosition(p, 9),
        focus: paragraphOffsetToPosition(p, 2),
      },
    };
    // Anchor (9) is the later position; collapse-to-start must land on the
    // focus end (2), the earlier of the two.
    const next = selectCollapse(state);
    expect(next.selection.anchor.offset).toBe(2);
  });
});

describe("select text occurrence (select.text)", () => {
  it("selects the first occurrence of a string by default", () => {
    const state = buildState(["hello world hello"]); 
    const next = selectTextOccurrence(state, "hello");
    expect(selectedSpan(next)).toBe("hello");
  });

  it("selects the Nth occurrence when requested", () => {
    const state = buildState(["one two one two one"]);
    const next = selectTextOccurrence(state, "one", 3);
    expect(selectedSpan(next)).toBe("one");
    const paragraphs = getParagraphs(next);
    // The third "one" in "one two one two one" starts at offset 16.
    expect(next.selection.anchor.offset).toBe(16);
    expect(paragraphs[0]!.id).toBe(next.selection.anchor.paragraphId);
  });

  it("matches case-insensitively across paragraphs", () => {
    const state = buildState(["hello world", "HELLO again"]);
    const next = selectTextOccurrence(state, "hello", 2);
    const paragraphs = getParagraphs(next);
    // Second "hello" lives in paragraph index 1 ("HELLO again").
    const fIdx = paragraphs.findIndex(
      (p) => p.id === next.selection.focus.paragraphId,
    );
    expect(fIdx).toBe(1);
    expect(selectedSpan(next)).toBe("HELLO");
  });

  it("is a no-op when the string is not found", () => {
    const state = buildState(["hello world"]);
    const before = state.selection;
    const next = selectTextOccurrence(state, "missing");
    expect(next.selection).toEqual(before);
  });

  it("is a no-op when the occurrence is beyond the matches", () => {
    const state = buildState(["one one"]);
    const before = state.selection;
    const next = selectTextOccurrence(state, "one", 99);
    expect(next.selection).toEqual(before);
  });
});
