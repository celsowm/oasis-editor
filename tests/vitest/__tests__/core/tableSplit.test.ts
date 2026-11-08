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
  canSplitActiveTableAtRow,
  splitActiveTableAtRow,
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

function threeRowTable(): {
  state: EditorState;
  middle: ReturnType<typeof createEditorParagraph>;
  first: ReturnType<typeof createEditorParagraph>;
  last: ReturnType<typeof createEditorParagraph>;
} {
  const first = createEditorParagraph("row1");
  const middle = createEditorParagraph("row2");
  const last = createEditorParagraph("row3");
  const table = createEditorTable(
    [first, middle, last].map((p) =>
      createEditorTableRow([createEditorTableCell([p])]),
    ),
    [120],
  );
  const state = placeCaretIn(
    createEditorStateFromDocument(createEditorDocument([table])),
    middle.id,
  );
  return { state, middle, first, last };
}

describe("Split Table", () => {
  it("splits the table at the caret row into two tables", () => {
    const { state } = threeRowTable();
    expect(canSplitActiveTableAtRow(state)).toBe(true);

    const next = splitActiveTableAtRow(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    // upper(1 row) + separator + lower(2 rows)
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toHaveProperty("type", "table");
    expect(blocks[1]).toHaveProperty("type", "paragraph");
    expect(blocks[2]).toHaveProperty("type", "table");

    const upper = blocks[0] as EditorTableNode;
    const lower = blocks[2] as EditorTableNode;
    expect(upper.rows).toHaveLength(1);
    expect(lower.rows).toHaveLength(2);
    expect(
      text(upper.rows[0]!.cells[0]!.blocks[0] as EditorParagraphNode),
    ).toBe("row1");
    expect(
      text(lower.rows[0]!.cells[0]!.blocks[0] as EditorParagraphNode),
    ).toBe("row2");
    expect(
      text(lower.rows[1]!.cells[0]!.blocks[0] as EditorParagraphNode),
    ).toBe("row3");
  });

  it("places the caret in the first cell of the second table", () => {
    const { state } = threeRowTable();
    const next = splitActiveTableAtRow(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    const lower = blocks[2] as EditorTableNode;
    const firstCell = lower.rows[0]!.cells[0]!.blocks[0] as EditorParagraphNode;
    expect(next.selection.focus.paragraphId).toBe(firstCell.id);
    expect(next.selection.focus.offset).toBe(0);
  });

  it("is a no-op when the caret is in the first row", () => {
    const first = createEditorParagraph("row1");
    const middle = createEditorParagraph("row2");
    const table = createEditorTable(
      [first, middle].map((p) =>
        createEditorTableRow([createEditorTableCell([p])]),
      ),
      [120],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      first.id,
    );
    expect(canSplitActiveTableAtRow(state)).toBe(false);
    expect(splitActiveTableAtRow(state)).toBe(state);
  });

  it("can split when the caret is in the last row (lower keeps that row)", () => {
    const first = createEditorParagraph("row1");
    const last = createEditorParagraph("row2");
    const table = createEditorTable(
      [first, last].map((p) =>
        createEditorTableRow([createEditorTableCell([p])]),
      ),
      [120],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      last.id,
    );
    expect(canSplitActiveTableAtRow(state)).toBe(true);

    const next = splitActiveTableAtRow(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    const upper = blocks[0] as EditorTableNode;
    const lower = blocks[2] as EditorTableNode;
    expect(upper.rows).toHaveLength(1);
    expect(lower.rows).toHaveLength(1);
    expect(
      text(lower.rows[0]!.cells[0]!.blocks[0] as EditorParagraphNode),
    ).toBe("row2");
  });

  it("is a no-op when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canSplitActiveTableAtRow(state)).toBe(false);
    expect(splitActiveTableAtRow(state)).toBe(state);
  });
});
