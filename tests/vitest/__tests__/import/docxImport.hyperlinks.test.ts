import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { getDocumentParagraphs } from "./docxTestHelpers.js";

async function buildHyperlinkDocx(
  bodyXml: string,
  relsXml?: string,
): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${bodyXml}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`,
  );
  if (relsXml) {
    zip.file(
      "word/_rels/document.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relsXml}</Relationships>`,
    );
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("hyperlink round-trip", () => {
  it("imports external hyperlink and re-exports as External relationship", async () => {
    const docx = await buildHyperlinkDocx(
      `<w:p>
        <w:hyperlink r:id="rId1">
          <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>Click here</w:t></w:r>
        </w:hyperlink>
      </w:p>`,
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const paragraphs = getDocumentParagraphs(document);
    const run = paragraphs[0]!.runs[0]!;

    expect(run.styles?.link).toBe("https://example.com");

    const exportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const docXml = await exportedZip.file("word/document.xml")?.async("string");
    const relsXml = await exportedZip
      .file("word/_rels/document.xml.rels")
      ?.async("string");

    expect(docXml).toMatch(/w:hyperlink r:id="[^"]+"/);
    expect(relsXml).toContain('Target="https://example.com"');
    expect(relsXml).toContain('TargetMode="External"');
  });

  it("imports anchor-only hyperlink as #-prefixed link", async () => {
    const docx = await buildHyperlinkDocx(
      `<w:p>
        <w:hyperlink w:anchor="Chapter1">
          <w:r><w:t>Jump to chapter</w:t></w:r>
        </w:hyperlink>
      </w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const run = getDocumentParagraphs(document)[0]!.runs[0]!;

    expect(run.styles?.link).toBe("#Chapter1");
  });

  it("re-exports anchor hyperlink as w:anchor attribute with no External relationship", async () => {
    const docx = await buildHyperlinkDocx(
      `<w:p>
        <w:hyperlink w:anchor="Chapter1">
          <w:r><w:t>Jump to chapter</w:t></w:r>
        </w:hyperlink>
      </w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);

    const exportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const docXml = await exportedZip.file("word/document.xml")?.async("string");
    const relsXml = await exportedZip
      .file("word/_rels/document.xml.rels")
      ?.async("string");

    expect(docXml).toContain('w:anchor="Chapter1"');
    expect(docXml).not.toMatch(/w:hyperlink r:id=/);
    expect(relsXml ?? "").not.toContain("Chapter1");
    expect(relsXml ?? "").not.toContain('TargetMode="External"');
  });

  it("does not mix anchor links into the External relationships part", async () => {
    const docx = await buildHyperlinkDocx(
      `<w:p>
        <w:hyperlink w:anchor="Section2">
          <w:r><w:t>Internal</w:t></w:r>
        </w:hyperlink>
      </w:p>
      <w:p>
        <w:hyperlink r:id="rId1">
          <w:r><w:t>External</w:t></w:r>
        </w:hyperlink>
      </w:p>`,
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const paragraphs = getDocumentParagraphs(document);

    expect(paragraphs[0]!.runs[0]!.styles?.link).toBe("#Section2");
    expect(paragraphs[1]!.runs[0]!.styles?.link).toBe("https://example.com");

    const exportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const docXml = await exportedZip.file("word/document.xml")?.async("string");
    const relsXml = await exportedZip
      .file("word/_rels/document.xml.rels")
      ?.async("string");

    expect(docXml).toContain('w:anchor="Section2"');
    expect(docXml).toMatch(/w:hyperlink r:id="[^"]+"/);
    expect(relsXml).toContain('Target="https://example.com"');
    expect(relsXml).not.toContain("Section2");
    // Only one External relationship (for the URL, not the anchor)
    expect((relsXml?.match(/TargetMode="External"/g) ?? []).length).toBe(1);
  });
});
