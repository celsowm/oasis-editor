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
  canSetActiveTableColumnWidth,
  setActiveTableColumnWidth,
} from "@/core/commands/table.js";
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

function twoColumnFixture(): {
  state: EditorState;
  paragraph: ReturnType<typeof createEditorParagraph>;
} {
  const paragraph = createEditorParagraph("a");
  const table = createEditorTable(
    [
      createEditorTableRow([
        createEditorTableCell([paragraph]),
        createEditorTableCell([createEditorParagraph("b")]),
      ]),
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("c")]),
        createEditorTableCell([createEditorParagraph("d")]),
      ]),
    ],
    [120, 160],
  );
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

describe("set active table column width (w:gridCol @w:w)", () => {
  it("applies a numeric width to the active column's grid and cells", () => {
    const { state, paragraph } = twoColumnFixture();
    const next = setActiveTableColumnWidth(caretIn(state, paragraph), 140);
    const table = firstTable(next);
    expect(table.gridCols?.[0]).toBe(140);
    // The active cell (col 0) width is set; the second column is untouched.
    expect(table.rows[0]!.cells[0]!.style?.width).toBe(140);
    expect(table.rows[0]!.cells[1]!.style?.width).toBeUndefined();
  });

  it("targets the visual column containing the caret", () => {
    const { state } = twoColumnFixture();
    const p2 = createEditorParagraph("b");
    const p1 = createEditorParagraph("a");
    const table = createEditorTable(
      [
        createEditorTableRow([
          createEditorTableCell([p1]),
          createEditorTableCell([p2]),
        ]),
      ],
      [120, 160],
    );
    const s = createEditorStateFromDocument(createEditorDocument([table]));
    const next = setActiveTableColumnWidth(caretIn(s, p2), 90);
    expect(firstTable(next).gridCols?.[1]).toBe(90);
    expect(firstTable(next).gridCols?.[0]).toBe(120);
  });

  it("treats a null payload as a no-op (column widths have no natural clear)", () => {
    const { state, paragraph } = twoColumnFixture();
    const sized = setActiveTableColumnWidth(caretIn(state, paragraph), 150);
    const next = setActiveTableColumnWidth(caretIn(sized, paragraph), null);
    expect(firstTable(next).gridCols?.[0]).toBe(150);
    expect(firstTable(next).rows[0]!.cells[0]!.style?.width).toBe(150);
  });

  it("reports applicability from a collapsed caret inside a table column", () => {
    const { state, paragraph } = twoColumnFixture();
    expect(canSetActiveTableColumnWidth(caretIn(state, paragraph))).toBe(true);
  });

  it("is not applicable when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canSetActiveTableColumnWidth(state)).toBe(false);
    const next = setActiveTableColumnWidth(state, 120);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveProperty("type", "paragraph");
  });
});
