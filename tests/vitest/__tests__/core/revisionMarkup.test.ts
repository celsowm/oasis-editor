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

/** Real table document whose cells carry the revisions in `cells`. */
function tableState(
  cells: CellSpec[],
): ReturnType<typeof createEditorStateFromDocument> {
  const maxRowIndex = Math.max(...cells.map((cell) => cell.rowIndex));
  // Keep every row index 0..max so array position equals the document row
  // index the canvas snapshot reports (empty rows stand in for gaps).
  const rows = Array.from({ length: maxRowIndex + 1 }, (_, rowIndex) => ({
    id: `row-${rowIndex}`,
    cells: cells
      .filter((cell) => cell.rowIndex === rowIndex)
      .sort((left, right): number => left.cellIndex - right.cellIndex)
      .map((cell) => ({
        id: `cell-${cell.rowIndex}-${cell.cellIndex}`,
        blocks: [
          {
            id: cell.paragraphId,
            type: "paragraph",
            runs: [
              {
                id: `${cell.paragraphId}-r`,
                kind: "text",
                text: "plain",
              },
            ],
          },
        ],
        style:
          cell.type === "property"
            ? {
                propertyRevision: {
                  id: cell.revisionId,
                  type: "property",
                  author: cell.author,
                  date: 1,
                  previous: {},
                },
              }
            : {
                revision: {
                  id: cell.revisionId,
                  type: cell.type,
                  author: cell.author,
                  date: 1,
                },
              },
      })),
  }));
  const document = {
    id: "doc",
    sections: [
      {
        id: "s1",
        pageSettings: pageSettings(),
        blocks: [{ id: "t1", type: "table", rows }],
      },
    ],
  } as unknown as EditorDocument;
  return createEditorStateFromDocument(document);
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
  const rawState = () => tableState(cells);

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
    const state = applyShowMarkup(tableState(merge), {
      section: "insertions",
    });
    const boxes = computeRevisionMarkup(cellSnapshot(merge), state);
    expect(boxes.map((box) => box.type)).toEqual(["merge"]);
    const hidden = setMarkupAuthors(tableState(merge), ["Someone else"]);
    expect(computeRevisionMarkup(cellSnapshot(merge), hidden)).toHaveLength(0);
  });
});

describe("computeRevisionMarkup row/table revisions", () => {
  const fourCells: CellSpec[] = [
    [0, 0, 100, 100],
    [0, 1, 180, 100],
    [1, 0, 100, 120],
    [1, 1, 180, 120],
  ].map(([rowIndex, cellIndex, left, top], index) => ({
    paragraphId: `p${index}`,
    rowIndex,
    cellIndex,
    revisionId: `unused-${index}`,
    type: "insert" as const,
    author: "A",
    left,
    top,
    width: 80,
    height: 20,
  }));

  const scopedState = () => {
    const paragraphBlock = (id: string) => ({
      id,
      type: "paragraph",
      runs: [{ id: `${id}-r`, kind: "text", text: "x" }],
    });
    const plainCell = (id: string, paragraphId: string) => ({
      id,
      blocks: [paragraphBlock(paragraphId)],
    });
    const document = {
      id: "doc",
      sections: [
        {
          id: "s1",
          pageSettings: pageSettings(),
          blocks: [
            {
              id: "t1",
              type: "table",
              style: {
                revision: {
                  id: "table-prop",
                  type: "property",
                  author: "A",
                  date: 1,
                  previous: {},
                },
              },
              gridRevision: {
                id: "grid-rev",
                type: "grid",
                author: "A",
                date: 2,
                previous: [],
              },
              rows: [
                {
                  id: "row0",
                  cells: [plainCell("c0", "p0"), plainCell("c1", "p1")],
                },
                {
                  id: "row1",
                  style: {
                    revision: {
                      id: "row-ins",
                      type: "insert",
                      author: "A",
                      date: 3,
                    },
                  },
                  cells: [plainCell("c2", "p2"), plainCell("c3", "p3")],
                },
              ],
            },
          ],
        },
      ],
    } as unknown as EditorDocument;
    return createEditorStateFromDocument(document);
  };

  it("unions a row's cells and the whole table into their own outlines", () => {
    const boxes = computeRevisionMarkup(cellSnapshot(fourCells), scopedState());
    expect(boxes).toHaveLength(3);
    const byId = new Map(boxes.map((box) => [box.revisionId, box]));
    // Table + grid span all four cells: left 100..260, top 100..140.
    expect(byId.get("table-prop")).toEqual({
      revisionId: "table-prop",
      type: "property",
      variant: "cell",
      left: 100,
      top: 100,
      width: 160,
      height: 40,
    });
    expect(byId.get("grid-rev")).toMatchObject({ type: "grid", width: 160 });
    // Row 1 spans only its two cells: top 120..140.
    expect(byId.get("row-ins")).toEqual({
      revisionId: "row-ins",
      type: "insert",
      variant: "cell",
      left: 100,
      top: 120,
      width: 160,
      height: 20,
    });
  });

  it("hides a row outline when its category is off", () => {
    const state = applyShowMarkup(scopedState(), { section: "insertions" });
    const ids = computeRevisionMarkup(cellSnapshot(fourCells), state).map(
      (box) => box.revisionId,
    );
    expect(ids).not.toContain("row-ins");
    expect(ids).toContain("table-prop");
  });

  it("hides table property but keeps grid when Formatting is off", () => {
    const state = applyShowMarkup(scopedState(), { section: "formatting" });
    const ids = computeRevisionMarkup(cellSnapshot(fourCells), state).map(
      (box) => box.revisionId,
    );
    expect(ids).not.toContain("table-prop");
    expect(ids).toContain("grid-rev");
  });
});

describe("computeRevisionMarkup section-level revisions", () => {
  /** A document whose first section carries a `w:sectPrChange` revision. */
  const sectionState = () => {
    const document = {
      id: "doc",
      sections: [
        {
          id: "s1",
          pageSettings: pageSettings(),
          blocks: [
            paragraph("a", [textRun("a-r", "AAAA")]),
            paragraph("b", [textRun("b-r", "BBBB")]),
            paragraph("c", [textRun("c-r", "CCCC")]),
          ],
          propertyRevision: {
            id: "sect-rev",
            type: "property",
            author: "Section author",
            date: 1,
            previous: { pageSettings: pageSettings() },
          },
        },
      ],
    } as unknown as EditorDocument;
    return createEditorStateFromDocument(document);
  };

  /** Three plain paragraphs spread over two pages. */
  const sectionSnapshot = () => {
    const base = buildSnapshot(paragraph("a", [textRun("a-r", "AAAA")]));
    const specs = [
      {
        paragraphId: "a",
        pageIndex: 0,
        left: 100,
        top: 100,
        width: 200,
        height: 20,
      },
      {
        paragraphId: "b",
        pageIndex: 0,
        left: 140,
        top: 140,
        width: 240,
        height: 20,
      },
      {
        paragraphId: "c",
        pageIndex: 1,
        left: 100,
        top: 200,
        width: 200,
        height: 20,
      },
    ];
    const paragraphs = specs.map((s) => ({
      ...(base.paragraphs[0] as object),
      paragraphId: s.paragraphId,
      pageIndex: s.pageIndex,
      left: s.left,
      top: s.top,
      width: s.width,
      height: s.height,
    }));
    return { ...base, paragraphs } as unknown as CanvasLayoutSnapshot;
  };

  it("paints one section outline per page as the union of its paragraphs", () => {
    const boxes = computeRevisionMarkup(sectionSnapshot(), sectionState());
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toEqual({
      revisionId: "sect-rev",
      type: "property",
      variant: "section",
      left: 100,
      top: 100,
      width: 280,
      height: 60,
    });
    expect(boxes[1]).toMatchObject({
      revisionId: "sect-rev",
      variant: "section",
      left: 100,
      top: 200,
      width: 200,
      height: 20,
    });
  });

  it("hides the section outline when the Formatting category is off", () => {
    const state = applyShowMarkup(sectionState(), { section: "formatting" });
    expect(computeRevisionMarkup(sectionSnapshot(), state)).toHaveLength(0);
  });

  it("hides the section outline when the reviewer is filtered out", () => {
    const state = setMarkupAuthors(sectionState(), ["Someone else"]);
    expect(computeRevisionMarkup(sectionSnapshot(), state)).toHaveLength(0);
  });

  it("paints nothing when no section is revised", () => {
    const plain = createEditorStateFromDocument({
      id: "doc",
      sections: [
        {
          id: "s1",
          pageSettings: pageSettings(),
          blocks: [paragraph("a", [textRun("a-r", "AAAA")])],
        },
      ],
    } as unknown as EditorDocument);
    expect(computeRevisionMarkup(sectionSnapshot(), plain)).toHaveLength(0);
  });
});
