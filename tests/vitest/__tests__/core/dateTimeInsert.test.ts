import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { insertDateTimeText } from "@/core/commands/fieldDate.js";
import { getParagraphText, getParagraphs } from "@/core/model.js";
import type { EditorState } from "@/core/model.js";

/** Build a state with a collapsed caret at the end of `text`. */
function buildState(text = ""): EditorState {
  const paragraph = createEditorParagraphFromRuns([{ text }]);
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  const offset = text.length;
  return {
    ...state,
    selection: {
      anchor: {
        paragraphId: paragraph.id,
        runId: paragraph.runs[0]!.id,
        offset,
      },
      focus: {
        paragraphId: paragraph.id,
        runId: paragraph.runs[0]!.id,
        offset,
      },
    },
  };
}

describe("insert date-time as plain text (insert.dateTime, update:false)", () => {
  it("inserts the current date formatted with a picture", () => {
    const state = buildState("dated ");
    const value = new Date(2026, 10, 8, 14, 5, 7);
    const next = insertDateTimeText(state, "M/d/yyyy", value);
    expect(getParagraphText(getParagraphs(next)[0]!)).toBe("dated 11/8/2026");
  });

  it("inserts as ordinary text (not a field run)", () => {
    const state = buildState("");
    const value = new Date(2026, 10, 8, 14, 5, 7);
    const next = insertDateTimeText(state, "yyyy-MM-dd", value);
    expect(getParagraphs(next)[0]!.runs[0]!.kind).toBe("text");
    expect(getParagraphText(getParagraphs(next)[0]!)).toBe("2026-11-08");
  });
});
