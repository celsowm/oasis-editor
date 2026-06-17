// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { importHtmlToEditorDocument } from "@/import/html/importHtmlToEditorDocument.js";
import { htmlImporter } from "@/import/html/htmlImporter.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { getDocumentParagraphs, getParagraphText } from "@/core/model.js";
import { getDocumentTables } from "./docxTestHelpers.js";

describe("HTML import — paragraphs and inline formatting", () => {
  it("imports paragraphs as separate blocks", () => {
    const doc = importHtmlToEditorDocument(
      "<p>First paragraph</p><p>Second paragraph</p>",
    );
    const paragraphs = getDocumentParagraphs(doc);
    expect(paragraphs).toHaveLength(2);
    expect(getParagraphText(paragraphs[0]!)).toBe("First paragraph");
    expect(getParagraphText(paragraphs[1]!)).toBe("Second paragraph");
  });

  it("maps semantic tags to text styles", () => {
    const doc = importHtmlToEditorDocument(
      "<p><strong>bold</strong> <em>italic</em> <u>under</u> <s>strike</s></p>",
    );
    const runs = getDocumentParagraphs(doc)[0]!.runs;
    const byText = (text: string) => runs.find((run) => run.text === text);
    expect(byText("bold")?.styles?.bold).toBe(true);
    expect(byText("italic")?.styles?.italic).toBe(true);
    expect(byText("under")?.styles?.underline).toBe(true);
    expect(byText("strike")?.styles?.strike).toBe(true);
  });

  it("reads inline CSS color and font size", () => {
    const doc = importHtmlToEditorDocument(
      '<p><span style="color: rgb(255, 0, 0); font-size: 24px">red</span></p>',
    );
    const run = getDocumentParagraphs(doc)[0]!.runs[0]!;
    expect(run.styles?.color).toBe("rgb(255, 0, 0)");
    expect(run.styles?.fontSize).toBe(24);
  });

  it("imports hyperlinks", () => {
    const doc = importHtmlToEditorDocument(
      '<p><a href="https://example.com">link</a></p>',
    );
    const run = getDocumentParagraphs(doc)[0]!.runs[0]!;
    expect(run.styles?.link).toBe("https://example.com");
    expect(run.styles?.underline).toBe(true);
  });

  it("maps headings to heading styles", () => {
    const doc = importHtmlToEditorDocument("<h1>Title</h1><h2>Subtitle</h2>");
    const paragraphs = getDocumentParagraphs(doc);
    expect(paragraphs[0]!.style?.styleId).toBe("heading1");
    expect(paragraphs[1]!.style?.styleId).toBe("heading2");
  });

  it("reads the document title into metadata", () => {
    const doc = importHtmlToEditorDocument(
      "<html><head><title>My Doc</title></head><body><p>Hi</p></body></html>",
    );
    expect(doc.metadata?.title).toBe("My Doc");
  });
});

describe("HTML import — lists", () => {
  it("imports unordered and ordered lists with list metadata", () => {
    const doc = importHtmlToEditorDocument(
      "<ul><li>a</li><li>b</li></ul><ol><li>c</li></ol>",
    );
    const paragraphs = getDocumentParagraphs(doc);
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]!.list?.kind).toBe("bullet");
    expect(paragraphs[1]!.list?.kind).toBe("bullet");
    expect(paragraphs[2]!.list?.kind).toBe("ordered");
  });

  it("tracks nesting level for nested lists", () => {
    const doc = importHtmlToEditorDocument(
      "<ul><li>outer<ul><li>inner</li></ul></li></ul>",
    );
    const paragraphs = getDocumentParagraphs(doc);
    expect(paragraphs[0]!.list?.level).toBe(0);
    expect(paragraphs[1]!.list?.level).toBe(1);
    expect(getParagraphText(paragraphs[1]!)).toContain("inner");
  });
});

describe("HTML import — images", () => {
  it("imports inline images as image runs", () => {
    const doc = importHtmlToEditorDocument(
      '<p><img src="data:image/png;base64,AAAA" width="120" height="80" alt="pic"></p>',
    );
    const run = getDocumentParagraphs(doc)[0]!.runs.find((r) => r.image);
    expect(run?.image?.src).toBe("data:image/png;base64,AAAA");
    expect(run?.image?.width).toBe(120);
    expect(run?.image?.height).toBe(80);
    expect(run?.image?.alt).toBe("pic");
  });
});

describe("HTML import — tables", () => {
  it("imports a table with rows, cells and header detection", () => {
    const doc = importHtmlToEditorDocument(
      "<table><thead><tr><th>H1</th><th>H2</th></tr></thead>" +
        "<tbody><tr><td>a</td><td>b</td></tr></tbody></table>",
    );
    const table = getDocumentTables(doc)[0]!;
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]!.isHeader).toBe(true);
    expect(table.rows[1]!.isHeader).toBeUndefined();
    expect(table.rows[0]!.cells).toHaveLength(2);
    expect(getParagraphText(table.rows[1]!.cells[0]!.blocks[0]!)).toBe("a");
  });

  it("honours colspan and rowspan", () => {
    const doc = importHtmlToEditorDocument(
      '<table><tr><td colspan="2">wide</td></tr>' +
        '<tr><td rowspan="2">tall</td><td>x</td></tr></table>',
    );
    const table = getDocumentTables(doc)[0]!;
    expect(table.rows[0]!.cells[0]!.colSpan).toBe(2);
    expect(table.rows[1]!.cells[0]!.rowSpan).toBe(2);
  });
});

describe("HTML importer adapter", () => {
  it("matches by extension and decodes the buffer", async () => {
    expect(htmlImporter.matches({ name: "a.html" } as File)).toBe(true);
    expect(htmlImporter.matches({ name: "a.htm" } as File)).toBe(true);
    expect(htmlImporter.matches({ name: "a.docx" } as File)).toBe(false);

    const bytes = new TextEncoder().encode("<p>hello</p>");
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const doc = await htmlImporter.import(buffer);
    expect(getParagraphText(getDocumentParagraphs(doc)[0]!)).toBe("hello");
  });
});

describe("HTML import — round-trip through DOCX", () => {
  it("preserves text and tables when exported to DOCX and re-imported", async () => {
    const doc = importHtmlToEditorDocument(
      "<h1>Heading</h1><p>Body text</p>" +
        "<table><tr><td>cell</td></tr></table>",
    );
    const docx = await exportEditorDocumentToDocx(doc);
    const reimported = await importDocxToEditorDocument(docx);

    const text = getDocumentParagraphs(reimported)
      .map((p) => getParagraphText(p))
      .join("\n");
    expect(text).toContain("Heading");
    expect(text).toContain("Body text");
    expect(getDocumentTables(reimported)).toHaveLength(1);
  });
});
