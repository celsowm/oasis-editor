import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import { importDocxInWorker } from "@/import/docx/importDocxInWorker.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";

async function buildDocxWithUnknownParagraphChildren(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rIdOffice" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}" xmlns:cx="urn:oasis:future"><w:body>
      <w:p cx:state="keep">
        <w:pPr><w:jc w:val="left"/></w:pPr>
        <cx:beforeRun cx:value="1"/>
        <w:proofErr w:type="spellStart"/>
        <w:r><w:t>Unchanged</w:t></w:r>
        <w:proofErr w:type="spellEnd"/>
        <cx:afterRun cx:value="2"/>
      </w:p>
      <w:sectPr/>
    </w:body></w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("whole paragraph OOXML source reuse", () => {
  it("preserves unknown direct children and wrappers when the paragraph is unchanged", async () => {
    const document = await importDocxInWorker(
      await buildDocxWithUnknownParagraphChildren(),
    );
    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const xml =
      (await output.file("word/document.xml")?.async("string")) ?? "";

    expect(xml).toContain('cx:state="keep"');
    expect(xml).toContain('<cx:beforeRun cx:value="1"/>');
    expect(xml).toContain('<w:proofErr w:type="spellStart"/>');
    expect(xml).toContain('<w:proofErr w:type="spellEnd"/>');
    expect(xml).toContain('<cx:afterRun cx:value="2"/>');
    expect(xml.indexOf("<cx:beforeRun")).toBeLessThan(
      xml.indexOf("<w:t>Unchanged</w:t>"),
    );
    expect(xml.indexOf("<w:t>Unchanged</w:t>")).toBeLessThan(
      xml.indexOf("<cx:afterRun"),
    );
  });
});
