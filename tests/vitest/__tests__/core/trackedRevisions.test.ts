import { describe, expect, it } from "vitest";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorPageSettings,
  EditorParagraphNode,
  EditorTableNode,
  EditorTextRun,
} from "@/core/model.js";
import {
  projectTrackedRevisions,
  resolveAllTrackedRevisions,
  resolveTrackedRevision,
} from "@/core/document/trackedRevisions.js";

function pageSettings(width = 816, height = 1056): EditorPageSettings {
  return {
    width,
    height,
    orientation: width > height ? "landscape" : "portrait",
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
  extra: Partial<EditorTextRun> = {},
): EditorTextRun {
  return { id, kind: "text", text, ...extra } as EditorTextRun;
}

function paragraph(
  id: string,
  runs: EditorTextRun[],
  extra: Partial<EditorParagraphNode> = {},
): EditorParagraphNode {
  return { id, type: "paragraph", runs, ...extra };
}

function documentWithBlocks(blocks: EditorBlockNode[]): EditorDocument {
  return {
    id: "doc",
    sections: [{ id: "s1", blocks, pageSettings: pageSettings() }],
  };
}

describe("tracked revision resolver", () => {
  it("projects run insertions/deletions and remaps bookmark/comment offsets", () => {
    const p = paragraph("p1", [
      textRun("a", "A", {
        styles: {
          bold: true,
          propertyRevision: {
            id: "rpr",
            type: "property",
            author: "A",
            date: 1,
            previous: { italic: true },
          },
        },
      }),
      textRun("i", "BC", {
        revision: { id: "ins", type: "insert", author: "A", date: 2 },
      }),
      textRun("d", "D", {
        revision: { id: "del", type: "delete", author: "A", date: 3 },
      }),
      textRun("e", "E"),
    ], {
      style: {
        align: "right",
        propertyRevision: {
          id: "ppr",
          type: "property",
          author: "A",
          date: 4,
          previous: { align: "left" },
        },
      },
    });
    const source: EditorDocument = {
      ...documentWithBlocks([p]),
      bookmarks: {
        order: ["bm"],
        items: {
          bm: {
            id: "bm",
            name: "bm",
            start: { paragraphId: "p1", offset: 3 },
            end: { paragraphId: "p1", offset: 5 },
          },
        },
      },
      comments: {
        order: ["c"],
        items: {
          c: {
            id: "c",
            author: "A",
            text: "comment",
            start: { paragraphId: "p1", offset: 3 },
            end: { paragraphId: "p1", offset: 4 },
          },
        },
      },
    };

    const finalResult = projectTrackedRevisions(source, "final");
    const finalParagraph = finalResult.document.sections![0]!
      .blocks[0] as EditorParagraphNode;
    expect(finalResult.complete).toBe(true);
    expect(finalParagraph.runs.map((run) => run.text).join("")).toBe("ABCE");
    expect(finalParagraph.runs.every((run) => !run.revision)).toBe(true);
    expect(finalParagraph.runs[0]!.styles).toMatchObject({ bold: true });
    expect(finalParagraph.runs[0]!.styles?.propertyRevision).toBeUndefined();
    expect(finalParagraph.style).toMatchObject({ align: "right" });
    expect(finalParagraph.style?.propertyRevision).toBeUndefined();
    expect(finalResult.document.bookmarks!.items.bm!.end?.offset).toBe(4);
    expect(finalResult.document.comments!.items.c!.start?.offset).toBe(3);
    expect(finalResult.document.comments!.items.c!.end?.offset).toBe(3);

    const originalResult = projectTrackedRevisions(source, "original");
    const originalParagraph = originalResult.document.sections![0]!
      .blocks[0] as EditorParagraphNode;
    expect(originalResult.complete).toBe(true);
    expect(originalParagraph.runs.map((run) => run.text).join("")).toBe("ADE");
    expect(originalParagraph.runs[0]!.styles).toMatchObject({ italic: true });
    expect(originalParagraph.runs[0]!.styles?.bold).toBeUndefined();
    expect(originalParagraph.style).toMatchObject({ align: "left" });
    expect(originalResult.document.bookmarks!.items.bm!.end?.offset).toBe(3);

    expect(source.sections![0]!.blocks[0]).toBe(p);
    expect(p.runs.map((run) => run.text).join("")).toBe("ABCDE");
  });

  it("rejects exact section/table property and grid revisions", () => {
    const table: EditorTableNode = {
      id: "t1",
      type: "table",
      gridCols: [20, 20],
      gridRevision: {
        id: "grid",
        type: "grid",
        author: "A",
        date: 1,
        previous: [10, 30],
      },
      style: {
        width: 200,
        revision: {
          id: "tbl",
          type: "property",
          author: "A",
          date: 2,
          previous: { width: 100 },
        },
      },
      rows: [
        {
          id: "row",
          style: {
            hidden: true,
            propertyRevision: {
              id: "tr",
              type: "property",
              author: "A",
              date: 3,
              previous: { hidden: false },
            },
          },
          cells: [
            {
              id: "cell",
              blocks: [paragraph("inside", [textRun("inside-run", "x")])],
              style: {
                shading: "FF0000",
                propertyRevision: {
                  id: "tc",
                  type: "property",
                  author: "A",
                  date: 4,
                  previous: { shading: "0000FF" },
                },
              },
            },
          ],
        },
      ],
    };
    const source: EditorDocument = {
      id: "doc",
      sections: [
        {
          id: "s1",
          blocks: [table],
          pageSettings: pageSettings(800, 1000),
          propertyRevision: {
            id: "sect",
            type: "property",
            author: "A",
            date: 5,
            previous: {
              pageSettings: pageSettings(1000, 800),
              pageNumbering: { start: 7, format: "upperRoman" },
              verticalAlignment: "center",
              bidi: true,
              nextBreakType: "continuous",
            },
          },
        },
        {
          id: "s2",
          blocks: [paragraph("p2", [textRun("p2r", "second")])],
          pageSettings: pageSettings(),
          breakType: "oddPage",
        },
      ],
    };

    const result = resolveAllTrackedRevisions(source, "reject");
    expect(result.complete).toBe(true);
    expect(new Set(result.resolvedRevisionIds)).toEqual(
      new Set(["grid", "tbl", "tr", "tc", "sect"]),
    );

    const firstSection = result.document.sections![0]!;
    const secondSection = result.document.sections![1]!;
    expect(firstSection.pageSettings.width).toBe(1000);
    expect(firstSection.pageSettings.orientation).toBe("landscape");
    expect(firstSection.pageNumbering).toMatchObject({
      start: 7,
      format: "upperRoman",
    });
    expect(firstSection.verticalAlignment).toBe("center");
    expect(firstSection.bidi).toBe(true);
    expect(firstSection.propertyRevision).toBeUndefined();
    expect(secondSection.breakType).toBe("continuous");

    const nextTable = firstSection.blocks[0] as EditorTableNode;
    expect(nextTable.gridCols).toEqual([10, 30]);
    expect(nextTable.gridRevision).toBeUndefined();
    expect(nextTable.style?.width).toBe(100);
    expect(nextTable.style?.revision).toBeUndefined();
    expect(nextTable.rows[0]!.style?.hidden).toBe(false);
    expect(nextTable.rows[0]!.style?.propertyRevision).toBeUndefined();
    expect(nextTable.rows[0]!.cells[0]!.style?.shading).toBe("0000FF");
    expect(
      nextTable.rows[0]!.cells[0]!.style?.propertyRevision,
    ).toBeUndefined();
  });

  it("accepts numbering metadata but reports original numbering as incomplete", () => {
    const p = paragraph("p", [textRun("r", "numbered")], {
      numberingRevision: {
        id: "num",
        author: "A",
        date: 1,
        original: "3.",
      },
    });
    const source = documentWithBlocks([p]);

    const finalResult = projectTrackedRevisions(source, "final");
    const finalParagraph = finalResult.document.sections![0]!
      .blocks[0] as EditorParagraphNode;
    expect(finalResult.complete).toBe(true);
    expect(finalParagraph.numberingRevision).toBeUndefined();

    const originalResult = projectTrackedRevisions(source, "original");
    expect(originalResult.complete).toBe(false);
    expect(originalResult.changed).toBe(false);
    expect(originalResult.unresolved).toEqual([
      expect.objectContaining({
        kind: "numbering-original-unavailable",
        revisionId: "num",
      }),
    ]);
  });

  it("resolves a single revision id without touching its neighbors", () => {
    const source = documentWithBlocks([
      paragraph("p", [
        textRun("i1", "one", {
          revision: { id: "i1", type: "insert", author: "A", date: 1 },
        }),
        textRun("i2", "two", {
          revision: { id: "i2", type: "insert", author: "A", date: 2 },
        }),
      ]),
    ]);

    const result = resolveTrackedRevision(source, "i1", "reject");
    const p = result.document.sections![0]!.blocks[0] as EditorParagraphNode;
    expect(p.runs.map((run) => run.text)).toEqual(["two"]);
    expect(p.runs[0]!.revision?.id).toBe("i2");
    expect(result.resolvedRevisionIds).toEqual(["i1"]);

    const missing = resolveTrackedRevision(source, "missing", "accept");
    expect(missing.complete).toBe(false);
    expect(missing.changed).toBe(false);
    expect(missing.unresolved[0]).toMatchObject({
      kind: "revision-not-found",
      revisionId: "missing",
    });
  });

  it("removes accepted deleted rows and relocates anchors to the nearest survivor", () => {
    const table: EditorTableNode = {
      id: "t",
      type: "table",
      rows: [
        {
          id: "before-row",
          cells: [{ id: "before-cell", blocks: [paragraph("before-p", [textRun("before-r", "before")])] }],
        },
        {
          id: "deleted-row",
          style: {
            revision: { id: "row-del", type: "delete", author: "A", date: 1 },
          },
          cells: [{ id: "deleted-cell", blocks: [paragraph("deleted-p", [textRun("deleted-r", "deleted")])] }],
        },
        {
          id: "after-row",
          cells: [{ id: "after-cell", blocks: [paragraph("after-p", [textRun("after-r", "after")])] }],
        },
      ],
    };
    const source: EditorDocument = {
      ...documentWithBlocks([table]),
      bookmarks: {
        order: ["inside", "after"],
        items: {
          inside: {
            id: "inside",
            name: "inside",
            start: { paragraphId: "deleted-p", offset: 2 },
            end: { paragraphId: "deleted-p", offset: 5 },
          },
          after: {
            id: "after",
            name: "after",
            start: { paragraphId: "after-p", offset: 2 },
            end: { paragraphId: "after-p", offset: 4 },
          },
        },
      },
      comments: {
        order: ["c"],
        items: {
          c: {
            id: "c",
            author: "A",
            text: "inside removed row",
            start: { paragraphId: "deleted-p", offset: 1 },
            end: { paragraphId: "deleted-p", offset: 6 },
          },
        },
      },
    };

    const result = projectTrackedRevisions(source, "final");
    expect(result.complete).toBe(true);
    expect(result.unresolved).toEqual([]);
    const nextTable = result.document.sections![0]!.blocks[0] as EditorTableNode;
    expect(nextTable.rows.map((row) => row.id)).toEqual(["before-row", "after-row"]);
    expect(result.resolvedRevisionIds).toContain("row-del");
    expect(result.document.bookmarks!.items.inside!.start).toMatchObject({
      paragraphId: "before-p", offset: 6,
    });
    expect(result.document.bookmarks!.items.inside!.end).toMatchObject({
      paragraphId: "before-p", offset: 6,
    });
    expect(result.document.bookmarks!.items.after!.start).toMatchObject({
      paragraphId: "after-p", offset: 2,
    });
    expect(result.document.comments!.items.c!.start).toMatchObject({
      paragraphId: "before-p", offset: 6,
    });
    expect(source.sections![0]!.blocks[0]).toBe(table);
    expect(table.rows).toHaveLength(3);
  });

  it("removes rejected inserted cells and relocates their anchors", () => {
    const table: EditorTableNode = {
      id: "t",
      type: "table",
      rows: [{
        id: "row",
        cells: [
          { id: "left", blocks: [paragraph("left-p", [textRun("left-r", "left")])] },
          {
            id: "inserted",
            style: { revision: { id: "cell-ins", type: "insert", author: "A", date: 1 } },
            blocks: [paragraph("inserted-p", [textRun("inserted-r", "inserted")])],
          },
          { id: "right", blocks: [paragraph("right-p", [textRun("right-r", "right")])] },
        ],
      }],
    };
    const source: EditorDocument = {
      ...documentWithBlocks([table]),
      bookmarks: {
        order: ["inside"],
        items: {
          inside: {
            id: "inside",
            name: "inside",
            start: { paragraphId: "inserted-p", offset: 3 },
            end: { paragraphId: "inserted-p", offset: 7 },
          },
        },
      },
    };

    const result = projectTrackedRevisions(source, "original");
    expect(result.complete).toBe(true);
    const nextTable = result.document.sections![0]!.blocks[0] as EditorTableNode;
    expect(nextTable.rows[0]!.cells.map((cell) => cell.id)).toEqual(["left", "right"]);
    expect(result.document.bookmarks!.items.inside!.start).toMatchObject({
      paragraphId: "left-p", offset: 4,
    });
    expect(result.document.bookmarks!.items.inside!.end).toMatchObject({
      paragraphId: "left-p", offset: 4,
    });
  });
});
