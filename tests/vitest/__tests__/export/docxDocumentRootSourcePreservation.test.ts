import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";
const MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";

async function buildSourcePackage(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rIdOpaque" Type="https://example.test/relationships/opaque-extension" Target="../customXml/opaque.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}" xmlns:w15="${WORD15_NS}" xmlns:mc="${MC_NS}" xmlns:r="${OFFICE_REL_NS}" mc:Ignorable="w15" w15:documentAttr="keep-document-attr">
  <w15:documentExtension w15:val="keep-document-extension" r:id="rIdOpaque"/>
  <w:body w15:bodyAttr="keep-body-attr">
    <w:p><w:r><w:t>Original</w:t></w:r></w:p>
    <w15:bodyExtension w15:val="keep-body-extension" r:id="rIdOpaque"/>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`,
  );
  zip.file("customXml/opaque.xml", "<opaque><value>preserve-me</value></opaque>");
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed document root preservation", () => {
  it("keeps document/body extensions and their relationships across a body edit", async () => {
    const buffer = await buildSourcePackage();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);

    const paragraph = document.sections?.[0]?.blocks[0];
    if (!paragraph || paragraph.type !== "paragraph") {
      throw new Error("Expected imported body paragraph.");
    }
    paragraph.runs[0]!.text = "Edited";

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const documentXml = await output.file("word/document.xml")?.async("string");
    expect(documentXml).toBeDefined();
    expect(documentXml).toContain(">Edited<");
    expect(documentXml).not.toContain(">Original<");
    expect(documentXml).toContain('mc:Ignorable="w15"');
    expect(documentXml).toContain('w15:documentAttr="keep-document-attr"');
    expect(documentXml).toContain('w15:bodyAttr="keep-body-attr"');
    expect(documentXml).toContain('w15:val="keep-document-extension"');
    expect(documentXml).toContain('w15:val="keep-body-extension"');
    expect(documentXml).toContain('r:id="rIdOpaque"');

    const relationshipsXml = await output
      .file("word/_rels/document.xml.rels")
      ?.async("string");
    expect(relationshipsXml).toContain('Id="rIdOpaque"');
    expect(relationshipsXml).toContain('Target="../customXml/opaque.xml"');
    expect(await output.file("customXml/opaque.xml")?.async("string")).toBe(
      "<opaque><value>preserve-me</value></opaque>",
    );
  });
});
