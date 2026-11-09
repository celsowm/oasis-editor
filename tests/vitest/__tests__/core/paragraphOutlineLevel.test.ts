import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type {
  EditorParagraphNode,
  EditorState,
} from "@/core/model.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import {
  setParagraphOutlineLevel,
  MIN_OUTLINE_LEVEL,
  MAX_OUTLINE_LEVEL,
} from "@/core/commands/paragraphOutlineLevel.js";

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

function plainParagraph(text: string): EditorParagraphNode {
  return createEditorParagraphFromRuns([{ text }]);
}

function outlinedParagraph(text: string, level: number): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  p.style = { outlineLevel: level };
  return p;
}

describe("set paragraph outline level (para.outlineLevel / outline.level)", () => {
  it("sets the outline level on the selected paragraph", () => {
    const next = setParagraphOutlineLevel(buildState([plainParagraph("hi")]), 2);
    expect(getParagraphs(next)[0]!.style?.outlineLevel).toBe(2);
  });

  it("returns a paragraph to body text with null", () => {
    const next = setParagraphOutlineLevel(
      buildState([outlinedParagraph("hi", 3)]),
      null,
    );
    expect(getParagraphs(next)[0]!.style?.outlineLevel).toBeUndefined();
  });

  it("removes the whole style when only the level was present", () => {
    const next = setParagraphOutlineLevel(
      buildState([outlinedParagraph("hi", 3)]),
      null,
    );
    expect(getParagraphs(next)[0]!.style).toBeUndefined();
  });

  it("keeps other style keys when clearing the level", () => {
    const p = plainParagraph("hi");
    p.style = { outlineLevel: 3, align: "center" };
    const next = setParagraphOutlineLevel(buildState([p]), null);
    expect(getParagraphs(next)[0]!.style?.outlineLevel).toBeUndefined();
    expect(getParagraphs(next)[0]!.style?.align).toBe("center");
  });

  it("clamps and rounds the level to the valid range", () => {
    const clamped = setParagraphOutlineLevel(buildState([plainParagraph("a")]), 50);
    expect(getParagraphs(clamped)[0]!.style?.outlineLevel).toBe(MAX_OUTLINE_LEVEL);
    const rounded = setParagraphOutlineLevel(buildState([plainParagraph("a")]), 2.4);
    expect(getParagraphs(rounded)[0]!.style?.outlineLevel).toBe(2);
    const low = setParagraphOutlineLevel(buildState([plainParagraph("a")]), MIN_OUTLINE_LEVEL);
    expect(getParagraphs(low)[0]!.style?.outlineLevel).toBe(0);
  });

  it("is a no-op when the level is already set", () => {
    const state = buildState([outlinedParagraph("hi", 2)]);
    expect(setParagraphOutlineLevel(state, 2)).toBe(state);
  });

  it("is a no-op when clearing a paragraph without a level", () => {
    const state = buildState([plainParagraph("hi")]);
    expect(setParagraphOutlineLevel(state, null)).toBe(state);
  });

  it("applies only to the selected paragraphs", () => {
    const p1 = outlinedParagraph("a", 1);
    const p2 = outlinedParagraph("b", 1);
    const p3 = outlinedParagraph("c", 1);
    const state = selectRange(buildState([p1, p2, p3]), 0, 1);
    const next = setParagraphOutlineLevel(state, 5);
    const all = getParagraphs(next);
    expect(all[0]!.style?.outlineLevel).toBe(5);
    expect(all[1]!.style?.outlineLevel).toBe(5);
    expect(all[2]!.style?.outlineLevel).toBe(1);
  });
});
