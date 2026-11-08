import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  canMoveSelectedParagraphs,
  moveSelectedParagraphs,
} from "@/core/commands/paragraphMove.js";
import {
  getParagraphText,
  getParagraphs,
  paragraphOffsetToPosition,
  type EditorParagraphNode,
  type EditorState,
} from "@/core/model.js";

/** Build a state whose main-zone block stream is one plain paragraph per line. */
function buildState(lines: string[]): EditorState {
  const blocks = lines.map((text) =>
    createEditorParagraphFromRuns([{ text }]),
  );
  return createEditorStateFromDocument(createEditorDocument(blocks));
}

/** Put the collapsed selection in the paragraph at flat index `i`. */
function selectParagraph(state: EditorState, i: number): EditorState {
  const paragraphs = getParagraphs(state);
  const paragraph = paragraphs[i]!;
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 1),
      focus: paragraphOffsetToPosition(paragraph, 1),
    },
  };
}

/** Select a range covering the flat paragraphs [a..b] inclusive. */
function selectRange(
  state: EditorState,
  a: number,
  b: number,
): EditorState {
  const paragraphs = getParagraphs(state);
  const first = paragraphs[a]!;
  const last = paragraphs[b]!;
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(first, 1),
      focus: paragraphOffsetToPosition(last, 1),
    },
  };
}

function textOf(state: EditorState): string[] {
  return getParagraphs(state).map(getParagraphText);
}

describe("paragraph move up/down (para.moveUp / para.moveDown)", () => {
  it("exposes the capability when the selected run can move up", () => {
    const state = selectParagraph(buildState(["a", "b", "c"]), 1);
    expect(canMoveSelectedParagraphs(state, "up")).toBe(true);
    expect(canMoveSelectedParagraphs(state, "down")).toBe(true);
  });

  it("refuses at the top (up) and bottom (down) of the container", () => {
    const state = buildState(["a", "b", "c"]);
    expect(canMoveSelectedParagraphs(selectParagraph(state, 0), "up")).toBe(
      false,
    );
    expect(canMoveSelectedParagraphs(selectParagraph(state, 2), "down")).toBe(
      false,
    );
    expect(
      textOf(moveSelectedParagraphs(selectParagraph(state, 0), "up")),
    ).toEqual(["a", "b", "c"]);
    expect(
      textOf(moveSelectedParagraphs(selectParagraph(state, 2), "down")),
    ).toEqual(["a", "b", "c"]);
  });

  it("moves a single paragraph up", () => {
    const before = buildState(["a", "b", "c"]);
    const next = moveSelectedParagraphs(selectParagraph(before, 1), "up");
    expect(textOf(next)).toEqual(["b", "a", "c"]);
  });

  it("moves a single paragraph down", () => {
    const before = buildState(["a", "b", "c"]);
    const next = moveSelectedParagraphs(selectParagraph(before, 1), "down");
    expect(textOf(next)).toEqual(["a", "c", "b"]);
  });

  it("moves a multi-paragraph run as a block", () => {
    const before = buildState(["a", "b", "c", "d"]);
    const selected = selectRange(before, 1, 2);
    expect(textOf(moveSelectedParagraphs(selected, "up"))).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(textOf(moveSelectedParagraphs(selected, "down"))).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
  });

  it("moves an empty paragraph too", () => {
    const before = buildState(["a", "", "c"]);
    const next = moveSelectedParagraphs(selectParagraph(before, 1), "up");
    expect(textOf(next)).toEqual(["", "a", "c"]);
  });

  it("keeps selection anchored on the moved paragraph", () => {
    const before = selectParagraph(buildState(["a", "b", "c"]), 1);
    const next = moveSelectedParagraphs(before, "up");
    // paragraph b now sits at flat index 0; selection follows it.
    const movedParagraph = getParagraphs(next)[0]!;
    expect(getParagraphText(movedParagraph)).toBe("b");
    expect(next.selection.anchor.paragraphId).toBe(movedParagraph.id);
  });

  it("preserves paragraph formatting during the swap", () => {
    const blocks = [
      createEditorParagraphFromRuns([{ text: "a", styles: { bold: true } }]),
      createEditorParagraphFromRuns([{ text: "b", styles: { italic: true } }]),
    ];
    const base = createEditorStateFromDocument(createEditorDocument(blocks));
    const next = moveSelectedParagraphs(selectParagraph(base, 1), "up");
    const paragraphs = getParagraphs(next);
    expect(getParagraphText(paragraphs[0]!)).toBe("b");
    expect(paragraphs[0]!.runs[0]!.styles?.italic).toBe(true);
    expect(getParagraphText(paragraphs[1]!)).toBe("a");
    expect(paragraphs[1]!.runs[0]!.styles?.bold).toBe(true);
  });

  it("is a no-op when the focus is inside a footnote zone", () => {
    const before = buildState(["a", "b"]);
    const withFootnoteZone: EditorState = {
      ...selectParagraph(before, 0),
      activeZone: "footnote",
      activeFootnoteId: "footnote:1",
    };
    expect(canMoveSelectedParagraphs(withFootnoteZone, "up")).toBe(false);
    expect(moveSelectedParagraphs(withFootnoteZone, "up")).toBe(
      withFootnoteZone,
    );
  });
});
