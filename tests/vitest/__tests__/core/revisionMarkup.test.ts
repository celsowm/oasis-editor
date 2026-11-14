import { describe, expect, it } from "vitest";
import type {
  EditorDocument,
  EditorPageSettings,
  EditorParagraphNode,
  EditorTextRun,
  EditorStructuralRevision,
} from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { toggleRevisionMarkup } from "@/core/commands/history.js";
import { computeRevisionMarkup } from "@/ui/canvas/CanvasRevisionGeometry.js";
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

function textRun(
  id: string,
  text: string,
  revision?: { id: string; type: "insert" | "delete"; author: string; date: number },
): EditorTextRun {
  return { id, kind: "text", text, ...(revision ? { revision } : {}) } as EditorTextRun;
}

function paragraph(
  id: string,
  runs: EditorTextRun[],
): EditorParagraphNode {
  return { id, type: "paragraph", runs };
}

function stateWith(
  blocks: EditorParagraphNode[],
) {
  const document: EditorDocument = {
    id: "doc",
    sections: [{ id: "s1", blocks, pageSettings: pageSettings() }],
  };
  return createEditorStateFromDocument(document);
}

function buildSnapshot(
  paragraph: EditorParagraphNode,
  lineSplits: Array<[number, number]> = [[0, 12]],
): CanvasLayoutSnapshot {
  const lines = lineSplits.map(([lineStart, lineEnd], index) => {
    const slots = [] as Array<{
      offset: number;
      left: number;
      top: number;
      height: number;
    }>;
    for (let offset = lineStart; offset <= lineEnd; offset++) {
      slots.push({
        offset,
        left: 100 + offset * 8,
        top: 100 + index * 20,
        height: 16,
      });
    }
    return {
      startOffset: lineStart,
      endOffset: lineEnd,
      top: 100 + index * 20,
      height: 16,
      slots,
    };
  });
  const segment = {
    paragraph,
    paragraphId: paragraph.id,
    paragraphIndex: 0,
    zone: "main" as const,
    pageIndex: 0,
    startOffset: 0,
    endOffset: 12,
    textLength: 12,
    left: 100,
    top: 100,
    width: 260,
    height: lineSplits.length * 20,
    lines,
  };
  return {
    surfaceRect: { left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON: () => "" } as unknown as DOMRect,
    pages: [],
    paragraphs: [segment],
    paragraphsById: new Map([[paragraph.id, [segment]]]),
    inlineImages: [],
    floatingImages: [],
    inlineTextBoxes: [],
    floatingTextBoxes: [],
    floatingTables: [],
    unsupportedRegions: [],
  } as unknown as CanvasLayoutSnapshot;
}

describe("computeRevisionMarkup", () => {
  it("paints one underlined box per inserted range, merged across runs", () => {
    const para = paragraph("p1", [
      textRun("a", "hello "),
      textRun("b", "mark", { id: "i1", type: "insert", author: "A", date: 1 }),
      textRun("c", "ed", { id: "i1", type: "insert", author: "A", date: 1 }),
    ]);
    const snapshot = buildSnapshot(para, [[0, 12]]);

    const boxes = computeRevisionMarkup(snapshot);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({
      revisionId: "i1",
      type: "insert",
      left: 100 + 6 * 8,
      top: 100,
      height: 16,
    });
    expect(boxes[0].width).toBe(6 * 8);
  });

  it("paints deletions distinctly from insertions", () => {
    const para = paragraph("p1", [
      textRun("a", "keep "),
      textRun("b", "gone", { id: "d1", type: "delete", author: "A", date: 1 }),
    ]);
    const boxes = computeRevisionMarkup(buildSnapshot(para));
    expect(boxes).toHaveLength(1);
    expect(boxes[0].type).toBe("delete");
    expect(boxes[0].revisionId).toBe("d1");
  });

  it("splits a range into one box per covered line", () => {
    const para = paragraph("p1", [
      textRun("a", "aaaa", { id: "i1", type: "insert", author: "A", date: 1 }),
      textRun("b", "bbbb", { id: "i1", type: "insert", author: "A", date: 1 }),
      textRun("c", "cccc", { id: "i1", type: "insert", author: "A", date: 1 }),
    ]);
    const boxes = computeRevisionMarkup(buildSnapshot(para, [[0, 4], [4, 8], [8, 12]]));
    expect(boxes).toHaveLength(3);
    expect(boxes.every((box) => box.type === "insert")).toBe(true);
    expect(boxes.map((box) => box.top)).toEqual([100, 120, 140]);
  });

  it("returns no boxes for untracked text", () => {
    const para = paragraph("p1", [textRun("a", "plain text")]);
    expect(computeRevisionMarkup(buildSnapshot(para))).toHaveLength(0);
  });
});

describe("toggleRevisionMarkup", () => {
  it("defaults to on and flips both ways", () => {
    const state = stateWith([
      paragraph("p1", [textRun("a", "hello world!")]),
    ]);
    expect(toggleRevisionMarkup(state).showRevisionMarkup).toBe(false);
    expect(toggleRevisionMarkup(toggleRevisionMarkup(state)).showRevisionMarkup).toBe(true);
  });
});
