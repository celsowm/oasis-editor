import { describe, it, expect, beforeEach } from "vitest";
import {
  createEditorStateFromTexts,
  resetEditorIds,
} from "@/core/editorState.js";
import {
  insertTextAtSelection,
  insertPlainTextAtSelection,
  deleteBackward,
  deleteForward,
} from "@/core/commands/text.js";
import { splitBlockAtSelection } from "@/core/commands/block.js";
import {
  getParagraphs,
  getParagraphText,
  type EditorBookmarks,
  type EditorState,
} from "@/core/model.js";

beforeEach(() => {
  resetEditorIds();
});

/**
 * Attach a single bookmark spanning [start, end] of the given paragraph(s).
 * Offsets are paragraph-local character offsets, matching the registry model.
 */
function withBookmark(
  state: EditorState,
  start: { para: number; offset: number },
  end: { para: number; offset: number },
): EditorState {
  const paragraphs = getParagraphs(state);
  const bookmarks: EditorBookmarks = {
    items: {
      bm: {
        id: "bm",
        name: "Target",
        start: { paragraphId: paragraphs[start.para].id, offset: start.offset },
        end: { paragraphId: paragraphs[end.para].id, offset: end.offset },
      },
    },
    order: ["bm"],
  };
  return { ...state, document: { ...state.document, bookmarks } };
}

/** Text covered by the bookmark, reconstructed from its anchors. */
function coveredText(state: EditorState): string {
  const bm = state.document.bookmarks!.items.bm!;
  const paragraphs = getParagraphs(state);
  const byId = new Map(paragraphs.map((p) => [p.id, p]));
  const start = bm.start!;
  const end = bm.end!;
  if (start.paragraphId === end.paragraphId) {
    return getParagraphText(byId.get(start.paragraphId)!).slice(
      start.offset,
      end.offset,
    );
  }
  // Cross-paragraph: start..end joined by paragraph breaks.
  const ids = paragraphs.map((p) => p.id);
  const startIdx = ids.indexOf(start.paragraphId);
  const endIdx = ids.indexOf(end.paragraphId);
  const parts: string[] = [];
  for (let i = startIdx; i <= endIdx; i += 1) {
    const text = getParagraphText(paragraphs[i]);
    if (i === startIdx) parts.push(text.slice(start.offset));
    else if (i === endIdx) parts.push(text.slice(0, end.offset));
    else parts.push(text);
  }
  return parts.join("\n");
}

function selectionAt(
  state: EditorState,
  para: number,
  offset: number,
): EditorState {
  const paragraphs = getParagraphs(state);
  const p = paragraphs[para];
  const pos = { paragraphId: p.id, runId: p.runs[0].id, offset };
  return { ...state, selection: { anchor: pos, focus: pos } };
}

function selectionRange(
  state: EditorState,
  a: { para: number; offset: number },
  b: { para: number; offset: number },
): EditorState {
  const paragraphs = getParagraphs(state);
  const pa = paragraphs[a.para];
  const pb = paragraphs[b.para];
  return {
    ...state,
    selection: {
      anchor: { paragraphId: pa.id, runId: pa.runs[0].id, offset: a.offset },
      focus: { paragraphId: pb.id, runId: pb.runs[0].id, offset: b.offset },
    },
  };
}

describe("bookmark anchors survive live edits", () => {
  it("shifts both anchors right when typing before the bookmark", () => {
    // "Hello [world]" — bookmark over "world".
    let state = createEditorStateFromTexts(["Hello world"]);
    state = withBookmark(
      state,
      { para: 0, offset: 6 },
      { para: 0, offset: 11 },
    );
    state = selectionAt(state, 0, 0);
    state = insertTextAtSelection(state, "Say: ");
    expect(getParagraphText(getParagraphs(state)[0])).toBe("Say: Hello world");
    expect(coveredText(state)).toBe("world");
  });

  it("keeps start put but extends end when typing inside the bookmark", () => {
    let state = createEditorStateFromTexts(["Hello world"]);
    state = withBookmark(
      state,
      { para: 0, offset: 6 },
      { para: 0, offset: 11 },
    );
    // Type "XX" at offset 8 (inside "world" → "woXXrld").
    state = selectionAt(state, 0, 8);
    state = insertTextAtSelection(state, "XX");
    expect(coveredText(state)).toBe("woXXrld");
  });

  it("excludes text typed exactly at the bookmark end (left affinity)", () => {
    let state = createEditorStateFromTexts(["Hello world"]);
    state = withBookmark(
      state,
      { para: 0, offset: 6 },
      { para: 0, offset: 11 },
    );
    state = selectionAt(state, 0, 11);
    state = insertTextAtSelection(state, "!!");
    expect(coveredText(state)).toBe("world");
    expect(getParagraphText(getParagraphs(state)[0])).toBe("Hello world!!");
  });

  it("shrinks the bookmark when deleting inside it", () => {
    let state = createEditorStateFromTexts(["Hello world"]);
    state = withBookmark(
      state,
      { para: 0, offset: 6 },
      { para: 0, offset: 11 },
    );
    // Delete the "l" at index 9 (backspace at offset 10): "world" → "word".
    state = selectionAt(state, 0, 10);
    state = deleteBackward(state);
    expect(coveredText(state)).toBe("word");
  });

  it("collapses anchors that sit inside a deleted range", () => {
    let state = createEditorStateFromTexts(["Hello world"]);
    state = withBookmark(
      state,
      { para: 0, offset: 6 },
      { para: 0, offset: 11 },
    );
    // Select "lo wor" (offsets 3..9), which contains the start anchor (6).
    state = selectionRange(
      state,
      { para: 0, offset: 3 },
      { para: 0, offset: 9 },
    );
    state = deleteForward(state);
    expect(getParagraphText(getParagraphs(state)[0])).toBe("Helld");
    // start collapses to the deletion point (3); end follows remaining "ld".
    const bm = state.document.bookmarks!.items.bm!;
    expect(bm.start!.offset).toBe(3);
    expect(coveredText(state)).toBe("ld");
  });

  it("moves the end anchor to the new paragraph on a split inside the bookmark", () => {
    let state = createEditorStateFromTexts(["Hello world"]);
    state = withBookmark(
      state,
      { para: 0, offset: 6 },
      { para: 0, offset: 11 },
    );
    // Split between "wor" and "ld" (offset 9).
    state = selectionAt(state, 0, 9);
    state = splitBlockAtSelection(state);
    const paragraphs = getParagraphs(state);
    expect(paragraphs).toHaveLength(2);
    expect(getParagraphText(paragraphs[0])).toBe("Hello wor");
    expect(getParagraphText(paragraphs[1])).toBe("ld");
    const bm = state.document.bookmarks!.items.bm!;
    // start stays in paragraph 0; end now lives in paragraph 1 at offset 2.
    expect(bm.start!.paragraphId).toBe(paragraphs[0].id);
    expect(bm.end!.paragraphId).toBe(paragraphs[1].id);
    expect(bm.end!.offset).toBe(2);
    expect(coveredText(state)).toBe("wor\nld");
  });

  it("re-joins anchors across a paragraph merge", () => {
    // Bookmark spans the break: "wor]" in p0 ... "[ld" in p1.
    let state = createEditorStateFromTexts(["Hello wor", "ld done"]);
    state = withBookmark(state, { para: 0, offset: 6 }, { para: 1, offset: 2 });
    expect(coveredText(state)).toBe("wor\nld");
    // Merge p1 into p0 by backspacing at the start of p1.
    state = selectionAt(state, 1, 0);
    state = deleteBackward(state);
    const paragraphs = getParagraphs(state);
    expect(paragraphs).toHaveLength(1);
    expect(getParagraphText(paragraphs[0])).toBe("Hello world done");
    const bm = state.document.bookmarks!.items.bm!;
    expect(bm.start!.paragraphId).toBe(paragraphs[0].id);
    expect(bm.end!.paragraphId).toBe(paragraphs[0].id);
    expect(coveredText(state)).toBe("world");
  });

  it("keeps anchors correct after a multi-line paste before the bookmark", () => {
    let state = createEditorStateFromTexts(["Hello world"]);
    state = withBookmark(
      state,
      { para: 0, offset: 6 },
      { para: 0, offset: 11 },
    );
    state = selectionAt(state, 0, 0);
    state = insertPlainTextAtSelection(state, "A\nB\n");
    const paragraphs = getParagraphs(state);
    expect(paragraphs.map(getParagraphText)).toEqual(["A", "B", "Hello world"]);
    // The bookmark still covers "world", now in the last paragraph.
    const bm = state.document.bookmarks!.items.bm!;
    expect(bm.start!.paragraphId).toBe(paragraphs[2].id);
    expect(coveredText(state)).toBe("world");
  });

  it("leaves bookmarks in other paragraphs untouched", () => {
    let state = createEditorStateFromTexts(["alpha", "beta gamma"]);
    state = withBookmark(state, { para: 1, offset: 0 }, { para: 1, offset: 4 });
    const before = state.document.bookmarks;
    // Edit paragraph 0 only.
    state = selectionAt(state, 0, 0);
    state = insertTextAtSelection(state, "ZZ");
    // Registry instance is reused (no churn) and still covers "beta".
    expect(state.document.bookmarks).toBe(before);
    expect(coveredText(state)).toBe("beta");
  });
});
