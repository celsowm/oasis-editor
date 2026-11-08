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
  canSortActiveTable,
  sortActiveTable,
  sortTableRows,
} from "@/core/commands/table.js";
import {
  getDocumentSectionsCanonical,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableNode,
  type EditorTableRowNode,
} from "@/core/model.js";

function placeCaretIn(state: EditorState, paragraphId: string): EditorState {
  return {
    ...state,
    selection: {
      anchor: { paragraphId, runId: "", offset: 0 },
      focus: { paragraphId, runId: "", offset: 0 },
    },
  };
}

function text(paragraph: EditorParagraphNode): string {
  return paragraph.runs.map((run) => run.text).join("");
}

function rowFirstCellText(row: EditorTableRowNode): string {
  return row.cells[0]!.blocks
    .map((block) => (block.type === "paragraph" ? text(block) : ""))
    .join("");
}

function bodyTexts(table: EditorTableNode): string[] {
  return table.rows
    .filter((row) => !row.isHeader)
    .map(rowFirstCellText);
}

function fixtureTable(): {
  state: EditorState;
  keyCell: ReturnType<typeof createEditorParagraph>;
} {
  // Two columns: name (caret), id. Body rows out of order.
  const name = createEditorParagraph("name");
  const row1name = createEditorParagraph("banana");
  const row2name = createEditorParagraph("apple");
  const row3name = createEditorParagraph("cherry");
  const header = createEditorTableRow(
    [createEditorTableCell([name]), createEditorTableCell([createEditorParagraph("id")])],
    { isHeader: true },
  );
  const r1 = createEditorTableRow([
    createEditorTableCell([row1name]),
    createEditorTableCell([createEditorParagraph("3")]),
  ]);
  const r2 = createEditorTableRow([
    createEditorTableCell([row2name]),
    createEditorTableCell([createEditorParagraph("1")]),
  ]);
  const r3 = createEditorTableRow([
    createEditorTableCell([row3name]),
    createEditorTableCell([createEditorParagraph("2")]),
  ]);
  const table = createEditorTable([header, r1, r2, r3], [120, 80]);
  const state = placeCaretIn(
    createEditorStateFromDocument(createEditorDocument([table])),
    row2name.id,
  );
  return { state, keyCell: row2name };
}

describe("Sort Table", () => {
  it("sorts body rows ascending by the caret column, keeping the header pinned", () => {
    const { state } = fixtureTable();
    expect(canSortActiveTable(state)).toBe(true);

    const next = sortActiveTable(state, "ascending");
    const table = getDocumentSectionsCanonical(next.document)[0]!.blocks[0] as
      EditorTableNode;
    expect(table.rows[0]!.isHeader).toBe(true);
    expect(bodyTexts(table)).toEqual(["apple", "banana", "cherry"]);
  });

  it("sorts body rows descending", () => {
    const { state } = fixtureTable();
    const next = sortActiveTable(state, "descending");
    const table = getDocumentSectionsCanonical(next.document)[0]!.blocks[0] as
      EditorTableNode;
    expect(bodyTexts(table)).toEqual(["cherry", "banana", "apple"]);
  });

  it("preserves all row objects across the sort (only order changes)", () => {
    const { state } = fixtureTable();
    const next = sortActiveTable(state, "ascending");
    const table = getDocumentSectionsCanonical(next.document)[0]!.blocks[0] as
      EditorTableNode;
    const ids = table.rows.map((row) => row.cells[0]!.blocks[0]!.id);
    expect(new Set(ids).size).toBe(table.rows.length);
  });

  it("is a no-op when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canSortActiveTable(state)).toBe(false);
    expect(sortActiveTable(state, "ascending")).toBe(state);
  });

  it("is not enabled for a single body row", () => {
    const header = createEditorTableRow(
      [createEditorTableCell([createEditorParagraph("h")])],
      { isHeader: true },
    );
    const body = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("x")]),
    ]);
    const table = createEditorTable([header, body], [120]);
    const cell = body.cells[0]!.blocks[0] as EditorParagraphNode;
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      cell.id,
    );
    expect(canSortActiveTable(state)).toBe(false);
  });

  it("sortTableRows sorts directly without a state", () => {
    const a = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("b")]),
    ]);
    const b = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("a")]),
    ]);
    const table = createEditorTable([a, b], [120]);
    const sorted = sortTableRows(table, 0, "ascending");
    expect(bodyTexts({ ...table, rows: sorted } as EditorTableNode)).toEqual([
      "a",
      "b",
    ]);
  });
});
