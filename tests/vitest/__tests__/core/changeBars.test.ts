import { describe, expect, it } from "vitest";
import type {
  EditorDocument,
  EditorPageSettings,
  EditorParagraphNode,
  EditorTextRun,
} from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { applyShowMarkup } from "@/core/commands/reviewMarkup.js";
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

function documentWith(blocks: EditorParagraphNode[]): EditorDocument {
  return {
    id: "doc",
    sections: [{ id: "s1", blocks, pageSettings: pageSettings() }],
  } as unknown as EditorDocument;
}

interface SegmentSpec {
  paragraphId: string;
  left: number;
  top: number;
  height: number;
  lines: { top: number; height: number }[];
}

/** Minimal snapshot whose paragraphs carry only id + left + line geometry. */
function snapshot(segments: SegmentSpec[]): CanvasLayoutSnapshot {
  const paragraphs = segments.map(
    (spec): CanvasSnapshotParagraph =>
      ({
        paragraphId: spec.paragraphId,
        left: spec.left,
        top: spec.top,
        height: spec.height,
        lines: spec.lines.map((line) => ({
          ...line,
          startOffset: 0,
          endOffset: 0,
          slots: [],
        })),
      }) as unknown as CanvasSnapshotParagraph,
  );
  return {
    surfaceRect: { left: 200, top: 50 } as DOMRect,
    paragraphs,
  } as unknown as CanvasLayoutSnapshot;
}

const trackedDoc = () =>
  documentWith([
    paragraph("p-plain", [textRun("r0", "unchanged")]),
    paragraph("p-insert", [
      textRun("r1", "added", {
        id: "i1",
        type: "insert",
        author: "A",
        date: 1,
      }),
    ]),
  ]);

describe("computeChangeBars", () => {
  const segments: SegmentSpec[] = [
    {
      paragraphId: "p-plain",
      left: 296,
      top: 120,
      height: 20,
      lines: [{ top: 120, height: 20 }],
    },
    {
      paragraphId: "p-insert",
      left: 296,
      top: 160,
      height: 40,
      lines: [
        { top: 160, height: 20 },
        { top: 180, height: 20 },
      ],
    },
  ];

  it("paints one bar per changed paragraph in the left margin", () => {
    const state = createEditorStateFromDocument(trackedDoc());
    const boxes = computeChangeBars(snapshot(segments), state);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toEqual({
      paragraphId: "p-insert",
      // 296 (text edge) - 200 (surface) - 8 (gap) = 88
      left: 88,
      // 160 (first line top) - 50 (surface) = 110
      top: 110,
      // 200 (last line bottom) - 160 (first line top) = 40
      height: 40,
    });
  });

  it("falls back to paragraph geometry when a segment has no lines", () => {
    const state = createEditorStateFromDocument(trackedDoc());
    const boxes = computeChangeBars(
      snapshot([
        { paragraphId: "p-insert", left: 296, top: 160, height: 24, lines: [] },
      ]),
      state,
    );
    expect(boxes[0]).toMatchObject({ top: 110, height: 24 });
  });

  it("ignores segments whose id has no visible revision", () => {
    const state = createEditorStateFromDocument(trackedDoc());
    const boxes = computeChangeBars(snapshot(segments), state);
    expect(boxes.every((box) => box.paragraphId !== "p-plain")).toBe(true);
  });

  it("returns no bars when Show Markup hides the insertion", () => {
    const state = applyShowMarkup(createEditorStateFromDocument(trackedDoc()), {
      section: "insertions",
    });
    expect(computeChangeBars(snapshot(segments), state)).toHaveLength(0);
  });

  it("returns no bars for a document without text revisions", () => {
    const state = createEditorStateFromDocument(
      documentWith([paragraph("p-plain", [textRun("r0", "plain")])]),
    );
    expect(computeChangeBars(snapshot(segments), state)).toHaveLength(0);
  });
});
