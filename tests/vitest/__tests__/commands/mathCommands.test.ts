import { describe, expect, it } from "vitest";
import { createEditorStateFromTexts } from "@/core/editorState.js";
import { getParagraphs } from "@/core/model.js";
import { insertMathAtSelection, updateMathRun } from "@/core/commands/text.js";

describe("math commands", () => {
  it("inserts an equation as one inline object", () => {
    const state = createEditorStateFromTexts(["x"]);
    const next = insertMathAtSelection(state, {
      version: 1,
      children: [{ kind: "fraction", numerator: [{ kind: "text", value: "a" }], denominator: [{ kind: "text", value: "b" }] }],
    });
    expect(getParagraphs(next)[0]!.runs.map((run) => run.kind)).toEqual(["math", "text"]);
    expect(next.selection.focus.offset).toBe(1);
  });

  it("updates an equation without changing its run identity", () => {
    const state = insertMathAtSelection(createEditorStateFromTexts([""]), {
      version: 1,
      children: [{ kind: "text", value: "x" }],
    });
    const run = getParagraphs(state)[0]!.runs[0]!;
    const next = updateMathRun(state, run.id, {
      version: 1,
      children: [{ kind: "text", value: "y" }],
    });
    expect(getParagraphs(next)[0]!.runs[0]).toMatchObject({ id: run.id, kind: "math" });
    const updated = getParagraphs(next)[0]!.runs[0]!;
    expect(updated.kind).toBe("math");
    if (updated.kind === "math") {
      expect(updated.math.children).toEqual([{ kind: "text", value: "y" }]);
    }
  });
});
