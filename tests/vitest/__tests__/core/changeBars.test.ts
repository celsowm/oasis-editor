import { describe, expect, it } from "vitest";
import type {
  EditorDocument,
  EditorPageSettings,
  EditorParagraphNode,
  EditorTextRun,
} from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import {
  applyShowMarkup,
  collectChangeBarRanges,
} from "@/core/commands/reviewMarkup.js";
import { computeChangeBars } from "@/ui/canvas/CanvasChangeBarGeometry.js";
import type { CanvasLayoutSnapshot } from "@/ui/canvas/CanvasLayoutSnapshot.js";
import type { CanvasSnapshotParagraph } from "@/ui/canvas/canvasSnapshotTypes.js";

function pageSettings(): EditorPageSettings {
  return {
    width: 816,
    height: 1056,
    orientation: "portrait",
    margins: {
      top: 96,
      right: 96,
      bottom: 96,
      left: 96,
      header: 48,
      footer: 48,
      gutter: 0,
    },
  };
}

function textRun(
  id: string,
  text: string,
  revision?: {
    id: string;
    type: "insert" | "delete";
    author: string;
    date: number;
  },
): EditorTextRun {
  return {
    id,
    kind: "text",
    text,
    ...(revision ? { revision } : {}),
  } as EditorTextRun;
}

function paragraph(id: string, runs: EditorTextRun[]): EditorParagraphNode {
  return { id, type: "paragraph", runs } as EditorParagraphNode;
}

function documentWith(blocks: EditorBlockLike[]): EditorDocument {
  return {
    id: "doc",
    sections: [{ id: "s1", blocks, pageSettings: pageSettings() }],
  } as unknown as EditorDocument;
}

type EditorBlockLike = EditorParagraphNode | Record<string, unknown>;

interface LineSpec {
  top: number;
  height: number;
  /** Paragraph-local offsets in the projected (final) text. */
  start: number;
  end: number;
}

interface SegmentSpec {
  paragraphId: string;
  left: number;
  top: number;
  height: number;
  pageIndex?: number;
  lines: LineSpec[];
}

interface PageSpec {
  index: number;
  left: number;
}

/**
 * Minimal snapshot. surfaceRect.left = 200 and page.left = 200 by default, so a
 * paragraph at left 296 puts the content boundary 96px into the page; the bar
 * sits at half the margin (48px local).
 */
function snapshot(
  segments: SegmentSpec[],
  pages: PageSpec[] = [{ index: 0, left: 200 }],
): CanvasLayoutSnapshot {
  const paragraphs = segments.map(
    (spec): CanvasSnapshotParagraph =>
      ({
        paragraphId: spec.paragraphId,
        pageIndex: spec.pageIndex ?? 0,
        left: spec.left,
        top: spec.top,
        height: spec.height,
        startOffset: 0,
        endOffset: spec.lines.at(-1)?.end ?? 0,
        lines: spec.lines.map((line) => ({
          startOffset: line.start,
          endOffset: line.end,
          top: line.top,
          height: line.height,
          slots: [],
        })),
      }) as unknown as CanvasSnapshotParagraph,
  );
  return {
    surfaceRect: { left: 200, top: 50 } as DOMRect,
    pages: pages.map((page) => ({
      index: page.index,
      left: page.left,
      top: 50,
      width: 816,
      height: 1056,
      bodyTop: 96,
      bodyBottom: 960,
    })),
    paragraphs,
  } as unknown as CanvasLayoutSnapshot;
}

const inserted = (id: string, text: string, author = "A") =>
  textRun(id, text, { id: `rev-${id}`, type: "insert", author, date: 1 });

const deleted = (id: string, text: string, author = "A") =>
  textRun(id, text, { id: `rev-${id}`, type: "delete", author, date: 1 });

const twoLines: LineSpec[] = [
  { top: 160, height: 20, start: 0, end: 5 },
  { top: 180, height: 20, start: 5, end: 10 },
];

describe("collectChangeBarRanges", () => {
  it("maps inserted runs to final-text offsets", () => {
    const doc = documentWith([
      paragraph("p", [
        textRun("r0", "plain"),
        inserted("r1", "added"),
        textRun("r2", "tail"),
      ]),
    ]);
    expect(
      collectChangeBarRanges(createEditorStateFromDocument(doc)).get("p"),
    ).toEqual([{ start: 5, end: 10 }]);
  });

  it("skips deleted text but leaves a marker at the join", () => {
    const doc = documentWith([
      paragraph("p", [
        textRun("r0", "plain"),
        deleted("r1", "gone"),
        textRun("r2", "tail"),
      ]),
    ]);
    expect(
      collectChangeBarRanges(createEditorStateFromDocument(doc)).get("p"),
    ).toEqual([{ start: 4, end: 6 }]);
  });

  it("returns null for paragraphs covered by a table revision", () => {
    const doc = documentWith([
      {
        id: "t1",
        type: "table",
        rows: [
          {
            id: "row0",
            cells: [
              {
                id: "c0",
                blocks: [paragraph("cell-p", [textRun("r0", "x")])],
                style: {
                  revision: {
                    id: "cell-ins",
                    type: "insert",
                    author: "A",
                    date: 1,
                  },
                },
              },
            ],
          },
        ],
      },
    ]);
    const ranges = collectChangeBarRanges(createEditorStateFromDocument(doc));
    expect(ranges.get("cell-p")).toBeNull();
  });

  it("drops ranges hidden by Show Markup", () => {
    const doc = documentWith([
      paragraph("p-insert", [inserted("r1", "added")]),
    ]);
    const state = createEditorStateFromDocument(doc);
    expect(collectChangeBarRanges(state).has("p-insert")).toBe(true);
    expect(
      collectChangeBarRanges(applyShowMarkup(state, { section: "insertions" }))
        .size,
    ).toBe(0);
  });
});

describe("computeChangeBars — per-line, page-margin bars", () => {
  it("paints one bar per changed line at a page-margin x", () => {
    // One inserted run spans both lines, so every line is marked.
    const doc = documentWith([
      paragraph("p-insert", [inserted("r1", "0123456789")]),
    ]);
    const boxes = computeChangeBars(
      snapshot([
        {
          paragraphId: "p-insert",
          left: 296,
          top: 160,
          height: 40,
          lines: twoLines,
        },
      ]),
      createEditorStateFromDocument(doc),
    );
    expect(boxes).toEqual([
      { paragraphId: "p-insert", left: 48, top: 110, height: 20 },
      { paragraphId: "p-insert", left: 48, top: 130, height: 20 },
    ]);
  });

  it("marks only the lines that contain a visible revision", () => {
    // Insert covers offsets 0..5 (line 1); the rest is plain and wraps on.
    const doc = documentWith([
      paragraph("p", [inserted("r1", "added"), textRun("r2", "0123456789")]),
    ]);
    const boxes = computeChangeBars(
      snapshot([
        {
          paragraphId: "p",
          left: 296,
          top: 160,
          height: 60,
          lines: [
            { top: 160, height: 20, start: 0, end: 5 },
            { top: 180, height: 20, start: 5, end: 10 },
            { top: 200, height: 20, start: 10, end: 15 },
          ],
        },
      ]),
      createEditorStateFromDocument(doc),
    );
    expect(boxes).toEqual([
      { paragraphId: "p", left: 48, top: 110, height: 20 },
    ]);
  });

  it("keeps the line where deleted text was removed marked", () => {
    const doc = documentWith([
      paragraph("p", [deleted("r1", "gone"), textRun("r2", "0123456789")]),
    ]);
    const boxes = computeChangeBars(
      snapshot([
        {
          paragraphId: "p",
          left: 296,
          top: 160,
          height: 40,
          lines: twoLines,
        },
      ]),
      createEditorStateFromDocument(doc),
    );
    expect(boxes.map((box) => box.top)).toEqual([110]);
  });

  it("aligns bars in the page margin regardless of paragraph indentation", () => {
    const doc = documentWith([
      paragraph("p1", [inserted("r1", "a")]),
      paragraph("p2", [inserted("r2", "b")]),
    ]);
    const boxes = computeChangeBars(
      snapshot([
        {
          paragraphId: "p1",
          left: 296,
          top: 120,
          height: 20,
          lines: [{ top: 120, height: 20, start: 0, end: 1 }],
        },
        {
          paragraphId: "p2",
          left: 420,
          top: 160,
          height: 20,
          lines: [{ top: 160, height: 20, start: 0, end: 1 }],
        },
      ]),
      createEditorStateFromDocument(doc),
    );
    expect(boxes.map((box) => box.left)).toEqual([48, 48]);
  });

  it("marks every line of a paragraph covered by a cell revision", () => {
    const doc = documentWith([
      paragraph("p-body", [inserted("r0", "0123456789")]),
      {
        id: "t1",
        type: "table",
        rows: [
          {
            id: "row0",
            cells: [
              {
                id: "c0",
                blocks: [paragraph("cell-p", [textRun("r1", "xxxxxxxxxx")])],
                style: {
                  revision: {
                    id: "cell-ins",
                    type: "insert",
                    author: "A",
                    date: 1,
                  },
                },
              },
            ],
          },
        ],
      },
    ]);
    const boxes = computeChangeBars(
      snapshot([
        {
          paragraphId: "p-body",
          left: 296,
          top: 120,
          height: 20,
          lines: [{ top: 120, height: 20, start: 0, end: 10 }],
        },
        {
          paragraphId: "cell-p",
          left: 520,
          top: 160,
          height: 40,
          lines: twoLines,
        },
      ]),
      createEditorStateFromDocument(doc),
    );
    // The cell revision covers both of its lines (null = all lines).
    expect(
      boxes.filter((box) => box.paragraphId === "cell-p").map((box) => box.top),
    ).toEqual([110, 130]);
    // Both the body and the table-cell bars sit in the page margin.
    expect(boxes.every((box) => box.left === 48)).toBe(true);
  });

  it("anchors the margin x to each page's own left edge", () => {
    const doc = documentWith([
      paragraph("p1", [inserted("r1", "a")]),
      paragraph("p2", [inserted("r2", "b")]),
    ]);
    const boxes = computeChangeBars(
      snapshot(
        [
          {
            paragraphId: "p1",
            left: 296,
            top: 120,
            height: 20,
            pageIndex: 0,
            lines: [{ top: 120, height: 20, start: 0, end: 1 }],
          },
          {
            paragraphId: "p2",
            left: 1296,
            top: 120,
            height: 20,
            pageIndex: 1,
            lines: [{ top: 120, height: 20, start: 0, end: 1 }],
          },
        ],
        [
          { index: 0, left: 200 },
          { index: 1, left: 1200 },
        ],
      ),
      createEditorStateFromDocument(doc),
    );
    // Page 2 starts 1000px to the right, so its bar shares the same offset
    // into its own margin but is 1000px further right in local space.
    expect(boxes.map((box) => box.left)).toEqual([48, 1048]);
  });

  it("falls back to paragraph geometry when a segment has no lines", () => {
    const doc = documentWith([paragraph("p-insert", [inserted("r1", "a")])]);
    const boxes = computeChangeBars(
      snapshot([
        { paragraphId: "p-insert", left: 296, top: 160, height: 24, lines: [] },
      ]),
      createEditorStateFromDocument(doc),
    );
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({ top: 110, height: 24 });
  });

  it("ignores segments whose id has no visible revision", () => {
    const doc = documentWith([
      paragraph("p-plain", [textRun("r0", "unchanged")]),
      paragraph("p-insert", [inserted("r1", "added")]),
    ]);
    const boxes = computeChangeBars(
      snapshot([
        {
          paragraphId: "p-plain",
          left: 296,
          top: 120,
          height: 20,
          lines: [{ top: 120, height: 20, start: 0, end: 9 }],
        },
        {
          paragraphId: "p-insert",
          left: 296,
          top: 160,
          height: 20,
          lines: [{ top: 160, height: 20, start: 0, end: 5 }],
        },
      ]),
      createEditorStateFromDocument(doc),
    );
    expect(boxes.every((box) => box.paragraphId !== "p-plain")).toBe(true);
  });

  it("returns no bars when Show Markup hides the insertion", () => {
    const doc = documentWith([
      paragraph("p-insert", [inserted("r1", "added")]),
    ]);
    const state = applyShowMarkup(createEditorStateFromDocument(doc), {
      section: "insertions",
    });
    expect(
      computeChangeBars(
        snapshot([
          {
            paragraphId: "p-insert",
            left: 296,
            top: 160,
            height: 20,
            lines: [{ top: 160, height: 20, start: 0, end: 5 }],
          },
        ]),
        state,
      ),
    ).toHaveLength(0);
  });

  it("drops a formatting paragraph's bar when the formatting category is off", () => {
    const formatted = {
      id: "r1",
      kind: "text",
      text: "changed",
      styles: {
        propertyRevision: {
          id: "fmt1",
          type: "property",
          author: "Zoe",
          date: 1,
          previous: {},
        },
      },
    } as unknown as EditorTextRun;
    const doc = documentWith([
      paragraph("p-plain", [textRun("r0", "plain")]),
      paragraph("p-format", [formatted]),
    ]);
    const segs: SegmentSpec[] = [
      {
        paragraphId: "p-format",
        left: 296,
        top: 120,
        height: 20,
        lines: [{ top: 120, height: 20, start: 0, end: 7 }],
      },
    ];
    const state = createEditorStateFromDocument(doc);
    expect(computeChangeBars(snapshot(segs), state)).toHaveLength(1);
    const hidden = applyShowMarkup(state, { section: "formatting" });
    expect(computeChangeBars(snapshot(segs), hidden)).toHaveLength(0);
  });

  it("returns no bars for a document without text revisions", () => {
    const doc = documentWith([paragraph("p-plain", [textRun("r0", "plain")])]);
    const boxes = computeChangeBars(
      snapshot([
        {
          paragraphId: "p-plain",
          left: 296,
          top: 120,
          height: 20,
          lines: [{ top: 120, height: 20, start: 0, end: 5 }],
        },
      ]),
      createEditorStateFromDocument(doc),
    );
    expect(boxes).toHaveLength(0);
  });
});
