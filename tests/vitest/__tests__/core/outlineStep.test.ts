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
  stepOutlineLevel,
  MAX_HEADING_LEVEL,
} from "@/core/commands/outlineStep.js";

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

/** Select a whole paragraph by index rather than the first. */
function selectParagraph(
  paragraphs: EditorParagraphNode[],
  index: number,
): EditorState {
  const state = createEditorStateFromDocument(
    createEditorDocument(paragraphs),
  );
  const target = paragraphs[index]!;
  const text = target.runs.map((r) => r.text).join("");
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(target, 0),
      focus: paragraphOffsetToPosition(target, text.length),
    },
  };
}

function heading(text: string, level: number): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  p.style = {
    styleId: `heading${level}`,
    outlineLevel: undefined,
  };
  return p;
}

function body(text: string): EditorParagraphNode {
  return createEditorParagraphFromRuns([{ text }]);
}

function listItem(text: string, level: number): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  p.list = { kind: "ordered", level };
  return p;
}

describe("outline step (para.promote / para.demote)", () => {
  it("promotes a heading one level", () => {
    const next = stepOutlineLevel(buildState([heading("H", 2)]), true);
    expect(getParagraphs(next)[0]!.style?.styleId).toBe("heading1");
  });

  it("demotes a heading one level", () => {
    const next = stepOutlineLevel(buildState([heading("H", 2)]), false);
    expect(getParagraphs(next)[0]!.style?.styleId).toBe("heading3");
  });

  it("clamps heading promotion at Heading 1 and demotion at Heading 9", () => {
    const promoted = stepOutlineLevel(buildState([heading("H", 1)]), true);
    expect(getParagraphs(promoted)[0]!.style?.styleId).toBe("heading1");
    const demoted = stepOutlineLevel(
      buildState([heading("H", MAX_HEADING_LEVEL)]),
      false,
    );
    expect(getParagraphs(demoted)[0]!.style?.styleId).toBe(
      `heading${MAX_HEADING_LEVEL}`,
    );
  });

  it("promotes body text to the preceding heading level (Heading 1 when none)", () => {
    const next = stepOutlineLevel(buildState([body("text")]), true);
    expect(getParagraphs(next)[0]!.style?.styleId).toBe("heading1");
  });

  it("body text uses the heading level immediately before the selection", () => {
    const next = stepOutlineLevel(
      selectParagraph([heading("H", 3), body("text")], 1),
      true,
    );
    expect(getParagraphs(next)[1]!.style?.styleId).toBe("heading3");
  });

  it("cannot demote body text further (no-op)", () => {
    const state = buildState([body("text")]);
    expect(stepOutlineLevel(state, false)).toBe(state);
  });

  it("a list item changes list level, not its heading style", () => {
    const next = stepOutlineLevel(buildState([listItem("x", 1)]), true);
    const item = getParagraphs(next)[0]!;
    expect(item.list?.level).toBe(0);
    expect(item.style?.styleId).toBeUndefined();
  });

  it("demoting a list item increases its level", () => {
    const next = stepOutlineLevel(buildState([listItem("x", 1)]), false);
    expect(getParagraphs(next)[0]!.list?.level).toBe(2);
  });
});
