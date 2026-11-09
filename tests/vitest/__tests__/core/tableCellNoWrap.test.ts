import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { setTableCellNoWrap } from "@/core/commands/table.js";
import {
  getDocumentSectionsCanonical,
  type EditorState,
  type EditorTableNode,
} from "@/core/model.js";

function firstTable(state: EditorState): EditorTableNode {
  const table = getDocumentSectionsCanonical(state.document)[0]!.blocks[0]!;
  expect(table.type).toBe("table");
  return table as EditorTableNode;
}

function twoCellFixture(): {
  state: EditorState;
  paragraph: ReturnType<typeof createEditorParagraph>;
} {
  const paragraph = createEditorParagraph("a");
  const table = createEditorTable([
    createEditorTableRow([
      createEditorTableCell([paragraph]),
      createEditorTableCell([createEditorParagraph("b")]),
    ]),
  ]);
  const state = createEditorStateFromDocument(createEditorDocument([table]));
  return { state, paragraph };
}

function caretIn(
  state: EditorState,
  paragraph: ReturnType<typeof createEditorParagraph>,
): EditorState {
  return {
    ...state,
    selection: {
      anchor: { paragraphId: paragraph.id, runId: "", offset: 0 },
      focus: { paragraphId: paragraph.id, runId: "", offset: 0 },
    },
  };
}

describe("table cell no wrap (w:noWrap)", () => {
  it("sets no wrap on the active cell (stores true)", () => {
    const { state, paragraph } = twoCellFixture();
    const inside = caretIn(state, paragraph);
    const next = setTableCellNoWrap(inside, true);
    expect(firstTable(next).rows[0]!.cells[0]!.style?.noWrap).toBe(true);
  });

  it("stores an explicit false", () => {
    const { state, paragraph } = twoCellFixture();
    const on = setTableCellNoWrap(caretIn(state, paragraph), true);
    const off = setTableCellNoWrap(on, false);
    expect(firstTable(off).rows[0]!.cells[0]!.style?.noWrap).toBe(false);
  });

  it("clears the key when null is passed (default off)", () => {
    const { state, paragraph } = twoCellFixture();
    const on = setTableCellNoWrap(caretIn(state, paragraph), true);
    const cleared = setTableCellNoWrap(on, null);
    expect(firstTable(cleared).rows[0]!.cells[0]!.style?.noWrap).toBeUndefined();
  });

  it("affects only the active cell", () => {
    const { state, paragraph } = twoCellFixture();
    const inside = caretIn(state, paragraph);
    const next = setTableCellNoWrap(inside, true);
    const table = firstTable(next);
    expect(table.rows[0]!.cells[0]!.style?.noWrap).toBe(true);
    expect(table.rows[0]!.cells[1]!.style?.noWrap).toBeUndefined();
  });

  it("is a no-op when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    const next = setTableCellNoWrap(state, true);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveProperty("type", "paragraph");
  });
});
