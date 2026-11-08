import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { setParagraphStyle } from "@/core/commands/block.js";
import { getParagraphs } from "@/core/model.js";

function buildState(): ReturnType<typeof createEditorStateFromDocument> {
  const paragraph = createEditorParagraphFromRuns([{ text: "hello" }]);
  const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
  // Put the caret inside the single paragraph.
  return {
    ...state,
    selection: {
      anchor: { paragraphId: paragraph.id, runId: paragraph.runs[0]!.id, offset: 1 },
      focus: { paragraphId: paragraph.id, runId: paragraph.runs[0]!.id, offset: 2 },
    },
  };
}

function paraBidi(
  state: ReturnType<typeof createEditorStateFromDocument>,
): boolean | undefined {
  return getParagraphs(state)[0]!.style?.bidi;
}

describe("paragraph text direction (para.rtl / para.ltr)", () => {
  it("defaults to undefined (left-to-right is the Word default)", () => {
    expect(paraBidi(buildState())).toBeUndefined();
  });

  it("sets right-to-left (bidi true)", () => {
    const state = buildState();
    const next = setParagraphStyle(state, "bidi", true);
    expect(paraBidi(next)).toBe(true);
  });

  it("clears right-to-left back to left-to-right (null)", () => {
    const rtl = setParagraphStyle(buildState(), "bidi", true);
    expect(paraBidi(rtl)).toBe(true);
    const ltr = setParagraphStyle(rtl, "bidi", null);
    expect(paraBidi(ltr)).toBeUndefined();
  });
});
