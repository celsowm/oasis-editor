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
import {
  applyShowMarkup,
  setMarkupAuthors,
} from "@/core/commands/reviewMarkup.js";
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
  return { id, type: "paragraph", runs };
}

function stateWith(blocks: EditorParagraphNode[]) {
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
    surfaceRect: {
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => "",
    } as unknown as DOMRect,
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

function markupBoxes(
  para: EditorParagraphNode,
  state = stateWith([para]),
  lineSplits: Array<[number, number]> = [[0, 12]],
) {
  return computeRevisionMarkup(buildSnapshot(para, lineSplits), state);
}

describe("computeRevisionMarkup", () => {
  it("paints one underlined box per inserted range, merged across runs", () => {
    const para = paragraph("p1", [
      textRun("a", "hello "),
      textRun("b", "mark", { id: "i1", type: "insert", author: "A", date: 1 }),
      textRun("c", "ed", { id: "i1", type: "insert", author: "A", date: 1 }),
    ]);
    const boxes = markupBoxes(para);
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
    const boxes = markupBoxes(para);
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
    const boxes = markupBoxes(para, stateWith([para]), [
      [0, 4],
      [4, 8],
      [8, 12],
    ]);
    expect(boxes).toHaveLength(3);
    expect(boxes.every((box) => box.type === "insert")).toBe(true);
    expect(boxes.map((box) => box.top)).toEqual([100, 120, 140]);
  });

  it("returns no boxes for untracked text", () => {
    const para = paragraph("p1", [textRun("a", "plain text")]);
    expect(markupBoxes(para)).toHaveLength(0);
  });

  const mixed = (): EditorParagraphNode =>
    paragraph("p1", [
      textRun("a", "added", {
        id: "i1",
        type: "insert",
        author: "User",
        date: 1,
      }),
      textRun("b", "gone", {
        id: "d1",
        type: "delete",
        author: "Zoe",
        date: 2,
      }),
    ]);

  it("hides only insertions when the insertions section is off", () => {
    const para = mixed();
    const state = applyShowMarkup(stateWith([para]), {
      section: "insertions",
    });
    const boxes = markupBoxes(para, state);
    expect(boxes.map((box) => box.type)).toEqual(["delete"]);
  });

  it("hides only deletions when the deletions section is off", () => {
    const para = mixed();
    const state = applyShowMarkup(stateWith([para]), {
      section: "deletions",
    });
    const boxes = markupBoxes(para, state);
    expect(boxes.map((box) => box.type)).toEqual(["insert"]);
  });

  it("hides a reviewer's painted markup", () => {
    const para = mixed();
    const state = setMarkupAuthors(stateWith([para]), ["User"]);
    const boxes = markupBoxes(para, state);
    expect(boxes.map((box) => box.revisionId)).toEqual(["i1"]);
  });

  it("hides every painted markup when no reviewer is visible", () => {
    const para = mixed();
    const state = applyShowMarkup(stateWith([para]), { allAuthors: false });
    expect(markupBoxes(para, state)).toHaveLength(0);
  });

  const propertyRun = (
    id: string,
    text: string,
    author: string,
  ): EditorTextRun =>
    ({
      id,
      kind: "text",
      text,
      styles: {
        propertyRevision: {
          id: `fmt-${id}`,
          type: "property",
          author,
          date: 1,
          previous: {},
        },
      },
    }) as unknown as EditorTextRun;

  it("paints a distinct property decoration for a formatting revision", () => {
    const para = paragraph("p1", [
      textRun("a", "plain "),
      propertyRun("b", "formatted", "Zoe"),
    ]);
    const boxes = markupBoxes(para);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({
      revisionId: "fmt-b",
      type: "property",
    });
  });

  it("merges adjacent runs sharing one property revision id", () => {
    const property = {
      id: "fmt-shared",
      type: "property" as const,
      author: "Zoe",
      date: 1,
      previous: {},
    };
    const para = paragraph("p1", [
      {
        id: "a",
        kind: "text",
        text: "form",
        styles: { propertyRevision: property },
      },
      {
        id: "b",
        kind: "text",
        text: "atted",
        styles: { propertyRevision: property },
      },
    ] as unknown as EditorTextRun[]);
    expect(markupBoxes(para)).toHaveLength(1);
  });

  it("lets insert/delete take precedence over property on the same run", () => {
    const para = paragraph("p1", [
      {
        ...propertyRun("a", "text", "Zoe"),
        revision: {
          id: "ins-a",
          type: "insert",
          author: "Zoe",
          date: 1,
        },
      } as unknown as EditorTextRun,
    ]);
    const boxes = markupBoxes(para);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({
      revisionId: "ins-a",
      type: "insert",
    });
  });

  it("hides a property decoration when its author is filtered out", () => {
    const para = paragraph("p1", [propertyRun("a", "formatted", "Zoe")]);
    const state = setMarkupAuthors(stateWith([para]), ["User"]);
    expect(markupBoxes(para, state)).toHaveLength(0);
  });

  it("keeps property decorations when only the insertions category is off", () => {
    const para = paragraph("p1", [propertyRun("a", "formatted", "Zoe")]);
    const state = applyShowMarkup(stateWith([para]), {
      section: "insertions",
    });
    expect(markupBoxes(para, state).map((box) => box.type)).toEqual([
      "property",
    ]);
  });

  it("hides property decorations when the formatting category is off", () => {
    const para = paragraph("p1", [propertyRun("a", "formatted", "Zoe")]);
    const state = applyShowMarkup(stateWith([para]), {
      section: "formatting",
    });
    expect(markupBoxes(para, state)).toHaveLength(0);
  });
});

describe("toggleRevisionMarkup", () => {
  it("defaults to on and flips both ways", () => {
    const state = stateWith([paragraph("p1", [textRun("a", "hello world!")])]);
    expect(toggleRevisionMarkup(state).showRevisionMarkup).toBe(false);
    expect(
      toggleRevisionMarkup(toggleRevisionMarkup(state)).showRevisionMarkup,
    ).toBe(true);
  });
});

interface CellSpec {
  paragraphId: string;
  rowIndex: number;
  cellIndex: number;
  revisionId: string;
  type: "insert" | "delete" | "merge" | "property";
  author: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Snapshot whose paragraphs each carry a revised table cell. */
function cellSnapshot(cells: CellSpec[]): CanvasLayoutSnapshot {
  const base = buildSnapshot(paragraph("p0", [textRun("a", "plain")]));
  const paragraphs = cells.map((cell) => ({
    ...(base.paragraphs[0] as object),
    paragraphId: cell.paragraphId,
    tableCell: {
      tableId: "t1",
      rowIndex: cell.rowIndex,
      cellIndex: cell.cellIndex,
      left: cell.left,
      top: cell.top,
      width: cell.width,
      height: cell.height,
      anchorPosition: {},
      revisionId: cell.revisionId,
      revisionType: cell.type,
      revisionAuthor: cell.author,
    },
  }));
  return {
    ...base,
    paragraphs,
  } as unknown as CanvasLayoutSnapshot;
}

describe("computeRevisionMarkup table-cell revisions", () => {
  const cells: CellSpec[] = [
    {
      paragraphId: "p-ins",
      rowIndex: 1,
      cellIndex: 0,
      revisionId: "cell-ins",
      type: "insert",
      author: "Table author",
      left: 120,
      top: 140,
      width: 90,
      height: 24,
    },
    {
      paragraphId: "p-prop",
      rowIndex: 1,
      cellIndex: 1,
      revisionId: "cell-prop",
      type: "property",
      author: "Table author",
      left: 220,
      top: 140,
      width: 90,
      height: 24,
    },
  ];
  const rawState = () =>
    stateWith([
      paragraph("p-ins", [textRun("a", "plain")]),
      paragraph("p-prop", [textRun("b", "plain")]),
    ]);

  it("paints one full-cell outline box per revised cell", () => {
    const boxes = computeRevisionMarkup(cellSnapshot(cells), rawState());
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toEqual({
      revisionId: "cell-ins",
      type: "insert",
      variant: "cell",
      left: 120,
      top: 140,
      width: 90,
      height: 24,
    });
    expect(boxes[1]).toMatchObject({
      revisionId: "cell-prop",
      type: "property",
      variant: "cell",
    });
  });

  it("deduplicates multiple paragraphs inside one cell", () => {
    const dup = [cells[0]!, { ...cells[0]!, paragraphId: "p-ins-2" }];
    expect(computeRevisionMarkup(cellSnapshot(dup), rawState())).toHaveLength(
      1,
    );
  });

  it("hides a property cell when the Formatting category is off", () => {
    const state = applyShowMarkup(rawState(), { section: "formatting" });
    const boxes = computeRevisionMarkup(cellSnapshot(cells), state);
    expect(boxes.map((box) => box.type)).toEqual(["insert"]);
  });

  it("hides an inserted cell when the Insertions category is off", () => {
    const state = applyShowMarkup(rawState(), { section: "insertions" });
    const boxes = computeRevisionMarkup(cellSnapshot(cells), state);
    expect(boxes.map((box) => box.type)).toEqual(["property"]);
  });

  it("hides all cell outlines when the reviewer is filtered out", () => {
    const state = setMarkupAuthors(rawState(), ["Someone else"]);
    expect(computeRevisionMarkup(cellSnapshot(cells), state)).toHaveLength(0);
  });

  it("merge has no category and is reviewer-filtered only", () => {
    const merge: CellSpec[] = [
      { ...cells[0]!, type: "merge", revisionId: "cell-merge" },
    ];
    const state = applyShowMarkup(rawState(), { section: "insertions" });
    const boxes = computeRevisionMarkup(cellSnapshot(merge), state);
    expect(boxes.map((box) => box.type)).toEqual(["merge"]);
    const hidden = setMarkupAuthors(rawState(), ["Someone else"]);
    expect(computeRevisionMarkup(cellSnapshot(merge), hidden)).toHaveLength(0);
  });
});
