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
  buildTableFromParagraphs,
  canConvertActiveTextToTable,
  convertActiveTextToTable,
} from "@/core/commands/table.js";
import {
  getDocumentSectionsCanonical,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableNode,
} from "@/core/model.js";

function selectBetween(
  state: EditorState,
  start: EditorParagraphNode,
  end: EditorParagraphNode,
  anchorRunId = "",
  focusRunId = "",
): EditorState {
  return {
    ...state,
    selection: {
      anchor: {
        paragraphId: start.id,
        runId: anchorRunId,
        offset: 0,
      },
      focus: {
        paragraphId: end.id,
        runId: focusRunId,
        offset: 0,
      },
    },
  };
}

function caretAt(state: EditorState, paragraph: EditorParagraphNode): EditorState {
  return selectBetween(state, paragraph, paragraph);
}

function text(paragraph: EditorParagraphNode): string {
  return paragraph.runs.map((run) => run.text).join("");
}

describe("Convert Text to Table", () => {
  it("splits one tab-separated paragraph into a single-row table", () => {
    const p = createEditorParagraph("a\tb\tc");
    const state = caretAt(
      createEditorStateFromDocument(createEditorDocument([p])),
      p,
    );
    expect(canConvertActiveTextToTable(state)).toBe(true);

    const next = convertActiveTextToTable(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    const table = blocks[0] as EditorTableNode;
    expect(table.type).toBe("table");
    expect(table.rows).toHaveLength(1);
    const cells = table.rows[0]!.cells;
    expect(cells).toHaveLength(3);
    cells.forEach((cell, index) => {
      const cellParagraph = cell.blocks[0] as EditorParagraphNode;
      expect(text(cellParagraph)).toBe(["a", "b", "c"][index]);
    });
  });

  it("turns each selected paragraph into a row", () => {
    const a = createEditorParagraph("a1\ta2");
    const b = createEditorParagraph("b1\tb2");
    const state = selectBetween(
      createEditorStateFromDocument(createEditorDocument([a, b])),
      a,
      b,
    );

    const next = convertActiveTextToTable(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    const table = blocks[0] as EditorTableNode;
    expect(table.type).toBe("table");
    expect(table.rows).toHaveLength(2);
    expect(text(table.rows[0]!.cells[0]!.blocks[0] as EditorParagraphNode)).toBe(
      "a1",
    );
    expect(text(table.rows[1]!.cells[1]!.blocks[0] as EditorParagraphNode)).toBe(
      "b2",
    );
  });

  it("pads short rows with empty cells to keep the grid rectangular", () => {
    const a = createEditorParagraph("x\ty");
    const b = createEditorParagraph("only");
    const state = selectBetween(
      createEditorStateFromDocument(createEditorDocument([a, b])),
      a,
      b,
    );

    const next = convertActiveTextToTable(state);
    const table = getDocumentSectionsCanonical(next.document)[0]!.blocks[0] as
      EditorTableNode;
    expect(table.rows[1]!.cells).toHaveLength(2);
    expect(text(table.rows[1]!.cells[1]!.blocks[0] as EditorParagraphNode)).toBe(
      "",
    );
  });

  it("places the caret in the first cell after conversion", () => {
    const p = createEditorParagraph("a\tb");
    const state = caretAt(
      createEditorStateFromDocument(createEditorDocument([p])),
      p,
    );

    const next = convertActiveTextToTable(state);
    const table = getDocumentSectionsCanonical(next.document)[0]!.blocks[0] as
      EditorTableNode;
    const firstCell = table.rows[0]!.cells[0]!.blocks[0] as EditorParagraphNode;
    expect(next.selection.focus.paragraphId).toBe(firstCell.id);
    expect(next.selection.focus.offset).toBe(0);
  });

  it("is a no-op when the caret is inside a table", () => {
    const cellParagraph = createEditorParagraph("a\tb");
    const table = createEditorTable(
      [createEditorTableRow([createEditorTableCell([cellParagraph])])],
      [120],
    );
    const state = caretAt(
      createEditorStateFromDocument(createEditorDocument([table])),
      cellParagraph,
    );
    expect(canConvertActiveTextToTable(state)).toBe(false);
    expect(convertActiveTextToTable(state)).toBe(state);
  });

  it("leaves unrelated paragraphs untouched during a splice", () => {
    const before = createEditorParagraph("before\tkeep");
    const a = createEditorParagraph("a\tb");
    const after = createEditorParagraph("after");
    const state = selectBetween(
      createEditorStateFromDocument(createEditorDocument([before, a, after])),
      a,
      a,
    );

    const next = convertActiveTextToTable(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(3); // before, table, after
    expect(text(blocks[0] as EditorParagraphNode)).toBe("before\tkeep");
    expect((blocks[1] as EditorTableNode).type).toBe("table");
    expect(text(blocks[2] as EditorParagraphNode)).toBe("after");
  });

  it("buildTableFromParagraphs yields a rectangular table directly", () => {
    const table = buildTableFromParagraphs([
      createEditorParagraph("r1c1\tr1c2"),
      createEditorParagraph("r2c1"),
    ]);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]!.cells).toHaveLength(2);
    expect(table.rows[1]!.cells).toHaveLength(2);
  });
});
