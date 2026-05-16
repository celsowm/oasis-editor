import { describe, expect, it } from 'vitest';
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from '../../core/editorState.js';
import { getParagraphs, paragraphOffsetToPosition, type EditorParagraphNode } from '../../core/model.js';
import { computeCanvasSelectionGeometry } from '../../ui/canvas/CanvasSelectionGeometry.js';
import type { CanvasLayoutSnapshot } from '../../ui/canvas/CanvasLayoutSnapshot.js';

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
    unsupportedRegions: [],
  } as unknown as CanvasLayoutSnapshot;
}

describe('CanvasSelectionGeometry', () => {
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
    expect(geometry.selectionBoxes[0]!.width).toBeGreaterThan(0);
  });
});
