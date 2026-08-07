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
  <Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rIdFootnotesSource" Type="${OFFICE_REL_NS}/footnotes" Target="footnotes.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}">
  <w:body>
    <w:p><w:r><w:t>Original body</w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r></w:p>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`,
  );
  zip.file(
    "word/footnotes.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="${WORD_NS}" xmlns:w15="${WORD15_NS}" xmlns:mc="${MC_NS}" mc:Ignorable="w15" w15:rootAttr="keep-footnotes-root">
  <w15:footnotesExtension w15:val="keep-footnotes-extension"/>
  <w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>
  <w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>
  <w:footnote w:id="1"><w:p><w:r><w:footnoteRef/><w:t>Footnote body</w:t></w:r></w:p></w:footnote>
</w:footnotes>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed related story root preservation", () => {
  it("keeps footnotes root compatibility markup while the document is edited", async () => {
    const buffer = await buildSourcePackage();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);

    const paragraph = document.sections?.[0]?.blocks[0];
    if (!paragraph || paragraph.type !== "paragraph") {
      throw new Error("Expected imported body paragraph.");
    }
    const bodyRun = paragraph.runs.find((run) => run.text.includes("Original body"));
    if (!bodyRun) {
      throw new Error("Expected imported body text run.");
    }
    bodyRun.text = "Edited body";

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const documentXml = await output.file("word/document.xml")?.async("string");
    expect(documentXml).toContain("Edited body");
    expect(documentXml).toContain("w:footnoteReference");

    const footnotesXml = await output.file("word/footnotes.xml")?.async("string");
    expect(footnotesXml).toBeDefined();
    expect(footnotesXml).toContain('mc:Ignorable="w15"');
    expect(footnotesXml).toContain('w15:rootAttr="keep-footnotes-root"');
    expect(footnotesXml).toContain('w15:val="keep-footnotes-extension"');
    expect(footnotesXml).toContain("Footnote body");
  });
});
