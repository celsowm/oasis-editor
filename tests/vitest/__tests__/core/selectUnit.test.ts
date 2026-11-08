import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  selectParagraph,
  selectSentence,
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
});
