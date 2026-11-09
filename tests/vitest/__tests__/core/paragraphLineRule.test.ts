import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import {
  setParagraphLineRule,
  type ParagraphLineRule,
} from "@/core/commands/paragraphLineRule.js";

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

function paragraph(text: string, lineRule?: ParagraphLineRule): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  if (lineRule !== undefined) {
    p.style = { ...(p.style ?? {}), lineRule };
  }
  return p;
}

describe("set paragraph line rule (w:lineRule)", () => {
  it("sets an exact line rule on the selected paragraph", () => {
    const next = setParagraphLineRule(buildState([paragraph("hi")]), "exact");
    expect(getParagraphs(next)[0]!.style?.lineRule).toBe("exact");
  });

  it("sets an atLeast line rule and keeps the line height", () => {
    const p = paragraph("hi");
    p.style = { ...(p.style ?? {}), lineHeight: 20 };
    const next = setParagraphLineRule(buildState([p]), "atLeast");
    const style = getParagraphs(next)[0]!.style!;
    expect(style.lineRule).toBe("atLeast");
    expect(style.lineHeight).toBe(20);
  });

  it("clears the key when auto is passed (default, omitted on export)", () => {
    const next = setParagraphLineRule(buildState([paragraph("hi", "exact")]), "auto");
    expect(getParagraphs(next)[0]!.style?.lineRule).toBeUndefined();
  });

  it("clears the key when null is passed", () => {
    const next = setParagraphLineRule(buildState([paragraph("hi", "exact")]), null);
    expect(getParagraphs(next)[0]!.style?.lineRule).toBeUndefined();
  });

  it("is a no-op when the value is unchanged", () => {
    const exact = buildState([paragraph("hi", "exact")]);
    expect(setParagraphLineRule(exact, "exact")).toBe(exact);
    const auto = buildState([paragraph("hi")]);
    expect(setParagraphLineRule(auto, "auto")).toBe(auto);
  });

  it("applies only to the selected paragraphs", () => {
    const p1 = paragraph("a");
    const p2 = paragraph("b");
    const p3 = paragraph("c");
    const state = selectRange(buildState([p1, p2, p3]), 0, 1);
    const next = setParagraphLineRule(state, "exact");
    const all = getParagraphs(next);
    expect(all[0]!.style?.lineRule).toBe("exact");
    expect(all[1]!.style?.lineRule).toBe("exact");
    expect(all[2]!.style?.lineRule).toBeUndefined();
  });
});
