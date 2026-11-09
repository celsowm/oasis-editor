import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { setParagraphOverflowPunct } from "@/core/commands/paragraphOverflowPunct.js";

function buildState(paragraphs: EditorParagraphNode[]): EditorState {
  const state = createEditorStateFromDocument(
    createEditorDocument(paragraphs),
  );
  const first = paragraphs[0]!;
  const text = first.runs.map((r) => r.text).join("");
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(first, 0),
      focus: paragraphOffsetToPosition(first, text.length),
    },
  };
}

function selectRange(state: EditorState, lo: number, hi: number): EditorState {
  const paragraphs = getParagraphs(state);
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraphs[lo]!, 0),
      focus: paragraphOffsetToPosition(
        paragraphs[hi]!,
        paragraphs[hi]!.runs.map((r) => r.text).join("").length,
      ),
    },
  };
}

function paragraph(text: string, overflowPunct?: boolean): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  if (overflowPunct !== undefined) {
    p.style = { ...(p.style ?? {}), overflowPunct };
  }
  return p;
}

describe("set paragraph overflow punct (w:overflowPunct)", () => {
  it("turns overflow punct off for the selected paragraph (stores explicit false)", () => {
    const next = setParagraphOverflowPunct(buildState([paragraph("hi")]), false);
    expect(getParagraphs(next)[0]!.style?.overflowPunct).toBe(false);
  });

  it("stores an explicit true", () => {
    const next = setParagraphOverflowPunct(
      buildState([paragraph("hi", false)]),
      true,
    );
    expect(getParagraphs(next)[0]!.style?.overflowPunct).toBe(true);
  });

  it("clears the key when null is passed (default on, omitted on export)", () => {
    const next = setParagraphOverflowPunct(
      buildState([paragraph("hi", false)]),
      null,
    );
    expect(getParagraphs(next)[0]!.style?.overflowPunct).toBeUndefined();
  });

  it("is a no-op when the value is unchanged", () => {
    const off = buildState([paragraph("hi", false)]);
    expect(setParagraphOverflowPunct(off, false)).toBe(off);
    const on = buildState([paragraph("hi")]);
    expect(setParagraphOverflowPunct(on, null)).toBe(on);
  });

  it("applies only to the selected paragraphs", () => {
    const p1 = paragraph("a");
    const p2 = paragraph("b");
    const p3 = paragraph("c");
    const state = selectRange(buildState([p1, p2, p3]), 0, 1);
    const next = setParagraphOverflowPunct(state, false);
    const all = getParagraphs(next);
    expect(all[0]!.style?.overflowPunct).toBe(false);
    expect(all[1]!.style?.overflowPunct).toBe(false);
    expect(all[2]!.style?.overflowPunct).toBeUndefined();
  });
});
