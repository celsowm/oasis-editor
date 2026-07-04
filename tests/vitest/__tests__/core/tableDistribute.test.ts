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
  distributeSelectedTableColumns,
  distributeSelectedTableRows,
} from "@/core/commands/table.js";
import { getDocumentSectionsCanonical } from "@/core/model.js";
import type { EditorState, EditorTableNode } from "@/core/model.js";

function readTable(document: EditorState["document"]): EditorTableNode {
  const block = getDocumentSectionsCanonical(document)[0]!.blocks[0]!;
  if (block.type !== "table") throw new Error("expected a table block");
  return block;
}

describe("distribute table rows/columns", () => {
  it("equalizes column widths while preserving total width", () => {
    const table = createEditorTable(
      [
        createEditorTableRow([
          createEditorTableCell([createEditorParagraph("A")]),
          createEditorTableCell([createEditorParagraph("B")]),
        ]),
      ],
      [90, 210],
    );
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const next = distributeSelectedTableColumns(state);
    const result = readTable(next.document);
    expect(result.gridCols).toEqual([150, 150]);
    expect(result.style?.width).toBe(300);
    expect(result.rows[0]!.cells[0]!.style?.width).toBe(150);
    expect(result.rows[0]!.cells[1]!.style?.width).toBe(150);
  });

  it("equalizes row heights to the tallest explicit height (atLeast)", () => {
    const row0 = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("tall")]),
    ]);
    row0.style = { height: 40 };
    const row1 = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("short")]),
    ]);
    const table = createEditorTable([row0, row1], [120]);
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const next = distributeSelectedTableRows(state);
    const result = readTable(next.document);
    expect(result.rows.map((r) => r.style?.height)).toEqual([40, 40]);
    expect(result.rows.every((r) => r.style?.heightRule === "atLeast")).toBe(
      true,
    );
  });

  it("falls back to a default height when no row has an explicit height", () => {
    const table = createEditorTable(
      [
        createEditorTableRow([
          createEditorTableCell([createEditorParagraph("a")]),
        ]),
        createEditorTableRow([
          createEditorTableCell([createEditorParagraph("b")]),
        ]),
      ],
      [120],
    );
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const next = distributeSelectedTableRows(state);
    const result = readTable(next.document);
    expect(result.rows.map((r) => r.style?.height)).toEqual([24, 24]);
  });
});
