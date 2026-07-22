import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { setActiveTableStyleValue } from "@/core/commands/table.js";
import { getDocumentSectionsCanonical } from "@/core/model.js";
import type { EditorState, EditorTableNode } from "@/core/model.js";
import { buildEssentialsTable } from "@/ui/app/essentials/table.js";

function makeTableState(): { table: EditorTableNode; state: EditorState } {
  const table = createEditorTable(
    [
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("A")]),
        createEditorTableCell([createEditorParagraph("B")]),
      ]),
    ],
    [120, 120],
  );
  return {
    table,
    state: createEditorStateFromDocument(createEditorDocument([table])),
  };
}

function readTable(
  document: ReturnType<typeof makeTableState>["state"]["document"],
): EditorTableNode {
  const block = getDocumentSectionsCanonical(document)[0]!.blocks[0]!;
  if (block.type !== "table") throw new Error("expected a table block");
  return block;
}

describe("table style options (tblLook / styleId / layout)", () => {
  it("persists a tblLook conditional-formatting object", () => {
    const { table, state } = makeTableState();
    const tblLook = {
      firstRow: true,
      lastRow: false,
      firstCol: false,
      lastCol: false,
      noHBand: false,
      noVBand: true,
    };
    const next = setActiveTableStyleValue(state, table.id, "tblLook", tblLook);
    expect(readTable(next.document).style?.tblLook).toEqual(tblLook);
  });

  it("flips a single tblLook flag while preserving the rest", () => {
    const { table, state } = makeTableState();
    const base = {
      firstRow: true,
      lastRow: false,
      firstCol: false,
      lastCol: false,
      noHBand: false,
      noVBand: false,
    };
    const withBase = setActiveTableStyleValue(state, table.id, "tblLook", base);
    const current = readTable(withBase.document).style!.tblLook!;
    // Toggle "banded columns" off (noVBand true) — mirrors toggleTblLook.
    const flipped = setActiveTableStyleValue(withBase, table.id, "tblLook", {
      ...current,
      noVBand: !current.noVBand,
    });
    const result = readTable(flipped.document).style!.tblLook!;
    expect(result.noVBand).toBe(true);
    expect(result.firstRow).toBe(true);
  });

  it("applies a named table style id", () => {
    const { table, state } = makeTableState();
    const next = setActiveTableStyleValue(
      state,
      table.id,
      "styleId",
      "GridTable4",
    );
    expect(readTable(next.document).style?.styleId).toBe("GridTable4");
  });

  it("reports the effective look inherited from a named table style", () => {
    const { table, state } = makeTableState();
    const styled = setActiveTableStyleValue(
      state,
      table.id,
      "styleId",
      "LightShading-Accent1",
    );
    const capability = buildEssentialsTable({
      state: () => styled,
    } as never);

    expect(capability.getTblLook()).toEqual({
      firstRow: true,
      lastRow: false,
      firstCol: false,
      lastCol: false,
      bandedRows: true,
      bandedCols: false,
    });
  });

  it("switches the table sizing layout", () => {
    const { table, state } = makeTableState();
    const next = setActiveTableStyleValue(state, table.id, "layout", "autofit");
    expect(readTable(next.document).style?.layout).toBe("autofit");
  });
});
