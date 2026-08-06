import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import { computeCanvasSelectionGeometry } from "@/ui/canvas/CanvasSelectionGeometry.js";
import type {
  CanvasLayoutSnapshot,
  CanvasSnapshotParagraph,
} from "@/ui/canvas/CanvasLayoutSnapshot.js";

function snapshotParagraph(options: {
  paragraph: ReturnType<typeof createEditorParagraph>;
  paragraphIndex: number;
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
}): CanvasSnapshotParagraph {
  const anchorPosition = paragraphOffsetToPosition(options.paragraph, 0);
  return {
    paragraph: options.paragraph,
    paragraphId: options.paragraph.id,
    paragraphIndex: options.paragraphIndex,
    zone: "main",
    pageIndex: 0,
    startOffset: 0,
    endOffset: options.paragraph.runs[0]?.text.length ?? 0,
    textLength: options.paragraph.runs[0]?.text.length ?? 0,
    left: options.left + 8,
    top: options.top + 8,
    width: Math.max(1, options.width - 16),
    height: Math.max(1, options.height - 16),
    lines: [],
    tableCell: {
      tableId: options.tableId,
      rowIndex: options.rowIndex,
      cellIndex: options.cellIndex,
      left: options.left,
      top: options.top,
      width: options.width,
      height: options.height,
      anchorPosition,
    },
  };
}

describe("nested canvas multi-cell selection", () => {
  it("highlights inner cells rather than the outer owner cell", () => {
    const before = createEditorParagraph("before");
    const innerLeft = createEditorParagraph("left");
    const innerRight = createEditorParagraph("right");
    const inner = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([innerLeft]),
        createEditorTableCell([innerRight]),
      ]),
    ]);
    const outer = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([before, inner]),
      ]),
    ]);
    const base = createEditorStateFromDocument(createEditorDocument([outer]));
    const state = {
      ...base,
      selection: {
        anchor: paragraphOffsetToPosition(innerLeft, 0),
        focus: paragraphOffsetToPosition(innerRight, 0),
      },
    };

    const outerSnapshot = snapshotParagraph({
      paragraph: before,
      paragraphIndex: 0,
      tableId: outer.id,
      rowIndex: 0,
      cellIndex: 0,
      left: 40,
      top: 40,
      width: 500,
      height: 180,
    });
    const leftSnapshot = snapshotParagraph({
      paragraph: innerLeft,
      paragraphIndex: 1,
      tableId: inner.id,
      rowIndex: 0,
      cellIndex: 0,
      left: 80,
      top: 100,
      width: 180,
      height: 70,
    });
    const rightSnapshot = snapshotParagraph({
      paragraph: innerRight,
      paragraphIndex: 2,
      tableId: inner.id,
      rowIndex: 0,
      cellIndex: 1,
      left: 260,
      top: 100,
      width: 180,
      height: 70,
    });
    const snapshot = {
      surfaceRect: { left: 0, top: 0, width: 900, height: 700 } as DOMRect,
      pages: [],
      paragraphs: [outerSnapshot, leftSnapshot, rightSnapshot],
      paragraphsById: new Map([
        [before.id, [outerSnapshot]],
        [innerLeft.id, [leftSnapshot]],
        [innerRight.id, [rightSnapshot]],
      ]),
      inlineImages: [],
      floatingImages: [],
      inlineTextBoxes: [],
      floatingTextBoxes: [],
      unsupportedRegions: [],
    } as unknown as CanvasLayoutSnapshot;

    const geometry = computeCanvasSelectionGeometry(snapshot, state);

    expect(geometry.selectionBoxes).toEqual([
      { left: 80, top: 100, width: 180, height: 70 },
      { left: 260, top: 100, width: 180, height: 70 },
    ]);
    expect(geometry.selectionBoxes).not.toContainEqual({
      left: 40,
      top: 40,
      width: 500,
      height: 180,
    });
    expect(geometry.caretBox.visible).toBe(false);
    expect(geometry.selectedTableBox?.tableId).toBe(inner.id);
  });
});
