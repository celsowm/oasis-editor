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
  canDeleteActiveTable,
  deleteActiveTable,
} from "@/core/commands/table.js";
import {
  getDocumentSectionsCanonical,
  type EditorParagraphNode,
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

function text(paragraph: EditorParagraphNode): string {
  return paragraph.runs.map((run) => run.text).join("");
}

function singleCellParagraphs(
  count: number,
): ReturnType<typeof createEditorParagraph>[] {
  return Array.from({ length: count }, () => createEditorParagraph("cell"));
}

describe("Delete Table", () => {
  it("removes the active table and keeps surrounding paragraphs", () => {
    const before = createEditorParagraph("before");
    const after = createEditorParagraph("after");
    const cell = singleCellParagraphs(1)[0]!;
    const table = createEditorTable(
      [createEditorTableRow([createEditorTableCell([cell])])],
      [120],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([before, table, after])),
      cell.id,
    );
    expect(canDeleteActiveTable(state)).toBe(true);

    const next = deleteActiveTable(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(2);
    expect(text(blocks[0] as EditorParagraphNode)).toBe("before");
    expect(text(blocks[1] as EditorParagraphNode)).toBe("after");
  });

  it("lands the caret in the paragraph that followed the table", () => {
    const before = createEditorParagraph("before");
    const after = createEditorParagraph("after");
    const cell = singleCellParagraphs(1)[0]!;
    const table = createEditorTable(
      [createEditorTableRow([createEditorTableCell([cell])])],
      [120],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([before, table, after])),
      cell.id,
    );

    const next = deleteActiveTable(state);
    expect(next.selection.focus.paragraphId).toBe(after.id);
    expect(next.selection.focus.offset).toBe(0);
  });

  it("falls back to the preceding paragraph when the table is last", () => {
    const before = createEditorParagraph("before");
    const cell = singleCellParagraphs(1)[0]!;
    const table = createEditorTable(
      [createEditorTableRow([createEditorTableCell([cell])])],
      [120],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([before, table])),
      cell.id,
    );

    const next = deleteActiveTable(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    expect(next.selection.focus.paragraphId).toBe(before.id);
  });

  it("replaces a lone table with a single empty paragraph", () => {
    const cell = singleCellParagraphs(1)[0]!;
    const table = createEditorTable(
      [createEditorTableRow([createEditorTableCell([cell])])],
      [120],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      cell.id,
    );

    const next = deleteActiveTable(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveProperty("type", "paragraph");
    expect(next.selection.focus.paragraphId).toBe(
      (blocks[0] as EditorParagraphNode).id,
    );
  });

  it("is a no-op when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canDeleteActiveTable(state)).toBe(false);
    expect(deleteActiveTable(state)).toBe(state);
  });

  it("removes only the innermost (nested) table", () => {
    const innerCell = singleCellParagraphs(1)[0]!;
    const inner = createEditorTable(
      [createEditorTableRow([createEditorTableCell([innerCell])])],
      [120],
    );
    const outerCell = createEditorTableCell([inner]);
    const outer = createEditorTable(
      [createEditorTableRow([outerCell])],
      [120],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([outer])),
      innerCell.id,
    );

    const next = deleteActiveTable(state);
    const table = getDocumentSectionsCanonical(next.document)[0]!.blocks[0] as
      EditorTableNode;
    expect(table.type).toBe("table");
    expect(table.rows[0]!.cells[0]!.blocks).toHaveLength(1);
    expect(table.rows[0]!.cells[0]!.blocks[0]).toHaveProperty(
      "type",
      "paragraph",
    );
  });
});
