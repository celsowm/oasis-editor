import { describe, expect, it } from "vitest";
import type { EditorDocument, EditorPageSettings } from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import {
  applyShowMarkup,
  setMarkupAuthors,
} from "@/core/commands/reviewMarkup.js";
import { computeRevisionBalloons } from "@/ui/canvas/CanvasRevisionBalloonGeometry.js";
import type { CanvasLayoutSnapshot } from "@/ui/canvas/CanvasLayoutSnapshot.js";

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

function doc(): EditorDocument {
  return {
    id: "doc",
    sections: [
      {
        id: "s1",
        pageSettings: pageSettings(),
        blocks: [
          {
            id: "p1",
            type: "paragraph",
            runs: [
              {
                id: "r1",
                kind: "text",
                text: "Inserted text",
                revision: {
                  id: "ins-1",
                  type: "insert",
                  author: "Insert author",
                  date: 100,
                },
              },
            ],
          },
          {
            id: "p2",
            type: "paragraph",
            runs: [
              {
                id: "r2",
                kind: "text",
                text: "Deleted text",
                revision: {
                  id: "del-1",
                  type: "delete",
                  author: "Delete author",
                  date: 200,
                },
              },
              {
                id: "r3",
                kind: "text",
                text: "formatted",
                styles: {
                  propertyRevision: {
                    id: "prop-1",
                    type: "property",
                    author: "Format author",
                    date: 300,
                    previous: { bold: false },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  } as unknown as EditorDocument;
}

const state = () => createEditorStateFromDocument(doc());

interface SegmentSpec {
  paragraphId: string;
  pageIndex?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

function snapshot(specs: SegmentSpec[], pageCount = 1): CanvasLayoutSnapshot {
  const surfaceRect = {
    left: 0,
    top: 0,
    right: 900,
    bottom: 1200,
    width: 900,
    height: 1200,
    x: 0,
    y: 0,
    toJSON: () => "",
  } as unknown as DOMRect;
  const pages = Array.from({ length: pageCount }, (_, index) => ({
    index,
    left: 100,
    top: index * 1100,
    width: 816,
    height: 1056,
    bodyTop: 196,
    bodyBottom: 960,
  }));
  const paragraphs = specs.map((spec, index) => {
    const top = spec.top ?? 200 + index * 30;
    const height = spec.height ?? 16;
    return {
      paragraph: { id: spec.paragraphId, type: "paragraph", runs: [] },
      paragraphId: spec.paragraphId,
      paragraphIndex: index,
      zone: "main" as const,
      pageIndex: spec.pageIndex ?? 0,
      startOffset: 0,
      endOffset: 0,
      textLength: 0,
      left: spec.left ?? 180,
      top,
      width: spec.width ?? 400,
      height,
      lines: [
        {
          startOffset: 0,
          endOffset: 0,
          top,
          height,
          slots: [],
        },
      ],
    };
  });
  return {
    surfaceRect,
    pages,
    paragraphs,
    paragraphsById: new Map(paragraphs.map((p) => [p.paragraphId, [p]])),
    inlineImages: [],
    floatingImages: [],
    inlineTextBoxes: [],
    floatingTextBoxes: [],
    floatingTables: [],
    unsupportedRegions: [],
  } as unknown as CanvasLayoutSnapshot;
}

const allSegments = [
  { paragraphId: "p1", top: 200 },
  { paragraphId: "p2", top: 240 },
];

describe("computeRevisionBalloons", () => {
  it("paints one card per visible revision in the right page margin", () => {
    const boxes = computeRevisionBalloons(snapshot(allSegments), state());
    expect(boxes.map((b) => b.revisionId)).toEqual([
      "ins-1",
      "del-1",
      "prop-1",
    ]);
    // page.left(100) + width(816) - inset(12) - card(168) = 736
    for (const box of boxes) {
      expect(box.variant).toBe("balloon");
      // page right (916) - inset (8) - card (168) = 740.
      expect(box.left).toBe(740);
      expect(box.width).toBe(168);
      expect(box.height).toBe(58);
    }
  });

  it("carries author, type and snippet for the card label", () => {
    const boxes = computeRevisionBalloons(snapshot(allSegments), state());
    expect(boxes[0]).toMatchObject({
      revisionId: "ins-1",
      type: "insert",
      author: "Insert author",
      snippet: "Inserted text",
    });
    expect(boxes[2]).toMatchObject({
      type: "property",
      author: "Format author",
      snippet: "formatted",
    });
  });

  it("shrinks the card to a narrow right margin so it never covers text", () => {
    // Text spans the full content width: content right = 100 + 720 = 820, so
    // the right margin is only 96px and the card must fit inside it.
    const full = [
      { paragraphId: "p1", left: 100, width: 720 },
      { paragraphId: "p2", left: 100, width: 720 },
    ];
    const boxes = computeRevisionBalloons(snapshot(full), state());
    for (const box of boxes) {
      expect(box.width).toBe(84);
      expect(box.left + box.width).toBeLessThanOrEqual(916);
      expect(box.left).toBeGreaterThanOrEqual(820);
    }
  });

  it("hides property balloons when the Formatting category is off", () => {
    const hidden = applyShowMarkup(state(), { section: "formatting" });
    const boxes = computeRevisionBalloons(snapshot(allSegments), hidden);
    expect(boxes.map((b) => b.revisionId)).toEqual(["ins-1", "del-1"]);
  });

  it("hides every balloon when the reviewer is filtered out", () => {
    const hidden = setMarkupAuthors(state(), ["Someone else"]);
    expect(computeRevisionBalloons(snapshot(allSegments), hidden)).toEqual([]);
  });

  it("stacks overlapping cards on the same page", () => {
    const same = [
      { paragraphId: "p1", top: 200 },
      { paragraphId: "p2", top: 200 },
    ];
    const boxes = computeRevisionBalloons(snapshot(same), state());
    const tops = boxes.map((b) => b.top).sort((a, b) => a - b);
    for (let i = 1; i < tops.length; i += 1) {
      expect(tops[i]! - tops[i - 1]!).toBeGreaterThanOrEqual(58);
    }
  });

  it("keeps per-page margin x on multi-page documents", () => {
    const spread = [
      { paragraphId: "p1", pageIndex: 0, top: 200 },
      { paragraphId: "p2", pageIndex: 1, top: 1300 },
    ];
    const boxes = computeRevisionBalloons(snapshot(spread, 2), state());
    // p1 carries ins-1; p2 carries del-1 and prop-1 → three cards.
    expect(boxes).toHaveLength(3);
    // Both pages share left/width, so the same x; tops stay on their pages.
    expect(boxes.every((b) => b.left === 740)).toBe(true);
    expect(boxes.filter((b) => b.top >= 1000)).toHaveLength(2);
  });

  it("skips revisions whose paragraphs have no painted geometry", () => {
    expect(computeRevisionBalloons(snapshot([]), state())).toEqual([]);
  });
});
