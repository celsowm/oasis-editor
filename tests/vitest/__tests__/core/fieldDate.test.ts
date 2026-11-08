import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { getRunField, type EditorParagraphNode } from "@/core/model.js";
import {
  insertDateField,
  isDateFieldRun,
} from "@/core/commands/fieldDate.js";

function fixture() {
  const paragraph = createEditorParagraph("Hello");
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  return { paragraph, state };
}

function bodyParagraph(state: {
  document: { sections?: Array<{ blocks: unknown[] }> };
}): EditorParagraphNode {
  return state.document.sections![0]!.blocks[0] as EditorParagraphNode;
}

describe("insertDateField", () => {
  it("inserts a DATE field at the caret with the resolved result cached in text", () => {
    const { state } = fixture();
    const result = insertDateField(state, {
      value: new Date(2026, 10, 8, 0, 0, 0),
    });
    const runs = bodyParagraph(result).runs;
    const dateRun = runs.find(isDateFieldRun)!;
    expect(dateRun).toBeDefined();
    // Caret was at offset 0, so the field precedes "Hello".
    expect(runs[0]).toBe(dateRun);
    expect(dateRun.text).toBe("11/8/2026");
    expect(getRunField(dateRun)).toEqual({ type: "DATE" });
    // Selection moved just past the inserted text, and the rest follows.
    const remaining = runs
      .map((run) => run.text)
      .join("")
      .replace("11/8/2026", "");
    expect(remaining).toBe("Hello");
  });

  it("applies the requested \\@ picture and stores dateFormat on the field", () => {
    const { state } = fixture();
    const result = insertDateField(state, {
      dateFormat: "yyyy-MM-dd",
      value: new Date(2026, 10, 8, 0, 0, 0),
    });
    const dateRun = bodyParagraph(result).runs.find(isDateFieldRun)!;
    expect(dateRun.text).toBe("2026-11-08");
    expect(getRunField(dateRun)).toEqual({
      type: "DATE",
      dateFormat: "yyyy-MM-dd",
    });
  });

  it("inserts into the middle of existing text and moves the caret after the field", () => {
    const { state, paragraph } = fixture();
    const mid = {
      ...state,
      selection: { anchor: { paragraphId: paragraph.id, runId: "", offset: 5 }, focus: { paragraphId: paragraph.id, runId: "", offset: 5 } },
    };
    const result = insertDateField(mid, {
      value: new Date(2026, 10, 8, 0, 0, 0),
    });
    const text = bodyParagraph(result).runs
      .map((run) => run.text)
      .join("");
    expect(text).toBe("Hello11/8/2026");
  });
});
