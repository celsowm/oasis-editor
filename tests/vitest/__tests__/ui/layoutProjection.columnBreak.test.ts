import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { projectDocumentLayout } from "@/layoutProjection/index.js";

async function buildDocxWithColumnBreak(): Promise<ArrayBuffer> {
  // A single, long paragraph with a hard column break in the middle. The text
  // before the break and after are each long enough to wrap across many lines.
  const before = "Alpha ".repeat(40);
  const after = "Omega ".repeat(40);
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${before}</w:t></w:r><w:r><w:br w:type="column"/></w:r><w:r><w:t>${after}</w:t></w:r></w:p>
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

describe("layout projection honors hard column breaks", () => {
  it("forces the text after a column break onto a new column", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithColumnBreak(),
    );
    const layout = projectDocumentLayout(document);
    const firstPage = layout.pages[0]!;

    // The before-text must be in column 0 and the after-text in column 1.
    const paragraphBlocks = firstPage.blocks.filter(
      (block) => block.blockType === "paragraph",
    );
    const col0 = paragraphBlocks.filter((b) => b.columnIndex === 0);
    const col1 = paragraphBlocks.filter((b) => b.columnIndex === 1);

    expect(col0.length).toBeGreaterThan(0);
    expect(col1.length).toBeGreaterThan(0);

    const col0Text = col0.map((b) => b.layout?.text ?? "").join("");
    const col1Text = col1.map((b) => b.layout?.text ?? "").join("");
    expect(col0Text).toContain("Alpha");
    expect(col0Text).not.toContain("Omega");
    expect(col1Text).toContain("Omega");

    // No segment spans the break: the marker's boundary must land on a
    // segment start, so no block text mixes both halves.
    for (const block of paragraphBlocks) {
      const text = block.layout?.text ?? "";
      if (text.includes("Alpha") && text.includes("Omega")) {
        throw new Error(
          `column break did not split a segment: got mixed text in one block`,
        );
      }
    }
  });
});
