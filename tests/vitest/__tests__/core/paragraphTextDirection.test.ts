import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import {
  setParagraphTextDirection,
  type ParagraphTextDirection,
} from "@/core/commands/paragraphTextDirection.js";

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
  textDirection?: ParagraphTextDirection,
): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  if (textDirection !== undefined) {
    p.style = { ...(p.style ?? {}), textDirection };
  }
  return p;
}

describe("set paragraph text direction (w:textDirection)", () => {
  it("sets a vertical text flow on the selected paragraph", () => {
    const next = setParagraphTextDirection(buildState([paragraph("hi")]), "tbRl");
    expect(getParagraphs(next)[0]!.style?.textDirection).toBe("tbRl");
  });

  it("sets each non-default OOXML value", () => {
    for (const v of ["tbRl", "btLr", "lrTbV", "tbRlV"] as const) {
      const next = setParagraphTextDirection(
        buildState([paragraph("hi")]),
        v,
      );
      expect(getParagraphs(next)[0]!.style?.textDirection).toBe(v);
    }
  });

  it("clears the key for the lrTb default (omitted on export)", () => {
    const next = setParagraphTextDirection(
      buildState([paragraph("hi", "tbRl")]),
      "lrTb",
    );
    expect(getParagraphs(next)[0]!.style?.textDirection).toBeUndefined();
  });

  it("clears the key when null is passed", () => {
    const next = setParagraphTextDirection(
      buildState([paragraph("hi", "tbRl")]),
      null,
    );
    expect(getParagraphs(next)[0]!.style?.textDirection).toBeUndefined();
  });

  it("is a no-op when the value is unchanged", () => {
    const vertical = buildState([paragraph("hi", "tbRl")]);
    expect(setParagraphTextDirection(vertical, "tbRl")).toBe(vertical);
    const flat = buildState([paragraph("hi")]);
    expect(setParagraphTextDirection(flat, null)).toBe(flat);
  });

  it("applies only to the selected paragraphs", () => {
    const p1 = paragraph("a");
    const p2 = paragraph("b");
    const p3 = paragraph("c");
    const state = selectRange(buildState([p1, p2, p3]), 0, 1);
    const next = setParagraphTextDirection(state, "tbRl");
    const all = getParagraphs(next);
    expect(all[0]!.style?.textDirection).toBe("tbRl");
    expect(all[1]!.style?.textDirection).toBe("tbRl");
    expect(all[2]!.style?.textDirection).toBeUndefined();
  });
});
