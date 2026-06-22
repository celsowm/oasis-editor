import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import {
  setActiveTableStyleValue,
  setTableCellStyleValue,
  setTableColumnWidths,
} from "@/core/commands/table.js";
import { acceptRevision, rejectRevision } from "@/core/commands/history.js";
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

  it("authors and accepts a typed table property revision", () => {
    const cell = createEditorTableCell([createEditorParagraph("cell")]);
    const table = createEditorTable([createEditorTableRow([cell])], [120]);
    table.style = { width: 120, align: "left" };
    const base = createEditorStateFromDocument(createEditorDocument([table]));
    const tracked = setActiveTableStyleValue(
      { ...base, trackChangesEnabled: true },
      table.id,
      "align",
      "center",
    );
    const trackedTable = getDocumentSectionsCanonical(tracked.document)[0]!
      .blocks[0]!;
    expect(trackedTable.type).toBe("table");
    if (trackedTable.type !== "table") return;
    expect(trackedTable.style?.revision?.previous.align).toBe("left");
    const accepted = acceptRevision(tracked, trackedTable.style!.revision!.id);
    const acceptedTable = getDocumentSectionsCanonical(accepted.document)[0]!
      .blocks[0]!;
    expect(acceptedTable.type).toBe("table");
    if (acceptedTable.type !== "table") return;
    expect(acceptedTable.style?.align).toBe("center");
    expect(acceptedTable.style?.revision).toBeUndefined();
  });

  it("rejects a tracked cell property edit by restoring its snapshot", () => {
    const cell = createEditorTableCell([createEditorParagraph("cell")]);
    cell.style = { shading: "#ffffff" };
    const table = createEditorTable([createEditorTableRow([cell])], [120]);
    const base = createEditorStateFromDocument(createEditorDocument([table]));
    const tracked = setTableCellStyleValue(
      { ...base, trackChangesEnabled: true },
      "shading",
      "#ff0000",
    );
    const trackedTable = getDocumentSectionsCanonical(tracked.document)[0]!
      .blocks[0]!;
    expect(trackedTable.type).toBe("table");
    if (trackedTable.type !== "table") return;
    const revision = trackedTable.rows[0]!.cells[0]!.style!.propertyRevision!;
    const rejected = rejectRevision(tracked, revision.id);
    const rejectedTable = getDocumentSectionsCanonical(rejected.document)[0]!
      .blocks[0]!;
    expect(rejectedTable.type).toBe("table");
    if (rejectedTable.type !== "table") return;
    expect(rejectedTable.rows[0]!.cells[0]!.style?.shading).toBe("#ffffff");
    expect(
      rejectedTable.rows[0]!.cells[0]!.style?.propertyRevision,
    ).toBeUndefined();
  });

  it("accepts and rejects structural table revisions", () => {
    const inserted = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("inserted")]),
    ]);
    inserted.style = {
      revision: {
        id: "row-insert",
        author: "A",
        date: 1,
        type: "insert",
      },
    };
    const deleted = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("deleted")]),
    ]);
    deleted.style = {
      revision: {
        id: "row-delete",
        author: "A",
        date: 2,
        type: "delete",
      },
    };
    const stable = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("stable")]),
    ]);
    const table = createEditorTable([stable, inserted, deleted], [120]);
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const rejectedInsert = rejectRevision(state, "row-insert");
    let nextTable = getDocumentSectionsCanonical(rejectedInsert.document)[0]!
      .blocks[0]!;
    expect(nextTable.type).toBe("table");
    if (nextTable.type !== "table") return;
    expect(nextTable.rows.map((row) => row.id)).not.toContain(inserted.id);

    const acceptedDelete = acceptRevision(rejectedInsert, "row-delete");
    nextTable = getDocumentSectionsCanonical(acceptedDelete.document)[0]!
      .blocks[0]!;
    expect(nextTable.type).toBe("table");
    if (nextTable.type !== "table") return;
    expect(nextTable.rows.map((row) => row.id)).toEqual([stable.id]);
  });
});
