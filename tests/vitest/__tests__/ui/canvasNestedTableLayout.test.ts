import { describe, expect, it } from "vitest";
import type {
  EditorParagraphNode,
  EditorState,
  EditorTableNode,
} from "@/core/model.js";
import { buildCanvasTableLayout } from "@/ui/canvas/CanvasTableLayout.js";
import {
  findTableCellForParagraph,
  getTableParagraphEntries,
} from "@/ui/canvas/CanvasGeometry.js";

function paragraph(id: string, text: string): EditorParagraphNode {
  return {
    id,
    type: "paragraph",
    runs: [{ id: `${id}:run`, kind: "text", text }],
  };
}

function oneCellTable(
  id: string,
  blocks: EditorTableNode["rows"][number]["cells"][number]["blocks"],
  width: number,
): EditorTableNode {
  return {
    id,
    type: "table",
    gridCols: [width],
    style: { width, layout: "fixed" },
    rows: [
      {
        id: `${id}:row`,
        cells: [
          {
            id: `${id}:cell`,
            blocks,
            style: {
              width,
              paddingTop: 4,
              paddingRight: 4,
              paddingBottom: 4,
              paddingLeft: 4,
            },
          },
        ],
      },
    ],
  };
}

function editorState(firstParagraph: EditorParagraphNode): EditorState {
  return {
    document: {
      id: "document:nested-canvas",
      sections: [],
      styles: {},
    },
    selection: {
      anchor: {
        paragraphId: firstParagraph.id,
        runId: firstParagraph.runs[0]!.id,
        offset: 0,
      },
      focus: {
        paragraphId: firstParagraph.id,
        runId: firstParagraph.runs[0]!.id,
        offset: 0,
      },
    },
  } as EditorState;
}

describe("canvas nested table layout", () => {
  it("positions and indexes a nested table between surrounding paragraphs", () => {
    const before = paragraph("paragraph:before", "Before");
    const innerParagraph = paragraph("paragraph:inner", "Inner");
    const after = paragraph("paragraph:after", "After");
    const innerTable = oneCellTable("table:inner", [innerParagraph], 120);
    const outerTable = oneCellTable(
      "table:outer",
      [before, innerTable, after],
      320,
    );

    const layout = buildCanvasTableLayout({
      table: outerTable,
      state: editorState(before),
      pageIndex: 0,
      originX: 20,
      originY: 30,
      contentWidth: 400,
      estimatedHeight: 0,
    });

    expect(layout.unsupported).not.toContain("unsupported:nested-table");
    const outerCell = layout.cells[0]!;
    const nested = outerCell.nestedTables?.[0];
    expect(nested?.tableId).toBe(innerTable.id);
    expect(nested!.left).toBeGreaterThanOrEqual(outerCell.contentLeft);
    expect(nested!.top).toBeGreaterThan(
      outerCell.paragraphs.find(
        (entry) => entry.paragraph.id === before.id,
      )!.originY,
    );
    expect(
      outerCell.paragraphs.find(
        (entry) => entry.paragraph.id === after.id,
      )!.originY,
    ).toBeGreaterThanOrEqual(nested!.top + nested!.height);

    const entries = getTableParagraphEntries(layout);
    expect(entries.map((entry) => entry.paragraph.id)).toEqual(
      expect.arrayContaining([before.id, innerParagraph.id, after.id]),
    );
    expect(findTableCellForParagraph(layout, innerParagraph.id)?.tableId).toBe(
      innerTable.id,
    );
  });
});
