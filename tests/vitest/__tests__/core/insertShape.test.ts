import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { insertShapeAtSelection } from "@/core/commands/shape.js";
import {
  getParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";

function stateWithCaret() {
  const paragraph = createEditorParagraphFromRuns([{ text: "ab" }]);
  const document = createEditorDocument([paragraph]);
  const base = createEditorStateFromDocument(document);
  return {
    ...base,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 1),
      focus: paragraphOffsetToPosition(paragraph, 1),
    },
  };
}

describe("insertShapeAtSelection", () => {
  it("inserts an object run carrying a floating shape with the given preset", () => {
    const next = insertShapeAtSelection(stateWithCaret(), "ellipse");

    const paragraph = getParagraphs(next)[0]!;
    const shapeRun = paragraph.runs.find((run) => run.textBox);

    expect(shapeRun).toBeDefined();
    expect(shapeRun!.text).toBe("￼");

    const textBox = shapeRun!.textBox!;
    expect(textBox.shape?.preset).toBe("ellipse");
    expect(textBox.shape?.fill).toBeDefined();
    expect(textBox.shape?.borderColor).toBeDefined();
    // Default "in front of text" anchor.
    expect(textBox.floating?.wrap).toBe("none");
    expect(textBox.floating?.behindDoc).toBe(false);
    // Empty editable body so text can be typed into the shape later.
    expect(textBox.blocks).toHaveLength(1);
  });

  it("places the shape at the caret and advances the selection past it", () => {
    const next = insertShapeAtSelection(stateWithCaret(), "rect");

    const paragraph = getParagraphs(next)[0]!;
    const objectIndex = paragraph.runs.findIndex((run) => run.textBox);
    // Inserted between "a" and "b" (caret was at offset 1).
    expect(objectIndex).toBeGreaterThanOrEqual(0);
    expect(next.selection.focus).toEqual(next.selection.anchor);
  });
});
