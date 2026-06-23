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
  buildCanvasTableLayout,
  resolveCanvasTableWidth,
} from "@/ui/canvas/CanvasTableLayout.js";

function lineWidth(line: { slots: Array<{ left: number }> }): number {
  const first = line.slots[0]?.left ?? 0;
  const last = line.slots[line.slots.length - 1]?.left ?? first;
  return last - first;
}

describe("buildCanvasTableLayout", () => {
  it("wraps text inside a narrowed final column instead of letting it overflow", () => {
    const row = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("Linha 1 Col 1")]),
      createEditorTableCell([createEditorParagraph("Linha 1 Col 2")]),
      createEditorTableCell([createEditorParagraph("Linha 1 Col 3")]),
      createEditorTableCell([createEditorParagraph("Linha 1 Col 4")]),
    ]);
    const table = createEditorTable([row], [120, 120, 120, 60]);
    table.style = { width: 420 };
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const layout = buildCanvasTableLayout({
      table,
      state,
      pageIndex: 0,
      originX: 0,
      originY: 0,
      contentWidth: 624,
      estimatedHeight: 20,
    });

    const finalCell = layout.cells.find((cell) => cell.cellIndex === 3);
    expect(finalCell).toBeDefined();
    const paragraph = finalCell!.paragraphs[0];
    expect(paragraph).toBeDefined();
    expect(paragraph!.lines.length).toBeGreaterThan(1);
    for (const line of paragraph!.lines) {
      expect(lineWidth(line)).toBeLessThanOrEqual(
        finalCell!.contentWidth + 0.01,
      );
    }
  });

  it("applies table left indent to the rendered table geometry", () => {
    const row = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("Linha 1 Col 1")]),
      createEditorTableCell([createEditorParagraph("Linha 1 Col 2")]),
    ]);
    const table = createEditorTable([row], [80, 80]);
    table.style = { width: 160, indentLeft: 24 };
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const layout = buildCanvasTableLayout({
      table,
      state,
      pageIndex: 0,
      originX: 100,
      originY: 0,
      contentWidth: 624,
      estimatedHeight: 20,
    });

    expect(layout.left).toBeCloseTo(132, 6);
    expect(layout.cells[0]!.left).toBeCloseTo(132, 6);
    expect(layout.cells[1]!.left).toBeCloseTo(238.67, 1);
  });

  it("centers and right-aligns a narrower table within the content width", () => {
    const makeTable = (align: "center" | "right") => {
      const row = createEditorTableRow([
        createEditorTableCell([createEditorParagraph("A")]),
        createEditorTableCell([createEditorParagraph("B")]),
      ]);
      const table = createEditorTable([row], [80, 80]);
      table.style = { width: 160, align };
      return table;
    };

    const contentWidth = 624;
    const tableWidth = resolveCanvasTableWidth(makeTable("center"), contentWidth);

    const centered = makeTable("center");
    const centeredLayout = buildCanvasTableLayout({
      table: centered,
      state: createEditorStateFromDocument(createEditorDocument([centered])),
      pageIndex: 0,
      originX: 100,
      originY: 0,
      contentWidth,
      estimatedHeight: 20,
    });
    expect(centeredLayout.left).toBeCloseTo(
      100 + (contentWidth - tableWidth) / 2,
      6,
    );

    const right = makeTable("right");
    const rightLayout = buildCanvasTableLayout({
      table: right,
      state: createEditorStateFromDocument(createEditorDocument([right])),
      pageIndex: 0,
      originX: 100,
      originY: 0,
      contentWidth,
      estimatedHeight: 20,
    });
    expect(rightLayout.left).toBeCloseTo(100 + (contentWidth - tableWidth), 6);
  });

  it("does not shift a full-width table even when aligned center", () => {
    const row = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("A")]),
    ]);
    const table = createEditorTable([row], [624]);
    table.style = { align: "center" };
    const layout = buildCanvasTableLayout({
      table,
      state: createEditorStateFromDocument(createEditorDocument([table])),
      pageIndex: 0,
      originX: 100,
      originY: 0,
      contentWidth: 624,
      estimatedHeight: 20,
    });
    expect(layout.left).toBeCloseTo(100, 6);
  });

  it("reserves trailing grid columns for rows with w:gridAfter", () => {
    const fullRow = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("A")]),
      createEditorTableCell([createEditorParagraph("B")]),
      createEditorTableCell([createEditorParagraph("C")]),
    ]);
    const shortRow = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("X")]),
      createEditorTableCell([createEditorParagraph("Y")]),
    ]);
    shortRow.style = { gridAfter: 1 };
    const table = createEditorTable([fullRow, shortRow], [100, 100, 100]);
    table.style = { width: 300, layout: "fixed" };
    const layout = buildCanvasTableLayout({
      table,
      state: createEditorStateFromDocument(createEditorDocument([table])),
      pageIndex: 0,
      originX: 0,
      originY: 0,
      contentWidth: 624,
      estimatedHeight: 20,
    });

    const fullCells = layout.cells.filter((c) => c.rowIndex === 0);
    const shortCells = layout.cells.filter((c) => c.rowIndex === 1);

    // The short row emits only its two cells, occupying the first two grid
    // columns; the trailing column is left empty (no third cell) but the full
    // row keeps the grid's three columns at their scaled widths.
    expect(fullCells).toHaveLength(3);
    expect(shortCells).toHaveLength(2);
    expect(shortCells[0]!.left).toBeCloseTo(fullCells[0]!.left, 6);
    expect(shortCells[0]!.width).toBeCloseTo(fullCells[0]!.width, 6);
    expect(shortCells[1]!.left).toBeCloseTo(fullCells[1]!.left, 6);
  });

  it("inserts w:tblCellSpacing gaps between cells and at the table edges", () => {
    const POINT_TO_PX = 96 / 72;
    const spacingPt = 6;
    const spacingPx = spacingPt * POINT_TO_PX; // 8px
    const row = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("A")]),
      createEditorTableCell([createEditorParagraph("B")]),
    ]);
    const table = createEditorTable([row], [100, 100]);
    table.style = { cellSpacing: spacingPt };
    const layout = buildCanvasTableLayout({
      table,
      state: createEditorStateFromDocument(createEditorDocument([table])),
      pageIndex: 0,
      originX: 0,
      originY: 0,
      contentWidth: 300,
      estimatedHeight: 20,
    });

    const [a, b] = [layout.cells[0]!, layout.cells[1]!];
    // Leading gap before the first cell, and a gap before the second cell.
    expect(a.left).toBeCloseTo(spacingPx, 4);
    expect(a.top).toBeCloseTo(spacingPx, 4);
    expect(b.left).toBeCloseTo(a.left + a.width + spacingPx, 4);
    // Columns + the three horizontal gaps fill the table width exactly.
    expect(a.width + b.width + 3 * spacingPx).toBeCloseTo(300, 3);
    // Total height carries the leading + trailing vertical gaps.
    expect(layout.height).toBeCloseTo(
      layout.rowHeights[0]! + 2 * spacingPx,
      4,
    );
  });

  it("keeps the gap-free layout when w:tblCellSpacing is absent", () => {
    const row = createEditorTableRow([
      createEditorTableCell([createEditorParagraph("A")]),
      createEditorTableCell([createEditorParagraph("B")]),
    ]);
    const table = createEditorTable([row], [100, 100]);
    const layout = buildCanvasTableLayout({
      table,
      state: createEditorStateFromDocument(createEditorDocument([table])),
      pageIndex: 0,
      originX: 0,
      originY: 0,
      contentWidth: 300,
      estimatedHeight: 20,
    });
    expect(layout.cells[0]!.left).toBeCloseTo(0, 4);
    expect(layout.cells[1]!.left).toBeCloseTo(layout.cells[0]!.width, 4);
    expect(layout.cells[0]!.width + layout.cells[1]!.width).toBeCloseTo(300, 3);
  });

  it("positions cell paragraphs using vertical alignment within explicit row height", () => {
    const topCell = createEditorTableCell([createEditorParagraph("Top")]);
    topCell.style = { verticalAlign: "top" };
    const middleCell = createEditorTableCell([createEditorParagraph("Middle")]);
    middleCell.style = { verticalAlign: "middle" };
    const bottomCell = createEditorTableCell([createEditorParagraph("Bottom")]);
    bottomCell.style = { verticalAlign: "bottom" };
    const row = createEditorTableRow([topCell, middleCell, bottomCell]);
    row.style = { height: 90 };
    const table = createEditorTable([row], [80, 80, 80]);
    table.style = { width: 240 };
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const layout = buildCanvasTableLayout({
      table,
      state,
      pageIndex: 0,
      originX: 0,
      originY: 0,
      contentWidth: 624,
      estimatedHeight: 20,
    });

    const renderedTopCell = layout.cells[0]!;
    const renderedMiddleCell = layout.cells[1]!;
    const renderedBottomCell = layout.cells[2]!;
    const topParagraph = renderedTopCell.paragraphs[0]!;
    const middleParagraph = renderedMiddleCell.paragraphs[0]!;
    const bottomParagraph = renderedBottomCell.paragraphs[0]!;

    expect(topParagraph.originY).toBeCloseTo(renderedTopCell.contentTop, 6);
    expect(middleParagraph.originY).toBeCloseTo(
      renderedMiddleCell.contentTop +
        (renderedMiddleCell.contentHeight - middleParagraph.height) / 2,
      6,
    );
    expect(bottomParagraph.originY).toBeCloseTo(
      renderedBottomCell.contentTop +
        renderedBottomCell.contentHeight -
        bottomParagraph.height,
      6,
    );
  });

  it("includes paragraph spacing when measuring and positioning table cell text", () => {
    const paragraph = createEditorParagraph("Com espaco");
    paragraph.style = { spacingBefore: 12, spacingAfter: 8, lineHeight: 1 };
    const cell = createEditorTableCell([paragraph]);
    const table = createEditorTable([createEditorTableRow([cell])], [180]);
    table.style = { width: 180 };
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const layout = buildCanvasTableLayout({
      table,
      state,
      pageIndex: 0,
      originX: 0,
      originY: 0,
      contentWidth: 624,
      estimatedHeight: 1,
    });

    const renderedCell = layout.cells[0]!;
    const renderedParagraph = renderedCell.paragraphs[0]!;
    const linesBottom = Math.max(
      ...renderedParagraph.lines.map((line) => line.top + line.height),
    );

    expect(renderedParagraph.originY).toBeCloseTo(
      renderedCell.contentTop + 12,
      6,
    );
    expect(renderedParagraph.height).toBeCloseTo(12 + linesBottom + 8, 6);
    expect(layout.height).toBeGreaterThan(linesBottom);
  });

  it("collapses adjacent paragraph spacing inside table cells", () => {
    const first = createEditorParagraph("Primeiro paragrafo");
    first.style = { spacingBefore: 0, spacingAfter: 16, lineHeight: 1 };
    const second = createEditorParagraph("Segundo paragrafo");
    second.style = { spacingBefore: 16, spacingAfter: 0, lineHeight: 1 };
    const cell = createEditorTableCell([first, second]);
    const table = createEditorTable([createEditorTableRow([cell])], [240]);
    table.style = { width: 240 };
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const layout = buildCanvasTableLayout({
      table,
      state,
      pageIndex: 0,
      originX: 0,
      originY: 0,
      contentWidth: 624,
      estimatedHeight: 1,
    });

    const renderedCell = layout.cells[0]!;
    const firstParagraph = renderedCell.paragraphs[0]!;
    const secondParagraph = renderedCell.paragraphs[1]!;
    const firstLinesBottom = Math.max(
      ...firstParagraph.lines.map((line) => line.top + line.height),
    );
    const secondLinesBottom = Math.max(
      ...secondParagraph.lines.map((line) => line.top + line.height),
    );

    expect(
      secondParagraph.originY - (firstParagraph.originY + firstLinesBottom),
    ).toBeCloseTo(16, 6);
    expect(renderedCell.contentHeight).toBeCloseTo(
      firstLinesBottom + 16 + secondLinesBottom,
      6,
    );
  });

  it("carries diagonal borders and resolves logical edges for RTL tables", () => {
    const cell = createEditorTableCell([createEditorParagraph("RTL")]);
    cell.style = {
      borderStart: { width: 2, type: "solid", color: "#ff0000" },
      borderEnd: { width: 3, type: "dashed", color: "#00ff00" },
      borderTopLeftToBottomRight: {
        width: 1,
        type: "dotted",
        color: "#0000ff",
      },
      borderTopRightToBottomLeft: {
        width: 1.5,
        type: "solid",
        color: "#111111",
      },
    };
    const table = createEditorTable([createEditorTableRow([cell])], [120]);
    table.style = { width: 120, bidiVisual: true };
    const state = createEditorStateFromDocument(createEditorDocument([table]));
    const rendered = buildCanvasTableLayout({
      table,
      state,
      pageIndex: 0,
      originX: 0,
      originY: 0,
      contentWidth: 624,
      estimatedHeight: 20,
    }).cells[0]!;

    expect(rendered.borders.right.color).toBe("#ff0000");
    expect(rendered.borders.left.color).toBe("#00ff00");
    expect(rendered.borders.topLeftToBottomRight?.color).toBe("#0000ff");
    expect(rendered.borders.topRightToBottomLeft?.color).toBe("#111111");
  });

  it("scales w:tcFitText cell text so all runs carry a characterScale", () => {
    const cell = createEditorTableCell([
      createEditorParagraph("Hello World"),
    ]);
    cell.style = { fitText: true };
    const table = createEditorTable(
      [createEditorTableRow([cell])],
      [200],
    );
    table.style = { width: 200 };
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const layout = buildCanvasTableLayout({
      table,
      state,
      pageIndex: 0,
      originX: 0,
      originY: 0,
      contentWidth: 624,
      estimatedHeight: 20,
    });

    const renderedCell = layout.cells[0]!;
    const para = renderedCell.paragraphs[0]!;
    // Every run must carry a characterScale so the measurement/paint layers
    // know to compress or expand the glyphs to fill the cell width.
    for (const run of para.paragraph.runs) {
      expect(typeof run.styles?.characterScale).toBe("number");
      expect(run.styles!.characterScale).toBeGreaterThan(0);
    }
    // The projected lines should still fit within the content width.
    for (const line of para.lines) {
      expect(lineWidth(line)).toBeLessThanOrEqual(renderedCell.contentWidth + 1);
    }
  });
});
