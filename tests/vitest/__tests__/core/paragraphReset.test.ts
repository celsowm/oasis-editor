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
import { resetParagraphFormatting } from "@/core/commands/paragraphReset.js";

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

function styledParagraph(
  text: string,
  patch: Parameters<typeof createEditorParagraphFromRuns>[0][number]["styles"],
  stylePatch?: Record<string, unknown>,
): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  p.style = { ...(stylePatch ?? {}) } as never;
  return p;
}

describe("reset paragraph formatting (para.reset)", () => {
  it("keeps the named style and clears direct paragraph formatting", () => {
    const p = styledParagraph("hi", undefined, {
      styleId: "normal",
      indentLeft: 72,
    });
    const next = resetParagraphFormatting(buildState([p]));
    const out = getParagraphs(next)[0]!;
    expect(out.style?.styleId).toBe("normal");
    expect(out.style?.indentLeft).toBeUndefined();
  });

  it("clears alignment, spacing, borders and tab stops", () => {
    const p = styledParagraph("hi", undefined, {
      styleId: "normal",
      align: "center",
      spacingBefore: 24,
      spacingAfter: 12,
      borderTop: { width: 1, type: "solid", color: "#000000" },
      tabs: [{ position: 72, type: "left" }],
    });
    const next = resetParagraphFormatting(buildState([p]));
    const out = getParagraphs(next)[0]!;
    expect(out.style).toEqual({ styleId: "normal" });
  });

  it("preserves the list and drop cap", () => {
    const p = styledParagraph("hi", undefined, { styleId: "normal" });
    p.list = { kind: "ordered", level: 1 };
    p.dropCap = { lines: 3, text: "h", type: "drop" };
    const next = resetParagraphFormatting(buildState([p]));
    const out = getParagraphs(next)[0]!;
    expect(out.list).toEqual({ kind: "ordered", level: 1 });
    expect(out.dropCap).toEqual({ lines: 3, text: "h", type: "drop" });
  });

  it("is a no-op when only the named style is present", () => {
    const p = styledParagraph("hi", undefined, { styleId: "normal" });
    const state = buildState([p]);
    expect(resetParagraphFormatting(state)).toBe(state);
  });

  it("resets only the selected paragraphs", () => {
    const p1 = styledParagraph("a", undefined, {
      styleId: "normal",
      align: "center",
    });
    const p2 = styledParagraph("b", undefined, {
      styleId: "normal",
      spacingBefore: 24,
    });
    const p3 = styledParagraph("c", undefined, { styleId: "normal" });
    const state = selectRange(buildState([p1, p2, p3]), 0, 1);
    const next = resetParagraphFormatting(state);
    const all = getParagraphs(next);
    expect(all[0]!.style).toEqual({ styleId: "normal" });
    expect(all[1]!.style).toEqual({ styleId: "normal" });
    // Unselected paragraph keeps its direct formatting.
    expect(all[2]!.style?.spacingBefore).toBeUndefined();
    expect(all[2]!.style?.styleId).toBe("normal");
    expect(all[2]!.style).toEqual({ styleId: "normal" });
  });

  it("clears outline level used by promoted body text", () => {
    const p = styledParagraph("hi", undefined, {
      styleId: "heading2",
      outlineLevel: 1,
    });
    const next = resetParagraphFormatting(buildState([p]));
    const out = getParagraphs(next)[0]!;
    expect(out.style?.outlineLevel).toBeUndefined();
    expect(out.style?.styleId).toBe("heading2");
  });
});
