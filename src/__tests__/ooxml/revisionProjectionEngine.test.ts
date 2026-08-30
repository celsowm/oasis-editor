import { describe, it, expect } from "vitest";
import { projectParagraphForMode, projectDocumentForMode } from "../../ooxml/revisionProjectionEngine.js";
import { createEditorDocument } from "@/core/editorState.js";
import type { EditorParagraphNode } from "@/core/model.js";

describe("RevisionProjectionEngine", () => {
  it("projects 'final' mode by removing deleted runs", () => {
    const p: EditorParagraphNode = {
      id: "p1",
      type: "paragraph",
      runs: [
        { id: "r1", kind: "text", text: "Kept " },
        { id: "r2", kind: "text", text: "Deleted ", revision: { id: "rev1", type: "delete", date: 0, author: "A" } },
        { id: "r3", kind: "text", text: "Inserted", revision: { id: "rev2", type: "insert", date: 0, author: "A" } },
      ],
    };

    const finalP = projectParagraphForMode(p, "final")!;
    expect(finalP).not.toBeNull();
    expect(finalP.runs.map((r) => r.text).join("")).toBe("Kept Inserted");
  });

  it("projects 'original' mode by removing inserted runs", () => {
    const p: EditorParagraphNode = {
      id: "p1",
      type: "paragraph",
      runs: [
        { id: "r1", kind: "text", text: "Kept " },
        { id: "r2", kind: "text", text: "Deleted ", revision: { id: "rev1", type: "delete", date: 0, author: "A" } },
        { id: "r3", kind: "text", text: "Inserted", revision: { id: "rev2", type: "insert", date: 0, author: "A" } },
      ],
    };

    const origP = projectParagraphForMode(p, "original")!;
    expect(origP).not.toBeNull();
    expect(origP.runs.map((r) => r.text).join("")).toBe("Kept Deleted ");
  });

  it("projects entire document for specified view mode", () => {
    const p: EditorParagraphNode = {
      id: "p1",
      type: "paragraph",
      runs: [
        { id: "r1", kind: "text", text: "Original " },
        { id: "r2", kind: "text", text: "Added", revision: { id: "rev1", type: "insert", date: 0, author: "A" } },
      ],
    };
    const doc = createEditorDocument([p]);

    const finalDoc = projectDocumentForMode(doc, "final");
    expect(finalDoc.sections?.[0]?.blocks[0]?.type).toBe("paragraph");
  });
});
