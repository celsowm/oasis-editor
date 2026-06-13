import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "../../core/editorState.js";
import { buildCanvasTableLayout } from "../../ui/canvas/CanvasTableLayout.js";

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

    expect(secondParagraph.originY - (firstParagraph.originY + firstLinesBottom))
      .toBeCloseTo(16, 6);
    expect(renderedCell.contentHeight).toBeCloseTo(
      firstLinesBottom + 16 + secondLinesBottom,
      6,
    );
  });
});
