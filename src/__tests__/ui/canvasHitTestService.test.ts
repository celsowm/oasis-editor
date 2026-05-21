import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "../../core/editorState.js";
import type { CanvasLayoutSnapshot } from "../../ui/canvas/CanvasLayoutSnapshot.js";
import { resolveCanvasSurfaceHitAtPoint } from "../../ui/canvas/CanvasHitTestService.js";

function createSnapshotWithInlineImage(): { snapshot: CanvasLayoutSnapshot; state: ReturnType<typeof createEditorStateFromDocument> } {
  const paragraph = createEditorParagraphFromRuns([
    {
      text: "\uFFFC",
      image: {
        src: "data:image/png;base64,abc",
        width: 120,
        height: 72,
      },
    },
    { text: "x" },
  ]);
  const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
  const snapshot: CanvasLayoutSnapshot = {
    surfaceRect: { left: 0, top: 0, width: 900, height: 700 } as DOMRect,
    pages: [
      {
        index: 0,
        left: 0,
        top: 0,
        width: 800,
        height: 1000,
        bodyTop: 90,
        bodyBottom: 910,
      },
    ],
    paragraphs: [
      {
        paragraph,
        paragraphId: paragraph.id,
        paragraphIndex: 0,
        zone: "main",
        pageIndex: 0,
        startOffset: 0,
        endOffset: 2,
        textLength: 2,
        left: 120,
        top: 200,
        width: 300,
        height: 90,
        lines: [
          {
            startOffset: 0,
            endOffset: 2,
            top: 200,
            height: 90,
            slots: [
              { offset: 0, left: 120, top: 200, height: 90 },
              { offset: 1, left: 240, top: 200, height: 90 },
              { offset: 2, left: 252, top: 200, height: 90 },
            ],
          },
        ],
      },
    ],
    paragraphsById: new Map(),
    inlineImages: [
      {
        paragraphId: paragraph.id,
        paragraphIndex: 0,
        zone: "main",
        pageIndex: 0,
        startOffset: 0,
        endOffset: 1,
        left: 120,
        top: 218,
        width: 120,
        height: 72,
      },
    ],
    unsupportedRegions: [],
  } as unknown as CanvasLayoutSnapshot;
  snapshot.paragraphsById.set(paragraph.id, [snapshot.paragraphs[0]!]);
  return { snapshot, state };
}

describe("CanvasHitTestService image hit", () => {
  it("returns image payload when pointer is inside inline image bounds", () => {
    const { snapshot, state } = createSnapshotWithInlineImage();
    const hit = resolveCanvasSurfaceHitAtPoint({
      snapshot,
      state,
      clientX: 160,
      clientY: 240,
    });

    expect(hit).not.toBeNull();
    expect(hit?.image).toBeDefined();
    expect(hit?.image?.startOffset).toBe(0);
    expect(hit?.image?.endOffset).toBe(1);
    expect(hit?.paragraphOffset).toBe(0);
  });

  it("keeps text hit flow when pointer is outside image bounds", () => {
    const { snapshot, state } = createSnapshotWithInlineImage();
    const hit = resolveCanvasSurfaceHitAtPoint({
      snapshot,
      state,
      clientX: 248,
      clientY: 240,
    });

    expect(hit).not.toBeNull();
    expect(hit?.image).toBeUndefined();
    expect(hit?.resolvedFromParagraph).toBe(true);
  });
});

