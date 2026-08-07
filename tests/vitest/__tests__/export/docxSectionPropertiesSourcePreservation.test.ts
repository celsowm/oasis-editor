import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

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
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  mc:Ignorable="w15">
  <w:body>
    <w:p><w:r><w:t>Original</w:t></w:r></w:p>
    <w:sectPr w:rsidR="00112233" w15:opaqueAttr="keep-section-attribute">
      <w:lnNumType w:countBy="5"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0" w15:marginExtension="keep-margin-attribute"/>
      <w15:opaqueSectionSetting w15:val="keep-section-child"/>
      <w:docGrid w:type="lines" w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

async function importSourceBackedDocument() {
  const buffer = await buildSourcePackage();
  const document = await importDocxToEditorDocument(buffer);
  await attachDocxSourcePackage(document, buffer);
  return document;
}

async function exportDocumentXml(
  document: Awaited<ReturnType<typeof importSourceBackedDocument>>,
): Promise<string> {
  const output = await JSZip.loadAsync(
    await exportEditorDocumentToDocxPreservingSource(document),
  );
  const xml = await output.file("word/document.xml")?.async("string");
  if (!xml) {
    throw new Error("Expected word/document.xml in exported package.");
  }
  return xml;
}

function expectSourceOnlySectionMarkup(xml: string): void {
  expect(xml).toContain('xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"');
  expect(xml).toContain('mc:Ignorable="w15"');
  expect(xml).toContain('w:rsidR="00112233"');
  expect(xml).toContain('w15:opaqueAttr="keep-section-attribute"');
  expect(xml).toContain('<w:lnNumType w:countBy="5"');
  expect(xml).toContain('w15:marginExtension="keep-margin-attribute"');
  expect(xml).toContain('w15:opaqueSectionSetting');
  expect(xml).toContain('w15:val="keep-section-child"');
  expect(xml).toContain('<w:docGrid w:type="lines" w:linePitch="360"');
}

describe("source-backed section property preservation", () => {
  it("preserves source-only sectPr markup after an unrelated body edit", async () => {
    const document = await importSourceBackedDocument();
    const firstBlock = document.sections?.[0]?.blocks[0];
    if (!firstBlock || firstBlock.type !== "paragraph") {
      throw new Error("Expected the imported first block to be a paragraph.");
    }
    firstBlock.runs[0]!.text = "Edited";

    const xml = await exportDocumentXml(document);

    expect(xml).toContain(">Edited<");
    expect(xml).not.toContain(">Original<");
    expectSourceOnlySectionMarkup(xml);
  });

  it("keeps generated section semantics authoritative while preserving extensions", async () => {
    const document = await importSourceBackedDocument();
    const section = document.sections?.[0];
    if (!section) {
      throw new Error("Expected an imported section.");
    }
    section.pageSettings.margins.top = 120;

    const xml = await exportDocumentXml(document);

    expect(xml).toContain('w:top="1800"');
    expect(xml).not.toContain('w:top="1440"');
    expectSourceOnlySectionMarkup(xml);
  });
});
