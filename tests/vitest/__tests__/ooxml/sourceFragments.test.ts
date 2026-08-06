import { describe, expect, it } from "vitest";
import type { EditorTextRun } from "@/core/model.js";
import { createEditorRunSemanticSignature } from "@/ooxml/word/sourceFragments.js";

describe("OOXML semantic source signatures", () => {
  it("ignores editor node identity changes", () => {
    const first: EditorTextRun = {
      id: "run:first",
      kind: "text",
      text: "Same",
    };
    const second: EditorTextRun = {
      ...first,
      id: "run:second",
    };

    expect(createEditorRunSemanticSignature(first)).toBe(
      createEditorRunSemanticSignature(second),
    );
  });

  it("retains semantic ids owned by inline reference payloads", () => {
    const first: EditorTextRun = {
      id: "run:first",
      kind: "footnoteReference",
      text: "",
      footnoteReference: { footnoteId: "footnote:first" },
    };
    const second: EditorTextRun = {
      ...first,
      id: "run:second",
      footnoteReference: { footnoteId: "footnote:second" },
    };

    expect(createEditorRunSemanticSignature(first)).not.toBe(
      createEditorRunSemanticSignature(second),
    );
  });
});
