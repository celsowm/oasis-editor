import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createEditorParagraphFromRuns } from "@/core/editorState.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WORD14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";
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
  <Default Extension="html" ContentType="text/html"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}">
  <Relationship Id="rIdOpaque" Type="https://example.test/relationships/opaque-extension" Target="../customXml/opaque.xml"/>
  <Relationship Id="rIdAltChunk" Type="${OFFICE_REL_NS}/aFChunk" Target="altChunk1.html"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" xmlns:w15="${WORD15_NS}" xmlns:mc="${MC_NS}" xmlns:r="${OFFICE_REL_NS}" mc:Ignorable="w14 w15" w15:documentAttr="keep-document-attr">
  <w:background w:color="FAFAFA"/>
  <w15:documentExtension w15:val="keep-document-extension" r:id="rIdOpaque"/>
  <w:body w15:bodyAttr="keep-body-attr">
    <w:p w14:paraId="AAAABBBB"><w:r><w:t>Original</w:t></w:r></w:p>
    <w15:bodyExtension w15:val="keep-body-extension" r:id="rIdOpaque"/>
    <w:altChunk r:id="rIdAltChunk"/>
    <w:p w14:paraId="CCCCDDDD"><w:r><w:t>Second paragraph</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`,
  );
  zip.file("customXml/opaque.xml", "<opaque><value>preserve-me</value></opaque>");
  zip.file("word/altChunk1.html", "<html><body>Imported HTML chunk</body></html>");
  return zip.generateAsync({ type: "arraybuffer" });
}

async function importSourceBackedDocument() {
  const buffer = await buildSourcePackage();
  const document = await importDocxToEditorDocument(buffer);
  await attachDocxSourcePackage(document, buffer);
  return document;
}

async function exportSourceBackedDocument(
  document: Awaited<ReturnType<typeof importSourceBackedDocument>>,
): Promise<JSZip> {
  return JSZip.loadAsync(await exportEditorDocumentToDocxPreservingSource(document));
}

describe("source-backed document root preservation", () => {
  it("keeps document/body extensions, background and altChunk across a non-structural edit", async () => {
    const document = await importSourceBackedDocument();

    const paragraph = document.sections?.[0]?.blocks[0];
    if (!paragraph || paragraph.type !== "paragraph") {
      throw new Error("Expected imported body paragraph.");
    }
    paragraph.runs[0]!.text = "Edited";

    const output = await exportSourceBackedDocument(document);
    const documentXml = await output.file("word/document.xml")?.async("string");
    expect(documentXml).toBeDefined();
    expect(documentXml).toContain(">Edited<");
    expect(documentXml).not.toContain(">Original<");
    expect(documentXml).toContain("Second paragraph");
    expect(documentXml).toContain('mc:Ignorable="w14 w15"');
    expect(documentXml).toContain('w15:documentAttr="keep-document-attr"');
    expect(documentXml).toContain('w15:bodyAttr="keep-body-attr"');
    expect(documentXml).toContain('w15:val="keep-document-extension"');
    expect(documentXml).toContain('w15:val="keep-body-extension"');
    expect(documentXml).toContain('<w:background w:color="FAFAFA"');
    expect(documentXml).toContain('<w:altChunk r:id="rIdAltChunk"');
    expect(documentXml).toContain('w14:paraId="AAAABBBB"');
    expect(documentXml).toContain('w14:paraId="CCCCDDDD"');
    expect(documentXml).toContain('r:id="rIdOpaque"');

    expect(documentXml!.indexOf("Edited")).toBeLessThan(
      documentXml!.indexOf("rIdAltChunk"),
    );
    expect(documentXml!.indexOf("rIdAltChunk")).toBeLessThan(
      documentXml!.indexOf("Second paragraph"),
    );

    const relationshipsXml = await output
      .file("word/_rels/document.xml.rels")
      ?.async("string");
    expect(relationshipsXml).toContain('Id="rIdOpaque"');
    expect(relationshipsXml).toContain('Target="../customXml/opaque.xml"');
    expect(relationshipsXml).toContain('Id="rIdAltChunk"');
    expect(relationshipsXml).toContain('Target="altChunk1.html"');
    expect(await output.file("customXml/opaque.xml")?.async("string")).toBe(
      "<opaque><value>preserve-me</value></opaque>",
    );
    expect(await output.file("word/altChunk1.html")?.async("string")).toBe(
      "<html><body>Imported HTML chunk</body></html>",
    );
  });

  it("anchors altChunk to the next original paraId when a new paragraph changes block count", async () => {
    const document = await importSourceBackedDocument();
    const section = document.sections?.[0];
    if (!section || section.blocks.length < 2) {
      throw new Error("Expected two imported body paragraphs.");
    }

    const inserted = createEditorParagraphFromRuns([{ text: "Inserted paragraph" }]);
    section.blocks.splice(1, 0, inserted);

    const output = await exportSourceBackedDocument(document);
    const documentXml = await output.file("word/document.xml")?.async("string");
    expect(documentXml).toBeDefined();
    expect(documentXml).toContain("Inserted paragraph");
    expect(documentXml).toContain('<w:altChunk r:id="rIdAltChunk"');

    const insertedIndex = documentXml!.indexOf("Inserted paragraph");
    const altChunkIndex = documentXml!.indexOf("rIdAltChunk");
    const secondOriginalIndex = documentXml!.indexOf("Second paragraph");
    expect(insertedIndex).toBeLessThan(altChunkIndex);
    expect(altChunkIndex).toBeLessThan(secondOriginalIndex);
    expect(documentXml).toContain('w14:paraId="CCCCDDDD"');
  });
});
