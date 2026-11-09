import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorState } from "@/core/model.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { hasDropCap, setDropCap } from "@/core/commands/dropCap.js";

function buildState(text: string): EditorState {
  const paragraph = createEditorParagraphFromRuns([{ text }]);
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, text.length),
    },
  };
}

describe("drop cap (insert.dropCap)", () => {
  it("defaults to no drop cap", () => {
    expect(hasDropCap(buildState("hello"))).toBe(false);
  });

  it("sets a drop cap using the paragraph's first character and default 3 lines", () => {
    const next = setDropCap(buildState("hello"), {});
    expect(getParagraphs(next)[0]!.dropCap).toMatchObject({
      text: "h",
      lines: 3,
      type: "drop",
    });
  });

  it("honors lines, type and font", () => {
    const next = setDropCap(buildState("hello"), {
      lines: 2,
      type: "margin",
      font: "Georgia",
    });
    const dropCap = getParagraphs(next)[0]!.dropCap;
    expect(dropCap).toMatchObject({ text: "h", lines: 2, type: "margin" });
    expect(dropCap?.style?.fontFamily).toBe("Georgia");
  });

  it("clamps lines to 1-10", () => {
    const big = setDropCap(buildState("hello"), { lines: 50 });
    expect(getParagraphs(big)[0]!.dropCap?.lines).toBe(10);
    const small = setDropCap(buildState("hello"), { lines: 0 });
    // lines:0 means "none" → clears.
    expect(getParagraphs(small)[0]!.dropCap).toBeUndefined();
  });

  it("clears an existing drop cap when type is none or text is empty", () => {
    const on = setDropCap(buildState("hello"), {});
    expect(hasDropCap(on)).toBe(true);
    const byType = setDropCap(on, { type: "none" });
    expect(hasDropCap(byType)).toBe(false);
    const onAgain = setDropCap(buildState("hello"), {});
    const byText = setDropCap(onAgain, { text: "" });
    expect(hasDropCap(byText)).toBe(false);
  });
});
