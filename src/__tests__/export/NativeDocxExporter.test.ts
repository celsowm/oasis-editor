import { describe, it, expect } from "vitest";
import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { NativeDocxExporter } from "../../engine/export/NativeDocxExporter.js";
import { NativeDocxImporter } from "../../engine/import/NativeDocxImporter.js";
import {
  createParagraph,
  createHeading,
  createTextRun,
  createTable,
  createTableRow,
  createTableCell,
  createPageBreak,
  createEquation,
  createChart,
} from "../../core/document/DocumentFactory.js";
import { createSection } from "../../core/document/DocumentFactory.js";

describe("NativeDocx round-trip", () => {
  const roundTrip = async (doc: DocumentModel): Promise<DocumentModel> => {
    const exporter = new NativeDocxExporter();
    const buffer = await exporter.exportToBuffer(doc);
    const importer = new NativeDocxImporter();
    return importer.importFromBuffer(buffer);
  };

  it("should round-trip a simple paragraph", async () => {
    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([createParagraph("Hello world")])],
    };

    const imported = await roundTrip(doc);
    expect(imported.sections.length).toBe(1);
    const blocks = imported.sections[0].children;
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(blocks[0].kind).toBe("paragraph");
    expect((blocks[0] as any).children[0].text).toBe("Hello world");
  });

  it("should round-trip formatted text", async () => {
    const p = createParagraph("");
    p.children = [
      createTextRun("Bold ", { bold: true }),
      createTextRun("italic", { italic: true }),
    ];

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("paragraph");
    const children = (blocks[0] as any).children;
    expect(children.length).toBe(2);
    expect(children[0].marks.bold).toBe(true);
    expect(children[1].marks.italic).toBe(true);
  });

  it("should round-trip a heading", async () => {
    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([createHeading("Title", 1)])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("heading");
    expect((blocks[0] as any).level).toBe(1);
  });

  it("should round-trip a table", async () => {
    const table = createTable(1, 2);
    const row = createTableRow(2);
    row.cells = [
      createTableCell([createParagraph("A")]),
      createTableCell([createParagraph("B")]),
    ];
    table.rows = [row];

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([table])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    const tbl = blocks.find((b) => b.kind === "table") as any;
    expect(tbl).toBeDefined();
    expect(tbl.rows.length).toBe(1);
    expect(tbl.rows[0].cells.length).toBe(2);
  });

  it("should round-trip a page break", async () => {
    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([createParagraph("Before"), createPageBreak(), createParagraph("After")])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    const hasPageBreak = blocks.some((b) => b.kind === "page-break");
    expect(hasPageBreak).toBe(true);
  });

  it("should round-trip a bullet list", async () => {
    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [
        createSection([
          {
            id: "li:1",
            kind: "list-item",
            align: "left",
            level: 0,
            listFormat: "bullet",
            children: [createTextRun("Item 1")],
          },
          {
            id: "li:2",
            kind: "list-item",
            align: "left",
            level: 0,
            listFormat: "bullet",
            children: [createTextRun("Item 2")],
          },
        ]),
      ],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks.length).toBe(2);
    expect(blocks[0].kind).toBe("list-item");
    expect(blocks[1].kind).toBe("list-item");
    expect((blocks[0] as any).listFormat).toBe("bullet");
  });

  it("should round-trip an ordered list", async () => {
    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [
        createSection([
          {
            id: "oli:1",
            kind: "ordered-list-item",
            align: "left",
            index: 1,
            level: 0,
            listFormat: "decimal",
            children: [createTextRun("First")],
          },
          {
            id: "oli:2",
            kind: "ordered-list-item",
            align: "left",
            index: 2,
            level: 0,
            listFormat: "decimal",
            children: [createTextRun("Second")],
          },
        ]),
      ],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks.length).toBe(2);
    expect(blocks[0].kind).toBe("ordered-list-item");
    expect(blocks[1].kind).toBe("ordered-list-item");
    expect((blocks[0] as any).listFormat).toBe("decimal");
  });

  it("should round-trip a page number field", async () => {
    const p = createParagraph("");
    p.children = [
      createTextRun("Page ", {}),
      { id: "run:field:1", text: "1", marks: {}, field: { type: "page", instruction: "PAGE \\* MERGEFORMAT" } },
    ];

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("paragraph");
    const children = (blocks[0] as any).children;
    expect(children.length).toBe(2);
    expect(children[1].field).toBeDefined();
    expect(children[1].field.type).toBe("page");
  });

  it("should round-trip paragraph style", async () => {
    const p = createParagraph("Styled text");
    p.styleId = "CustomStyle";

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("paragraph");
    expect((blocks[0] as any).styleId).toBe("CustomStyle");
  });

  it("should round-trip an equation block", async () => {
    const omml = `<m:oMath><m:r><m:t>E = mc^2</m:t></m:r><m:annotation encoding="application/x-tex">E = mc^2</m:annotation></m:oMath>`;
    const eq = createEquation("E = mc^2", true, undefined, omml);

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([eq])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    const eqBlock = blocks.find((b) => b.kind === "equation");
    expect(eqBlock).toBeDefined();
    expect((eqBlock as any).latex).toBe("E = mc^2");
    expect((eqBlock as any).display).toBe(true);
    expect((eqBlock as any).omml).toContain("<m:oMath>");
  });

  it("should export a chart placeholder without error", async () => {
    const chart = createChart("bar", "Sales 2024");

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([chart])],
    };

    const exporter = new NativeDocxExporter();
    const buffer = await exporter.exportToBuffer(doc);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);

    // After round-trip, chart becomes a paragraph placeholder (expected)
    const importer = new NativeDocxImporter();
    const imported = await importer.importFromBuffer(buffer);
    const blocks = imported.sections[0].children;
    const paraBlock = blocks.find((b) => b.kind === "paragraph");
    expect(paraBlock).toBeDefined();
    expect((paraBlock as any).children[0].text).toContain("bar chart");
  });

  it("should round-trip bookmarks in a paragraph", async () => {
    const p = createParagraph("Hello world");
    p.children[0].bookmarkStart = "StartBM";
    p.children[0].bookmarkEnd = "EndBM";

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("paragraph");
    const runs = (blocks[0] as any).children;
    const bmRun = runs.find((r: any) => r.bookmarkStart === "StartBM" || r.bookmarkEnd === "EndBM");
    expect(bmRun).toBeDefined();
  });

  it("should round-trip footnotes", async () => {
    const p = createParagraph("Hello world");
    p.children.push(createTextRun("", {}, undefined, undefined, undefined, undefined, "1"));

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
      footnotes: [{ id: "1", blocks: [createParagraph("Footnote text")] }],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("paragraph");
    const runs = (blocks[0] as any).children;
    const fnRun = runs.find((r: any) => r.footnoteId === "1");
    expect(fnRun).toBeDefined();
    expect(imported.footnotes).toBeDefined();
    expect(imported.footnotes!.length).toBe(1);
    expect(imported.footnotes![0].id).toBe("1");
    expect((imported.footnotes![0].blocks[0] as any).children[0].text).toBe("Footnote text");
  });

  it("should round-trip endnotes", async () => {
    const p = createParagraph("Hello world");
    p.children.push(createTextRun("", {}, undefined, undefined, undefined, undefined, undefined, "1"));

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
      endnotes: [{ id: "1", blocks: [createParagraph("Endnote text")] }],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("paragraph");
    const runs = (blocks[0] as any).children;
    const enRun = runs.find((r: any) => r.endnoteId === "1");
    expect(enRun).toBeDefined();
    expect(imported.endnotes).toBeDefined();
    expect(imported.endnotes!.length).toBe(1);
    expect(imported.endnotes![0].id).toBe("1");
    expect((imported.endnotes![0].blocks[0] as any).children[0].text).toBe("Endnote text");
  });

  it("should round-trip comments", async () => {
    const p = createParagraph("Hello world");
    p.children[0].commentId = "1";

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
      comments: [{ id: "1", author: "TestAuthor", blocks: [createParagraph("Comment text")] }],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("paragraph");
    const runs = (blocks[0] as any).children;
    const commentRun = runs.find((r: any) => r.commentId === "1");
    expect(commentRun).toBeDefined();
    expect(imported.comments).toBeDefined();
    expect(imported.comments!.length).toBe(1);
    expect(imported.comments![0].id).toBe("1");
    expect(imported.comments![0].author).toBe("TestAuthor");
    expect((imported.comments![0].blocks[0] as any).children[0].text).toBe("Comment text");
  });

  it("should round-track insertion revision", async () => {
    const p = createParagraph("Hello");
    p.children[0].revision = { type: "insert", author: "Alice", date: Date.now(), id: "rev-1" };

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("paragraph");
    const runs = (blocks[0] as any).children;
    expect(runs.length).toBe(1);
    expect(runs[0].text).toBe("Hello");
    expect(runs[0].revision).toBeDefined();
    expect(runs[0].revision.type).toBe("insert");
    expect(runs[0].revision.author).toBe("Alice");
    expect(runs[0].revision.id).toBe("rev-1");
  });

  it("should round-track deletion revision", async () => {
    const p = createParagraph("Goodbye");
    p.children[0].revision = { type: "delete", author: "Bob", date: Date.now(), id: "rev-2" };

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("paragraph");
    const runs = (blocks[0] as any).children;
    expect(runs.length).toBe(1);
    expect(runs[0].text).toBe("Goodbye");
    expect(runs[0].revision).toBeDefined();
    expect(runs[0].revision.type).toBe("delete");
    expect(runs[0].revision.author).toBe("Bob");
    expect(runs[0].revision.id).toBe("rev-2");
  });

  it("should round-trip tab characters", async () => {
    const p = createParagraph("A\tB");
    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
    };

    const imported = await roundTrip(doc);
    const runs = (imported.sections[0].children[0] as any).children;
    expect(runs[0].text).toBe("A\tB");
  });

  it("should round-trip soft hyphen and no-break hyphen", async () => {
    const p = createParagraph("A\u00ADB\u2011C");
    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
    };

    const imported = await roundTrip(doc);
    const runs = (imported.sections[0].children[0] as any).children;
    expect(runs[0].text).toBe("A\u00ADB\u2011C");
  });

  it("should round-trip header content", async () => {
    const section = createSection([createParagraph("Body text")]);
    section.header = [createParagraph("Header text")];

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [section],
    };

    const imported = await roundTrip(doc);
    expect(imported.sections[0].header).toBeDefined();
    expect(imported.sections[0].header!.length).toBe(1);
    expect((imported.sections[0].header![0] as any).children[0].text).toBe("Header text");
  });

  it("should round-trip footer content", async () => {
    const section = createSection([createParagraph("Body text")]);
    section.footer = [createParagraph("Footer text")];

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [section],
    };

    const imported = await roundTrip(doc);
    expect(imported.sections[0].footer).toBeDefined();
    expect(imported.sections[0].footer!.length).toBe(1);
    expect((imported.sections[0].footer![0] as any).children[0].text).toBe("Footer text");
  });
});
