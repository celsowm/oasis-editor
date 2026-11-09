import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { setParagraphAlign } from "@/core/commands/paragraphAlign.js";

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

function paragraph(text: string, align?: string): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  if (align !== undefined) {
    p.style = { ...(p.style ?? {}), align } as EditorParagraphNode["style"];
  }
  return p;
}

describe("set paragraph align (w:jc/@w:val)", () => {
  it("sets alignment on the selected paragraph", () => {
    const next = setParagraphAlign(buildState([paragraph("hi")]), "center");
    expect(getParagraphs(next)[0]!.style?.align).toBe("center");
  });

  it("stores right alignment", () => {
    const next = setParagraphAlign(buildState([paragraph("hi")]), "right");
    expect(getParagraphs(next)[0]!.style?.align).toBe("right");
  });

  it("clears the key when null is passed (default)", () => {
    const next = setParagraphAlign(buildState([paragraph("hi", "left")]), null);
    expect(getParagraphs(next)[0]!.style?.align).toBeUndefined();
  });

  it("leaves the value unchanged when it already matches", () => {
    const on = buildState([paragraph("hi", "justify")]);
    expect(getParagraphs(setParagraphAlign(on, "justify"))[0]!.style?.align).toBe(
      "justify",
    );
    const off = buildState([paragraph("hi")]);
    expect(
      getParagraphs(setParagraphAlign(off, null))[0]!.style?.align,
    ).toBeUndefined();
  });

  it("applies only to the selected paragraphs", () => {
    const p1 = paragraph("a");
    const p2 = paragraph("b");
    const p3 = paragraph("c");
    const state = selectRange(buildState([p1, p2, p3]), 0, 1);
    const next = setParagraphAlign(state, "right");
    const all = getParagraphs(next);
    expect(all[0]!.style?.align).toBe("right");
    expect(all[1]!.style?.align).toBe("right");
    expect(all[2]!.style?.align).toBeUndefined();
  });
});
