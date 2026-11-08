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
  canToggleRepeatHeaderRows,
  isRepeatHeaderRowsActive,
  toggleRepeatHeaderRows,
} from "@/core/commands/table.js";
import {
  getDocumentSectionsCanonical,
  type EditorState,
  type EditorTableNode,
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

function tableWithCells(rowCount: number): {
  table: ReturnType<typeof createEditorTable>;
  firstCell: ReturnType<typeof createEditorParagraph>;
} {
  const firstCell = createEditorParagraph("first");
  const cells = Array.from({ length: rowCount }, (_, index) =>
    createEditorParagraph(`row${index}`),
  );
  cells[0] = firstCell;
  const table = createEditorTable(
    cells.map((p) => createEditorTableRow([createEditorTableCell([p])])),
    [120],
  );
  return { table, firstCell };
}

function readTable(state: EditorState): EditorTableNode {
  return getDocumentSectionsCanonical(state.document)[0]!.blocks[0] as
    EditorTableNode;
}

describe("Repeat Header Rows", () => {
  it("marks the first row as a header when it was not one", () => {
    const { table, firstCell } = tableWithCells(2);
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      firstCell.id,
    );
    expect(canToggleRepeatHeaderRows(state)).toBe(true);
    expect(isRepeatHeaderRowsActive(state)).toBe(false);

    const next = toggleRepeatHeaderRows(state);
    expect(readTable(next).rows[0]!.isHeader).toBe(true);
    expect(isRepeatHeaderRowsActive(next)).toBe(true);
  });

  it("clears the header mark when it was already a header", () => {
    const cell = createEditorParagraph("h");
    const body = createEditorParagraph("b");
    const table = createEditorTable(
      [
        createEditorTableRow([createEditorTableCell([cell])], { isHeader: true }),
        createEditorTableRow([createEditorTableCell([body])]),
      ],
      [120],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      cell.id,
    );

    const next = toggleRepeatHeaderRows(state);
    expect(readTable(next).rows[0]!.isHeader).toBeUndefined();
    expect(isRepeatHeaderRowsActive(next)).toBe(false);
  });

  it("leaves the other rows untouched", () => {
    const { table, firstCell } = tableWithCells(3);
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      firstCell.id,
    );

    const next = toggleRepeatHeaderRows(state);
    const rows = readTable(next).rows;
    expect(rows[0]!.isHeader).toBe(true);
    expect(rows[1]!.isHeader).toBeUndefined();
    expect(rows[2]!.isHeader).toBeUndefined();
  });

  it("is a no-op when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canToggleRepeatHeaderRows(state)).toBe(false);
    expect(toggleRepeatHeaderRows(state)).toBe(state);
  });
});
