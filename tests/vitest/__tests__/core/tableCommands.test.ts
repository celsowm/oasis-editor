import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { setTableColumnWidths } from "@/core/commands/table.js";
import { getDocumentSectionsCanonical } from "@/core/model.js";

describe("table commands", () => {
  it("persists left indent when resizing the table left edge", () => {
    const table = createEditorTable(
      [
        createEditorTableRow([
          createEditorTableCell([createEditorParagraph("Linha 1 Col 1")]),
          createEditorTableCell([createEditorParagraph("Linha 1 Col 2")]),
        ]),
      ],
      [120, 120],
    );
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const next = setTableColumnWidths(
      state,
      table.id,
      { 0: 90, 1: 120 },
      210,
      30,
    );
    const nextTable = getDocumentSectionsCanonical(next.document)[0]!.blocks[0];

    expect(nextTable.type).toBe("table");
    if (nextTable.type !== "table") return;
    expect(nextTable.gridCols).toEqual([90, 120]);
    expect(nextTable.style?.width).toBe(210);
    expect(nextTable.style?.indentLeft).toBe(30);
    expect(nextTable.rows[0]!.cells[0]!.style?.width).toBe(90);
  });
});
