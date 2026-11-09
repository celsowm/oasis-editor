import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { setParagraphSuppressLineNumbers } from "@/core/commands/paragraphSuppressLineNumbers.js";

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

function paragraph(
  text: string,
  suppressLineNumbers?: boolean,
): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  if (suppressLineNumbers !== undefined) {
    p.style = { ...(p.style ?? {}), suppressLineNumbers };
  }
  return p;
}

describe("set paragraph suppress line numbers (w:suppressLineNumbers)", () => {
  it("suppresses line numbers for the selected paragraph", () => {
    const next = setParagraphSuppressLineNumbers(
      buildState([paragraph("hi")]),
      true,
    );
    expect(getParagraphs(next)[0]!.style?.suppressLineNumbers).toBe(true);
  });

  it("stores an explicit false to honor it on export", () => {
    const next = setParagraphSuppressLineNumbers(
      buildState([paragraph("hi", true)]),
      false,
    );
    expect(getParagraphs(next)[0]!.style?.suppressLineNumbers).toBe(false);
  });

  it("clears the key when null is passed (default off)", () => {
    const next = setParagraphSuppressLineNumbers(
      buildState([paragraph("hi", true)]),
      null,
    );
    expect(
      getParagraphs(next)[0]!.style?.suppressLineNumbers,
    ).toBeUndefined();
  });

  it("is a no-op when the value is unchanged", () => {
    const on = buildState([paragraph("hi", true)]);
    expect(setParagraphSuppressLineNumbers(on, true)).toBe(on);
    const off = buildState([paragraph("hi")]);
    expect(setParagraphSuppressLineNumbers(off, null)).toBe(off);
  });

  it("applies only to the selected paragraphs", () => {
    const p1 = paragraph("a");
    const p2 = paragraph("b");
    const p3 = paragraph("c");
    const state = selectRange(buildState([p1, p2, p3]), 0, 1);
    const next = setParagraphSuppressLineNumbers(state, true);
    const all = getParagraphs(next);
    expect(all[0]!.style?.suppressLineNumbers).toBe(true);
    expect(all[1]!.style?.suppressLineNumbers).toBe(true);
    expect(all[2]!.style?.suppressLineNumbers).toBeUndefined();
  });
});
