import { describe, expect, it } from "vitest";
import { createEditorStyledRun } from "@/core/editorState.js";
import { normalizeRuns } from "@/core/document/paragraphRuns.js";

function fieldRun(type: "PAGE" | "NUMPAGES"): ReturnType<typeof createEditorStyledRun> & {
  kind: "field";
  field: { type: string };
} {
  const base = createEditorStyledRun("1");
  return { ...base, kind: "field", field: { type } };
}

describe("normalizeRuns coalescing", () => {
  it("merges adjacent same-styled text runs", () => {
    const a = createEditorStyledRun("Report", {
      bold: true,
      color: "#000000",
    });
    const b = createEditorStyledRun(" page", {
      bold: true,
      color: "#000000",
    });
    const merged = normalizeRuns([a, b]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ kind: "text", text: "Report page" });
  });

  it("does not merge a field run into adjacent text", () => {
    const text = createEditorStyledRun("Report", {
      color: "#000000",
    });
    const field = fieldRun("PAGE");
    const merged = normalizeRuns([text, field]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ kind: "text", text: "Report" });
    expect(merged[1]).toMatchObject({ kind: "field", text: "1" });
  });

  it("keeps a field run separate when surrounded by text", () => {
    const text = createEditorStyledRun("Report", { color: "#000000" });
    const field = fieldRun("NUMPAGES");
    const merged = normalizeRuns([text, field, text]);
    expect(merged.map((run) => run.kind)).toEqual([
      "text",
      "field",
      "text",
    ]);
    expect(merged.map((run) => run.text)).toEqual(["Report", "1", "Report"]);
  });

  it("drops empty runs but still returns at least one paragraph run", () => {
    const empty = createEditorStyledRun("");
    const merged = normalizeRuns([empty]);
    expect(merged.length).toBeGreaterThan(0);
    expect(merged[0].text).toBe("");
  });
});
