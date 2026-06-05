import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "../../core/editorState.js";
import type { CanvasLayoutSnapshot } from "../../ui/canvas/CanvasLayoutSnapshot.js";
import { resolveCanvasSurfaceHitAtPoint } from "../../ui/canvas/CanvasHitTestService.js";

function createSnapshotWithInlineImage(): {
  snapshot: CanvasLayoutSnapshot;
  state: ReturnType<typeof createEditorStateFromDocument>;
} {
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
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
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

describe("canvas hit-test service image hit", () => {
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

describe("canvas hit-test service footnote zone", () => {
  it("returns footnote zone when pointer is inside a footnote paragraph", () => {
    const paragraph = createEditorParagraphFromRuns([{ text: "note" }]);
    const state = createEditorStateFromDocument(
      createEditorDocument([paragraph]),
    );
    const snapshot: CanvasLayoutSnapshot = {
      surfaceRect: { left: 0, top: 0, width: 900, height: 1100 } as DOMRect,
      pages: [
        {
          index: 0,
          left: 0,
          top: 0,
          width: 800,
          height: 1000,
          bodyTop: 90,
          bodyBottom: 820,
          footerTop: 910,
          footnoteSeparatorTop: 830,
          footnoteTop: 840,
        },
      ],
      paragraphs: [
        {
          paragraph,
          paragraphId: paragraph.id,
          paragraphIndex: 0,
          zone: "footnote",
          footnoteId: "footnote:1",
          pageIndex: 0,
          startOffset: 0,
          endOffset: 4,
          textLength: 4,
          left: 144,
          top: 850,
          width: 300,
          height: 20,
          lines: [
            {
              startOffset: 0,
              endOffset: 4,
              top: 850,
              height: 20,
              slots: [
                { offset: 0, left: 144, top: 850, height: 20 },
                { offset: 1, left: 152, top: 850, height: 20 },
                { offset: 2, left: 160, top: 850, height: 20 },
                { offset: 3, left: 168, top: 850, height: 20 },
                { offset: 4, left: 176, top: 850, height: 20 },
              ],
            },
          ],
        },
      ],
      paragraphsById: new Map(),
      inlineImages: [],
      unsupportedRegions: [],
    };
    snapshot.paragraphsById.set(paragraph.id, [snapshot.paragraphs[0]!]);

    const hit = resolveCanvasSurfaceHitAtPoint({
      snapshot,
      state,
      clientX: 150,
      clientY: 858,
    });

    expect(hit?.zone).toBe("footnote");
    expect(hit?.footnoteId).toBe("footnote:1");
    expect(hit?.paragraphId).toBe(paragraph.id);
  });

  it("keeps main zone above the footnote separator", () => {
    const paragraph = createEditorParagraphFromRuns([{ text: "body" }]);
    const state = createEditorStateFromDocument(
      createEditorDocument([paragraph]),
    );
    const snapshot: CanvasLayoutSnapshot = {
      surfaceRect: { left: 0, top: 0, width: 900, height: 1100 } as DOMRect,
      pages: [
        {
          index: 0,
          left: 0,
          top: 0,
          width: 800,
          height: 1000,
          bodyTop: 90,
          bodyBottom: 820,
          footerTop: 910,
          footnoteSeparatorTop: 830,
          footnoteTop: 840,
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
          endOffset: 4,
          textLength: 4,
          left: 120,
          top: 200,
          width: 300,
          height: 20,
          lines: [
            {
              startOffset: 0,
              endOffset: 4,
              top: 200,
              height: 20,
              slots: [
                { offset: 0, left: 120, top: 200, height: 20 },
                { offset: 1, left: 128, top: 200, height: 20 },
                { offset: 2, left: 136, top: 200, height: 20 },
                { offset: 3, left: 144, top: 200, height: 20 },
                { offset: 4, left: 152, top: 200, height: 20 },
              ],
            },
          ],
        },
      ],
      paragraphsById: new Map(),
      inlineImages: [],
      unsupportedRegions: [],
    };
    snapshot.paragraphsById.set(paragraph.id, [snapshot.paragraphs[0]!]);

    const hit = resolveCanvasSurfaceHitAtPoint({
      snapshot,
      state,
      clientX: 128,
      clientY: 208,
    });

    expect(hit?.zone).toBe("main");
    expect(hit?.paragraphId).toBe(paragraph.id);
  });
});
