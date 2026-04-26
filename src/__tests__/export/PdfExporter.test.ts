import { describe, it, expect } from "vitest";
import { PdfExporter } from "../../engine/export/PdfExporter.js";
import { DefaultFontManager } from "../../core/typography/FontManager.js";
import { createDocument, createParagraph, createHeading, createTextRun } from "../../core/document/DocumentFactory.js";
import { DocumentModel } from "../../core/document/DocumentTypes.js";

describe("PdfExporter", () => {
  const fontManager = new DefaultFontManager();
  const exporter = new PdfExporter(fontManager);

  it("should export a simple document to a Blob", async () => {
    const doc = createDocument();
    const blob = await exporter.exportToBlob(doc);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
  });

  it("should export a simple document to an ArrayBuffer", async () => {
    const doc = createDocument();
    const buffer = await exporter.exportToBuffer(doc);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("should export formatted text (bold, italic, underline, color)", async () => {
    const doc: DocumentModel = {
      id: "doc:test",
      revision: 0,
      metadata: { title: "Formatted", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [
        {
          id: "sec:1",
          pageTemplateId: "template:a4:default",
          margins: { top: 96, right: 96, bottom: 96, left: 96 },
          orientation: "portrait",
          breakPolicy: { startOnNewPage: false, startOnOddPage: false },
          children: [
            {
              id: "p:1",
              kind: "paragraph" as const,
              align: "left" as const,
              children: [
                createTextRun("Bold ", { bold: true }),
                createTextRun("Italic ", { italic: true }),
                createTextRun("Underline ", { underline: true }),
                createTextRun("Red", { color: "#FF0000" }),
              ],
            },
          ],
        },
      ],
    };

    const blob = await exporter.exportToBlob(doc);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("should export headings", async () => {
    const doc: DocumentModel = {
      id: "doc:test",
      revision: 0,
      metadata: { title: "Headings", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [
        {
          id: "sec:1",
          pageTemplateId: "template:a4:default",
          margins: { top: 96, right: 96, bottom: 96, left: 96 },
          orientation: "portrait",
          breakPolicy: { startOnNewPage: false, startOnOddPage: false },
          children: [
            createHeading("Heading 1", 1),
            createHeading("Heading 2", 2),
            createHeading("Heading 3", 3),
          ],
        },
      ],
    };

    const blob = await exporter.exportToBlob(doc);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("should export bullet and numbered lists", async () => {
    const doc: DocumentModel = {
      id: "doc:test",
      revision: 0,
      metadata: { title: "Lists", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [
        {
          id: "sec:1",
          pageTemplateId: "template:a4:default",
          margins: { top: 96, right: 96, bottom: 96, left: 96 },
          orientation: "portrait",
          breakPolicy: { startOnNewPage: false, startOnOddPage: false },
          children: [
            {
              id: "li:1",
              kind: "list-item" as const,
              align: "left" as const,
              children: [createTextRun("Bullet 1")],
            },
            {
              id: "li:2",
              kind: "list-item" as const,
              align: "left" as const,
              children: [createTextRun("Bullet 2")],
            },
            {
              id: "oli:1",
              kind: "ordered-list-item" as const,
              align: "left" as const,
              index: 1,
              children: [createTextRun("Numbered 1")],
            },
            {
              id: "oli:2",
              kind: "ordered-list-item" as const,
              align: "left" as const,
              index: 2,
              children: [createTextRun("Numbered 2")],
            },
          ],
        },
      ],
    };

    const blob = await exporter.exportToBlob(doc);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("should export tables", async () => {
    const doc: DocumentModel = {
      id: "doc:test",
      revision: 0,
      metadata: { title: "Tables", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [
        {
          id: "sec:1",
          pageTemplateId: "template:a4:default",
          margins: { top: 96, right: 96, bottom: 96, left: 96 },
          orientation: "portrait",
          breakPolicy: { startOnNewPage: false, startOnOddPage: false },
          children: [
            {
              id: "tbl:1",
              kind: "table" as const,
              columnWidths: [200, 200],
              rows: [
                {
                  id: "tr:1",
                  kind: "table-row" as const,
                  cells: [
                    {
                      id: "tc:1",
                      kind: "table-cell" as const,
                      children: [createParagraph("Cell 1")],
                    },
                    {
                      id: "tc:2",
                      kind: "table-cell" as const,
                      children: [createParagraph("Cell 2")],
                    },
                  ],
                },
                {
                  id: "tr:2",
                  kind: "table-row" as const,
                  cells: [
                    {
                      id: "tc:3",
                      kind: "table-cell" as const,
                      children: [createParagraph("Cell 3")],
                    },
                    {
                      id: "tc:4",
                      kind: "table-cell" as const,
                      children: [createParagraph("Cell 4")],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exporter.exportToBlob(doc);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("should export images from data URIs", async () => {
    const transparentPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    const doc: DocumentModel = {
      id: "doc:test",
      revision: 0,
      metadata: { title: "Images", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [
        {
          id: "sec:1",
          pageTemplateId: "template:a4:default",
          margins: { top: 96, right: 96, bottom: 96, left: 96 },
          orientation: "portrait",
          breakPolicy: { startOnNewPage: false, startOnOddPage: false },
          children: [
            {
              id: "img:1",
              kind: "image" as const,
              src: transparentPng,
              naturalWidth: 1,
              naturalHeight: 1,
              width: 100,
              height: 100,
              align: "center" as const,
              alt: "Test image",
            },
          ],
        },
      ],
    };

    const blob = await exporter.exportToBlob(doc);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("should export headers and footers", async () => {
    const doc: DocumentModel = {
      id: "doc:test",
      revision: 0,
      metadata: { title: "HeaderFooter", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [
        {
          id: "sec:1",
          pageTemplateId: "template:a4:default",
          margins: { top: 96, right: 96, bottom: 96, left: 96 },
          orientation: "portrait",
          breakPolicy: { startOnNewPage: false, startOnOddPage: false },
          children: [createParagraph("Main content")],
          header: [createParagraph("Header text")],
          footer: [createParagraph("Footer text")],
        },
      ],
    };

    const blob = await exporter.exportToBlob(doc);
    expect(blob.size).toBeGreaterThan(0);
  });
});
