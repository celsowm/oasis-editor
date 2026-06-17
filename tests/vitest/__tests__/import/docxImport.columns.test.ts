import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { projectDocumentLayout } from "@/layoutProjection/index.js";
import { getDocumentSections } from "@/core/model.js";

async function buildTwoColumnDocx(paragraphCount: number): Promise<ArrayBuffer> {
  const paragraphs = Array.from(
    { length: paragraphCount },
    (_, i) =>
      `<w:p><w:r><w:t>Paragraph number ${i + 1} with enough words to take up a full line in a narrow column.</w:t></w:r></w:p>`,
  ).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:num="2" w:space="708"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const zip = new JSZip();
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

async function readDocumentXml(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("Missing word/document.xml");
  return xml;
}

describe("DOCX two-column section", () => {
  it("parses w:cols into pageSettings.columns", async () => {
    const document = await importDocxToEditorDocument(
      await buildTwoColumnDocx(4),
    );
    const section = getDocumentSections(document)[0]!;
    expect(section.pageSettings.columns).toBeDefined();
    expect(section.pageSettings.columns?.count).toBe(2);
    // 708 twips = 708/1440 * 96px ≈ 47.2px
    expect(section.pageSettings.columns?.space).toBeGreaterThan(46);
    expect(section.pageSettings.columns?.space).toBeLessThan(48);
  });

  it("flows body blocks across two balanced columns", async () => {
    const document = await importDocxToEditorDocument(
      await buildTwoColumnDocx(12),
    );
    const layout = projectDocumentLayout(document);
    const firstPage = layout.pages[0]!;
    const columnIndexes = new Set(
      firstPage.blocks.map((block) => block.columnIndex),
    );
    // Both columns are used on the (balanced) final page.
    expect(columnIndexes.has(0)).toBe(true);
    expect(columnIndexes.has(1)).toBe(true);

    const col0 = firstPage.blocks.filter((b) => b.columnIndex === 0).length;
    const col1 = firstPage.blocks.filter((b) => b.columnIndex === 1).length;
    // Balanced: neither column holds everything.
    expect(col0).toBeGreaterThan(0);
    expect(col1).toBeGreaterThan(0);
    expect(Math.abs(col0 - col1)).toBeLessThanOrEqual(3);
  });

  it("fills both columns on full pages without overflowing the body", async () => {
    const document = await importDocxToEditorDocument(
      await buildTwoColumnDocx(300),
    );
    const layout = projectDocumentLayout(document);
    expect(layout.pages.length).toBeGreaterThan(1);
    for (const page of layout.pages) {
      const cols = new Set(page.blocks.map((b) => b.columnIndex));
      // Every page with content uses both columns...
      if (page.blocks.length > 1) {
        expect(cols.has(0)).toBe(true);
        expect(cols.has(1)).toBe(true);
      }
      // ...and no single column's content exceeds the page body height.
      for (const column of cols) {
        const columnHeight = page.blocks
          .filter((b) => b.columnIndex === column)
          .reduce((sum, b) => sum + b.estimatedHeight, 0);
        expect(columnHeight).toBeLessThanOrEqual(page.maxHeight + 2);
      }
    }
  });

  it("round-trips w:cols back into the exported sectPr", async () => {
    const document = await importDocxToEditorDocument(
      await buildTwoColumnDocx(4),
    );
    const exported = await exportEditorDocumentToDocx(document);
    const xml = await readDocumentXml(exported);
    expect(xml).toMatch(/<w:cols\b[^>]*w:num="2"/);
  });
});
