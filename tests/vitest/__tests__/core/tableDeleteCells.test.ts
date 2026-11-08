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
  canDeleteActiveTableCell,
  deleteActiveTableCell,
} from "@/core/commands/table.js";
import {
  getDocumentSectionsCanonical,
  type EditorState,
  type EditorTableCellNode,
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

function cell(textValue: string) {
  return createEditorTableCell([createEditorParagraph(textValue)]);
}

function buildTable() {
  return createEditorTable(
    [
      createEditorTableRow([cell("a"), cell("b"), cell("c")]),
      createEditorTableRow([cell("d"), cell("e")]),
    ],
    [80, 80, 80],
  );
}

function tableOf(state: EditorState): EditorTableNode {
  return getDocumentSectionsCanonical(state.document)[0]!.blocks[0] as
    EditorTableNode;
}

function rowParagraph(state: EditorState, rowIndex: number, cellIndex: number): string {
  const row = tableOf(state).rows[rowIndex]!;
  const cell = row.cells[cellIndex] as EditorTableCellNode;
  return (cell.blocks[0] as { id: string }).id;
}

function readRowCells(
  state: EditorState,
  rowIndex: number,
): EditorTableCellNode[] {
  const row = tableOf(state).rows[rowIndex] as EditorTableRowNode;
  return [...row.cells];
}

describe("table delete cells", () => {
  it("exposes a capability only inside a multi-cell row", () => {
    const initialState = createEditorStateFromDocument(
      createEditorDocument([buildTable()]),
    );
    // Two-cell row -> deletable.
    const middle = placeCaretIn(initialState, rowParagraph(initialState, 0, 1));
    expect(canDeleteActiveTableCell(middle)).toBe(true);

    // Outside a table -> not deletable.
    const outside = createEditorStateFromDocument(
      createEditorDocument([createEditorParagraph("body")]),
    );
    expect(canDeleteActiveTableCell(outside)).toBe(false);
  });

  it("removes the active cell, shifting cells left", () => {
    const initialState = createEditorStateFromDocument(
      createEditorDocument([buildTable()]),
    );
    const state = placeCaretIn(initialState, rowParagraph(initialState, 1, 0));
    const next = deleteActiveTableCell(state);
    expect(next).not.toBe(state);

    expect(readRowCells(next, 1).map((c) => c.blocks[0].id)).toEqual([
      rowParagraph(initialState, 1, 1),
    ]);
    // Previous row untouched.
    expect(readRowCells(next, 0)).toHaveLength(3);
  });

  it("no-ops when the row has a single cell", () => {
    const single = createEditorTable([
      createEditorTableRow([cell("only")]),
      createEditorTableRow([cell("x"), cell("y")]),
    ]);
    const initialState = createEditorStateFromDocument(
      createEditorDocument([single]),
    );
    const state = placeCaretIn(initialState, rowParagraph(initialState, 0, 0));
    const next = deleteActiveTableCell(state);
    expect(next).toBe(state);
  });

  it("no-ops when the caret is outside a table", () => {
    const initialState = createEditorStateFromDocument(
      createEditorDocument([createEditorParagraph("body")]),
    );
    expect(deleteActiveTableCell(initialState)).toBe(initialState);
  });
});
