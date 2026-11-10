import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import type { EditorState } from "@/core/model.js";
import { applyUnderlineStyle } from "@/core/commands/textFormatting.js";

function selection(): EditorState {
  const p = createEditorParagraphFromRuns([
    { text: "before " },
    {
      text: "first",
      styles: { bold: true, underline: true, underlineStyle: "wave" },
    },
    { text: " second", styles: { italic: true } },
    { text: " after" },
  ]);
  const state = createEditorStateFromDocument(createEditorDocument([p]));
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(p, 7),
      focus: paragraphOffsetToPosition(p, 19),
    },
  };
}
function characters(state: EditorState) {
  return getParagraphs(state)[0]!.runs.flatMap((run) =>
    [...run.text].map((char) => ({ char, ...run.styles })),
  );
}

describe("atomic underline application", () => {
  it("sets the whole mixed range, preserving outside text, emphasis and selection", () => {
    const initial = selection();
    const before = characters(initial);
    const next = applyUnderlineStyle(initial, "double");
    const after = characters(next);
    expect(after.slice(0, 7)).toEqual(before.slice(0, 7));
    expect(after.slice(19)).toEqual(before.slice(19));
    expect(
      after
        .slice(7, 19)
        .every((c) => c.underline && c.underlineStyle === "double"),
    ).toBe(true);
    expect(after[7]?.bold).toBe(true);
    expect(after[13]?.italic).toBe(true);
    expect(characters(initial)).toEqual(before);
    expect(getParagraphText(getParagraphs(next)[0]!)).toBe(
      "before first second after",
    );
    const p = getParagraphs(next)[0]!;
    expect(next.selection).toEqual({
      anchor: paragraphOffsetToPosition(p, 7),
      focus: paragraphOffsetToPosition(p, 19),
    });
  });
  it("single replaces an existing variant; removal clears both properties", () => {
    const double = applyUnderlineStyle(selection(), "double");
    const single = characters(applyUnderlineStyle(double, "single")).slice(
      7,
      19,
    );
    expect(
      single.every(
        (c) => c.underline === true && c.underlineStyle === undefined,
      ),
    ).toBe(true);
    const removed = characters(applyUnderlineStyle(double, null)).slice(7, 19);
    expect(
      removed.every(
        (c) => c.underline === undefined && c.underlineStyle === undefined,
      ),
    ).toBe(true);
    expect(removed[0]?.bold).toBe(true);
  });
  it("does not mutate a collapsed selection", () => {
    const initial = selection();
    const collapsed = {
      ...initial,
      selection: {
        anchor: initial.selection.anchor,
        focus: initial.selection.anchor,
      },
    };
    expect(applyUnderlineStyle(collapsed, "double")).toBe(collapsed);
  });
});
