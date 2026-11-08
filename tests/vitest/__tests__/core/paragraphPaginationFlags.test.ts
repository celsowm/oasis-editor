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

describe("paragraph pagination flags (para.keepLines / para.widowControl)", () => {
  it("sets and clears keep-lines-together", () => {
    const state = buildState();
    const next = setParagraphStyle(state, "keepLinesTogether", true);
    expect(getParagraphs(next)[0]!.style?.keepLinesTogether).toBe(true);
    const cleared = setParagraphStyle(next, "keepLinesTogether", null);
    expect(getParagraphs(cleared)[0]!.style?.keepLinesTogether).toBeUndefined();
  });

  it("can toggle widow control off with an explicit false (its default is on)", () => {
    const state = buildState();
    const off = setParagraphStyle(state, "widowControl", false);
    expect(getParagraphs(off)[0]!.style?.widowControl).toBe(false);
    const on = setParagraphStyle(off, "widowControl", true);
    expect(getParagraphs(on)[0]!.style?.widowControl).toBe(true);
  });
});
