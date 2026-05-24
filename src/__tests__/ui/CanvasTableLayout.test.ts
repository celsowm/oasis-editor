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
      layoutMode: "wordParity",
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
      layoutMode: "wordParity",
      originX: 100,
      originY: 0,
      contentWidth: 624,
      estimatedHeight: 20,
    });

    expect(layout.left).toBeCloseTo(132, 6);
    expect(layout.cells[0]!.left).toBeCloseTo(132, 6);
    expect(layout.cells[1]!.left).toBeCloseTo(212, 6);
  });
});
