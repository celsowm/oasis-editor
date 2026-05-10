import { describe, expect, it } from "vitest";
import { replaceParagraphsInBlocks } from "../../core/commands/utils.js";
import { createEditorParagraph, createEditorTableCell, createEditorTableRow, createEditorDocument } from "../../core/editorState.js";
import type { EditorBlockNode, EditorTableNode } from "../../core/model.js";

describe("replaceParagraphsInBlocks", () => {
  it("preserves references for unchanged nodes in a table", () => {
    // 1. Create a table with two cells, each having one paragraph.
    const p1 = createEditorParagraph("Cell 1");
    const p2 = createEditorParagraph("Cell 2");

    const cell1 = createEditorTableCell([p1]);
    const cell2 = createEditorTableCell([p2]);

    const row = createEditorTableRow([cell1, cell2]);
    const table: EditorTableNode = {
      id: "table:1",
      type: "table",
      rows: [row],
      columnWidths: [100, 100],
    };

    const blocks: EditorBlockNode[] = [table];

    // 2. We simulate an edit that only changes p1 to newP1
    const newP1 = { ...p1, runs: [{ ...p1.runs[0], text: "Cell 1 Edited" }] };

    // The flat list of paragraphs reflects the updated state
    const newParagraphs = [newP1, p2];

    // 3. Call the function
    const resultBlocks = replaceParagraphsInBlocks(blocks, newParagraphs);

    expect(resultBlocks.length).toBe(1);

    const resultTable = resultBlocks[0] as EditorTableNode;
    expect(resultTable.type).toBe("table");

    // The table reference should change because cell1 changed
    expect(resultTable).not.toBe(table);

    // The row reference should change because cell1 changed
    const resultRow = resultTable.rows[0];
    expect(resultRow).not.toBe(row);

    // Cell 1 should be a new reference containing newP1
    const resultCell1 = resultRow.cells[0];
    expect(resultCell1).not.toBe(cell1);
    expect(resultCell1.blocks[0]).toBe(newP1);

    // CRITICAL: Cell 2 should be the exact same reference because it was not modified
    const resultCell2 = resultRow.cells[1];
    expect(resultCell2).toBe(cell2);
    expect(resultCell2.blocks[0]).toBe(p2);
  });

  it("preserves the top-level block array reference if nothing changed", () => {
    const p1 = createEditorParagraph("Cell 1");
    const cell1 = createEditorTableCell([p1]);
    const row = createEditorTableRow([cell1]);
    const table: EditorTableNode = {
      id: "table:1",
      type: "table",
      rows: [row],
      columnWidths: [100],
    };

    const blocks: EditorBlockNode[] = [table];
    const newParagraphs = [p1]; // Identical references

    const resultBlocks = replaceParagraphsInBlocks(blocks, newParagraphs);
    expect(resultBlocks).toBe(blocks);
  });
});
