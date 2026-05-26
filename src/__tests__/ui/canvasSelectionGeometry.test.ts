import { describe, expect, it } from 'vitest';
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
  createEditorTableCell,
  createEditorTableRow,
  createEditorTable,
} from '../../core/editorState.js';
import { getParagraphs, paragraphOffsetToPosition, type EditorParagraphNode } from '../../core/model.js';
import { computeCanvasSelectionGeometry } from '../../ui/canvas/CanvasSelectionGeometry.js';
import type { CanvasLayoutSnapshot, CanvasSnapshotParagraph } from '../../ui/canvas/CanvasLayoutSnapshot.js';

function createMockSnapshot(paragraph: EditorParagraphNode, textLength: number, paragraphIndex: number): CanvasLayoutSnapshot {
  const left = 120;
  const top = 200;
  const slotStep = 12;
  const slots = Array.from({ length: textLength + 1 }, (_, offset) => ({
    offset,
    left: left + offset * slotStep,
    top,
    height: 20,
  }));

  const snapshotParagraph = {
    paragraph,
    paragraphId: paragraph.id,
    paragraphIndex,
    zone: 'main' as const,
    pageIndex: 0,
    startOffset: 0,
    endOffset: textLength,
    textLength,
    left,
    top,
    width: 400,
    height: 20,
    lines: [
      {
        startOffset: 0,
        endOffset: textLength,
        top,
        height: 20,
        slots,
      },
    ],
  };

  return {
    surfaceRect: { left: 0, top: 0, width: 900, height: 700 } as DOMRect,
    pages: [],
    paragraphs: [
      snapshotParagraph,
    ],
    paragraphsById: new Map([[snapshotParagraph.paragraphId, [snapshotParagraph]]]),
    inlineImages: [],
    unsupportedRegions: [],
  } as unknown as CanvasLayoutSnapshot;
}

describe('canvas selection geometry', () => {
  it('extends first-line selection and caret over spacingBefore like Word', () => {
    const sourceParagraph = createEditorParagraph('Capítulo 1');
    const state = createEditorStateFromDocument(createEditorDocument([sourceParagraph]));
    const paragraph = getParagraphs(state)[0]!;
    const paragraphTop = 200;
    const lineTop = 232;
    const slots = Array.from({ length: 10 + 1 }, (_, offset) => ({
      offset,
      left: 120 + offset * 10,
      top: lineTop,
      height: 20,
    }));
    const snapshotParagraph: CanvasSnapshotParagraph = {
      paragraph,
      paragraphId: paragraph.id,
      paragraphIndex: 0,
      zone: 'main',
      pageIndex: 0,
      startOffset: 0,
      endOffset: 10,
      textLength: 10,
      left: 120,
      top: paragraphTop,
      width: 400,
      height: 52,
      lines: [
        {
          startOffset: 0,
          endOffset: 10,
          top: lineTop,
          height: 20,
          slots,
        },
      ],
    };
    const snapshot: CanvasLayoutSnapshot = {
      surfaceRect: { left: 0, top: 0, width: 900, height: 700 } as DOMRect,
      pages: [],
      paragraphs: [snapshotParagraph],
      paragraphsById: new Map([[paragraph.id, [snapshotParagraph]]]),
      inlineImages: [],
      unsupportedRegions: [],
    } as unknown as CanvasLayoutSnapshot;

    const selectedGeometry = computeCanvasSelectionGeometry(snapshot, {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 0),
        focus: paragraphOffsetToPosition(paragraph, 10),
      },
    });
    const collapsedGeometry = computeCanvasSelectionGeometry(snapshot, {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 0),
        focus: paragraphOffsetToPosition(paragraph, 0),
      },
    });

    expect(selectedGeometry.selectionBoxes[0]).toMatchObject({
      top: paragraphTop,
      height: 52,
    });
    expect(collapsedGeometry.caretBox).toMatchObject({
      top: paragraphTop,
      height: 52,
    });
  });

  it('renders selection boxes using local paragraph order even when snapshot paragraphIndex is globally shifted', () => {
    const sourceParagraph = createEditorParagraph('abcdef');
    const state = createEditorStateFromDocument(createEditorDocument([sourceParagraph]));
    const paragraph = getParagraphs(state)[0]!;
    const anchor = paragraphOffsetToPosition(paragraph, 1);
    const focus = paragraphOffsetToPosition(paragraph, 4);
    const selectedState = {
      ...state,
      selection: {
        anchor,
        focus,
      },
    };

    const snapshot = createMockSnapshot(paragraph, 6, 37);
    const geometry = computeCanvasSelectionGeometry(snapshot, selectedState);

    expect(geometry.selectionBoxes.length).toBeGreaterThan(0);
    expect(geometry.selectionBoxes[0]).toMatchObject({
      left: 133,
      width: 36,
    });
  });

  it("does not paint leading whitespace at a visual selection edge", () => {
    const sourceParagraph = createEditorParagraph("aaaa bbbb");
    const state = createEditorStateFromDocument(createEditorDocument([sourceParagraph]));
    const paragraph = getParagraphs(state)[0]!;
    const selectedState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 4),
        focus: paragraphOffsetToPosition(paragraph, 9),
      },
    };

    const snapshot = createMockSnapshot(paragraph, 9, 0);
    const geometry = computeCanvasSelectionGeometry(snapshot, selectedState);

    expect(geometry.selectionBoxes[0]).toMatchObject({
      left: 181,
      width: 48,
    });
  });

  it('correctly calculates geometry and hides caret when multi-cell table selection is active', () => {
    const pCell1 = createEditorParagraph('cell1');
    const pCell2 = createEditorParagraph('cell2');

    const cell1 = createEditorTableCell([pCell1]);
    const cell2 = createEditorTableCell([pCell2]);

    const row = createEditorTableRow([cell1, cell2]);
    const table = createEditorTable([row]);

    const state = createEditorStateFromDocument(createEditorDocument([table]));
    const anchor = paragraphOffsetToPosition(pCell1, 0);
    const focus = paragraphOffsetToPosition(pCell2, 0);

    const selectedState = {
      ...state,
      selection: {
        anchor,
        focus,
      },
    };

    // Mock a snapshot with paragraphs inside table cells
    const surfaceRect = { left: 0, top: 0, width: 1000, height: 800 } as DOMRect;
    const snapP1: CanvasSnapshotParagraph = {
      paragraph: pCell1,
      paragraphId: pCell1.id,
      paragraphIndex: 0,
      zone: 'main',
      pageIndex: 0,
      startOffset: 0,
      endOffset: 5,
      textLength: 5,
      left: 100,
      top: 100,
      width: 150,
      height: 40,
      lines: [],
      tableCell: {
        tableId: table.id,
        rowIndex: 0,
        cellIndex: 0,
        left: 90,
        top: 90,
        width: 170,
        height: 60,
        anchorPosition: anchor,
      },
    };

    const snapP2: CanvasSnapshotParagraph = {
      paragraph: pCell2,
      paragraphId: pCell2.id,
      paragraphIndex: 1,
      zone: 'main',
      pageIndex: 0,
      startOffset: 0,
      endOffset: 5,
      textLength: 5,
      left: 300,
      top: 100,
      width: 150,
      height: 40,
      lines: [],
      tableCell: {
        tableId: table.id,
        rowIndex: 0,
        cellIndex: 1,
        left: 290,
        top: 90,
        width: 170,
        height: 60,
        anchorPosition: focus,
      },
    };

    const snapshot: CanvasLayoutSnapshot = {
      surfaceRect,
      pages: [],
      paragraphs: [snapP1, snapP2],
      paragraphsById: new Map([
        [pCell1.id, [snapP1]],
        [pCell2.id, [snapP2]],
      ]),
      inlineImages: [],
      unsupportedRegions: [],
    } as unknown as CanvasLayoutSnapshot;

    const geometry = computeCanvasSelectionGeometry(snapshot, selectedState);

    // Verify selection boxes match cell boundaries
    expect(geometry.selectionBoxes.length).toBe(2);
    expect(geometry.selectionBoxes[0]).toEqual({
      left: 90,
      top: 90,
      width: 170,
      height: 60,
    });
    expect(geometry.selectionBoxes[1]).toEqual({
      left: 290,
      top: 90,
      width: 170,
      height: 60,
    });

    // Blinking cursor should be hidden during multi-cell selection
    expect(geometry.caretBox.visible).toBe(false);
  });

  it("hides text highlight and exposes selectedImageBox when selection is a single inline image", () => {
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        image: {
          src: "data:image/png;base64,abc",
          width: 140,
          height: 80,
        },
      },
    ]);
    const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
    const imageParagraph = getParagraphs(state)[0]!;
    const selectedState = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(imageParagraph, 0),
        focus: paragraphOffsetToPosition(imageParagraph, 1),
      },
    };
    const snapshot: CanvasLayoutSnapshot = {
      surfaceRect: { left: 0, top: 0, width: 900, height: 700 } as DOMRect,
      pages: [],
      paragraphs: [
        {
          paragraph: imageParagraph,
          paragraphId: imageParagraph.id,
          paragraphIndex: 0,
          zone: "main",
          pageIndex: 0,
          startOffset: 0,
          endOffset: 1,
          textLength: 1,
          left: 120,
          top: 200,
          width: 300,
          height: 100,
          lines: [
            {
              startOffset: 0,
              endOffset: 1,
              top: 200,
              height: 100,
              slots: [
                { offset: 0, left: 120, top: 200, height: 100 },
                { offset: 1, left: 260, top: 200, height: 100 },
              ],
            },
          ],
        },
      ],
      paragraphsById: new Map(),
      inlineImages: [
        {
          paragraphId: imageParagraph.id,
          paragraphIndex: 0,
          zone: "main",
          pageIndex: 0,
          startOffset: 0,
          endOffset: 1,
          left: 120,
          top: 220,
          width: 140,
          height: 80,
        },
      ],
      unsupportedRegions: [],
    } as unknown as CanvasLayoutSnapshot;
    snapshot.paragraphsById.set(imageParagraph.id, [snapshot.paragraphs[0]!]);

    const geometry = computeCanvasSelectionGeometry(snapshot, selectedState);

    expect(geometry.selectionBoxes).toEqual([]);
    expect(geometry.selectedImageBox).toEqual({
      paragraphId: imageParagraph.id,
      startOffset: 0,
      endOffset: 1,
      left: 120,
      top: 220,
      width: 140,
      height: 80,
    });
  });
});
