import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { setParagraphKinsoku } from "@/core/commands/paragraphKinsoku.js";

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

function paragraph(text: string, kinsoku?: boolean): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  if (kinsoku !== undefined) {
    p.style = { ...(p.style ?? {}), kinsoku };
  }
  return p;
}

describe("set paragraph kinsoku (w:kinsoku)", () => {
  it("turns kinsoku off for the selected paragraph (stores explicit false)", () => {
    const next = setParagraphKinsoku(buildState([paragraph("hi")]), false);
    expect(getParagraphs(next)[0]!.style?.kinsoku).toBe(false);
  });

  it("stores an explicit true", () => {
    const next = setParagraphKinsoku(buildState([paragraph("hi", false)]), true);
    expect(getParagraphs(next)[0]!.style?.kinsoku).toBe(true);
  });

  it("clears the key when null is passed (default on, omitted on export)", () => {
    const next = setParagraphKinsoku(
      buildState([paragraph("hi", false)]),
      null,
    );
    expect(getParagraphs(next)[0]!.style?.kinsoku).toBeUndefined();
  });

  it("is a no-op when the value is unchanged", () => {
    const off = buildState([paragraph("hi", false)]);
    expect(setParagraphKinsoku(off, false)).toBe(off);
    const on = buildState([paragraph("hi")]);
    expect(setParagraphKinsoku(on, null)).toBe(on);
  });

  it("applies only to the selected paragraphs", () => {
    const p1 = paragraph("a");
    const p2 = paragraph("b");
    const p3 = paragraph("c");
    const state = selectRange(buildState([p1, p2, p3]), 0, 1);
    const next = setParagraphKinsoku(state, false);
    const all = getParagraphs(next);
    expect(all[0]!.style?.kinsoku).toBe(false);
    expect(all[1]!.style?.kinsoku).toBe(false);
    expect(all[2]!.style?.kinsoku).toBeUndefined();
  });
});
