import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { getDocumentSectionsCanonical } from "@/core/model.js";
import type { EditorTableNode } from "@/core/model.js";
import {
  applyTableCornerResize,
  computeCornerScales,
  type TableCornerResizeState,
} from "@/app/controllers/useEditorTableCornerResize.js";

function makeTable(): {
  table: EditorTableNode;
  state: ReturnType<typeof createEditorStateFromDocument>;
} {
  const table = createEditorTable(
    [
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("A")]),
        createEditorTableCell([createEditorParagraph("B")]),
      ]),
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("C")]),
        createEditorTableCell([createEditorParagraph("D")]),
      ]),
    ],
    [100, 100],
  );
  return {
    table,
    state: createEditorStateFromDocument(createEditorDocument([table])),
  };
}

function readTable(
  document: ReturnType<typeof makeTable>["state"]["document"],
): EditorTableNode {
  const block = getDocumentSectionsCanonical(document)[0]!.blocks[0]!;
  if (block.type !== "table") throw new Error("expected a table block");
  return block;
}

function resizeState(tableId: string): TableCornerResizeState {
  return {
    tableId,
    bounds: { left: 0, top: 0, width: 200, height: 80 },
    startClientX: 0,
    startClientY: 0,
    currentClientX: 0,
    currentClientY: 0,
    widthsPt: { 0: 100, 1: 100 },
    totalWidthPt: 200,
    rowHeightsPx: [40, 40],
  };
}

describe("table corner resize", () => {
  it("scales column widths and row heights proportionally", () => {
    const { table, state } = makeTable();
    // scaleX 1.5 → widths 150/150 (total 300); scaleY 2 → rows 80px → 60pt.
    const next = applyTableCornerResize(state, resizeState(table.id), 1.5, 2);
    const result = readTable(next.document);
    expect(result.gridCols).toEqual([150, 150]);
    expect(result.style?.width).toBe(300);
    expect(result.rows[0]!.cells[0]!.style?.width).toBe(150);
    expect(result.rows.map((r) => r.style?.height)).toEqual([60, 60]);
  });

  it("computes proportional scales from the drag delta", () => {
    const resize = resizeState("t");
    const scales = computeCornerScales({
      ...resize,
      currentClientX: 100, // +100 over width 200 → 1.5
      currentClientY: 80, // +80 over height 80 → 2.0
    });
    expect(scales.scaleX).toBeCloseTo(1.5, 5);
    expect(scales.scaleY).toBeCloseTo(2, 5);
  });

  it("floors the scale so columns never shrink below the minimum", () => {
    const resize = resizeState("t");
    // Dragging far left would give rawX = 10/200 = 0.05; min column 100pt
    // floors scaleX at 10/100 = 0.1.
    const scales = computeCornerScales({
      ...resize,
      currentClientX: -190,
      currentClientY: 0,
    });
    expect(scales.scaleX).toBeCloseTo(0.1, 5);
  });
});
