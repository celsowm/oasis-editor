import { describe, expect, it } from "vitest";
import {
  applyDocumentOperations,
  createDocument,
  createHeading,
  createParagraph,
  createTable,
  queryDocument,
  validateDocument,
} from "@/app/client/publicDocumentApi.js";

describe("public document API", () => {
  it("creates valid documents and exposes semantic queries", () => {
    const document = createDocument({ title: "Test", blocks: [createHeading("Summary", { level: 1 }), createParagraph("Body")] });
    expect(validateDocument(document).ok).toBe(true);
    const query = queryDocument(document);
    expect(query.getText()).toContain("Summary\nBody");
    expect(query.outline()[0]?.text).toBe("Summary");
    expect(query.find("Body")).toHaveLength(1);
  });

  it("applies multiple operations atomically to cloned document data", () => {
    const document = createDocument({ blocks: [createParagraph("Hello")] });
    const paragraph = document.sections?.[0]!.blocks[0]!;
    const result = applyDocumentOperations(document, [{ op: "replaceText", target: { nodeId: paragraph.id }, text: "Changed" }, { op: "insertParagraph", text: "Second" }]);
    const changedParagraph = result.document.sections?.[0]!.blocks[0]!;
    expect(changedParagraph.type).toBe("paragraph");
    if (changedParagraph.type !== "paragraph") throw new Error("Expected paragraph");
    expect(changedParagraph.runs[0]!.text).toBe("Changed");
    expect(result.value.createdNodeIds).toHaveLength(1);
    expect(queryDocument(document).getText()).toBe("Hello");
  });

  it("constructs tables and updates cells", () => {
    const table = createTable([["A", "B"]]);
    const document = createDocument({ blocks: [table] });
    const result = applyDocumentOperations(document, [{ op: "updateTableCell", target: { tableId: table.id, row: 0, column: 1 }, text: "C" }]);
    const changedTable = result.document.sections?.[0]!.blocks[0]!;
    expect(changedTable.type).toBe("table");
    if (changedTable.type !== "table") throw new Error("Expected table");
    const changedCellParagraph = changedTable.rows[0]!.cells[1]!.blocks[0]!;
    expect(changedCellParagraph.type).toBe("paragraph");
    if (changedCellParagraph.type !== "paragraph") throw new Error("Expected paragraph");
    expect(changedCellParagraph.runs[0]!.text).toBe("C");
  });
});
