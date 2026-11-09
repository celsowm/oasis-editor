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
  setParagraphListLevel,
  MAX_LIST_LEVEL,
} from "@/core/commands/paragraphListLevel.js";

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

function listParagraph(
  text: string,
  level: number | undefined,
): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  p.list = { kind: "ordered", ...(level !== undefined ? { level } : {}) };
  return p;
}

function plainParagraph(text: string): EditorParagraphNode {
  return createEditorParagraphFromRuns([{ text }]);
}

describe("set paragraph list level (para.listLevel)", () => {
  it("sets the list level on the selected list paragraph", () => {
    const next = setParagraphListLevel(buildState([listParagraph("hi", 0)]), 2);
    expect(getParagraphs(next)[0]!.list?.level).toBe(2);
  });

  it("leaves a non-list paragraph untouched", () => {
    const state = buildState([plainParagraph("hi")]);
    expect(setParagraphListLevel(state, 2)).toBe(state);
  });

  it("clamps the level to the valid 0-8 range", () => {
    const high = setParagraphListLevel(
      buildState([listParagraph("hi", 0)]),
      50,
    );
    expect(getParagraphs(high)[0]!.list?.level).toBe(MAX_LIST_LEVEL);
    const low = setParagraphListLevel(buildState([listParagraph("hi", 3)]), -2);
    expect(getParagraphs(low)[0]!.list?.level).toBe(0);
    const rounded = setParagraphListLevel(
      buildState([listParagraph("hi", 0)]),
      2.4,
    );
    expect(getParagraphs(rounded)[0]!.list?.level).toBe(2);
  });

  it("is a no-op when the level is already set", () => {
    const state = buildState([listParagraph("hi", 2)]);
    expect(setParagraphListLevel(state, 2)).toBe(state);
  });

  it("applies only to the selected paragraphs", () => {
    const p1 = listParagraph("a", 0);
    const p2 = listParagraph("b", 0);
    const p3 = listParagraph("c", 0);
    const state = selectRange(buildState([p1, p2, p3]), 0, 1);
    const next = setParagraphListLevel(state, 4);
    const all = getParagraphs(next);
    expect(all[0]!.list?.level).toBe(4);
    expect(all[1]!.list?.level).toBe(4);
    expect(all[2]!.list?.level).toBe(0);
  });
});
