import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";
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
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rIdStylesSource" Type="${OFFICE_REL_NS}/styles" Target="styles.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Custom"/></w:pPr><w:r><w:t>Styled</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`,
  );
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${WORD_NS}" xmlns:w15="${WORD15_NS}">
  <w:style w:type="paragraph" w:styleId="Custom">
    <w:name w:val="Custom"/>
    <w:rPr w15:containerAttr="keep-rpr-container">
      <w:b/>
      <w:color w:val="112233" w15:colorAttr="keep-color-extension"/>
      <w:rPrChange w:id="17" w:author="Source Author"><w:rPr><w:i/></w:rPr></w:rPrChange>
      <w15:rPrExtension w15:val="keep-rpr-extension"/>
    </w:rPr>
  </w:style>
</w:styles>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed style run-property preservation", () => {
  it("keeps nested extensions and unmodeled Word rPr children when a style is regenerated", async () => {
    const buffer = await buildSourcePackage();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);

    const custom = document.styles?.Custom;
    if (!custom) {
      throw new Error("Expected imported Custom style.");
    }
    custom.name = "Renamed Custom";

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const stylesXml = await output.file("word/styles.xml")?.async("string");
    expect(stylesXml).toBeDefined();
    expect(stylesXml).toContain('w:name w:val="Renamed Custom"');
    expect(stylesXml).not.toContain('w:name w:val="Custom"');

    expect(stylesXml).toContain('w15:containerAttr="keep-rpr-container"');
    expect(stylesXml).toContain('w15:colorAttr="keep-color-extension"');
    expect(stylesXml).toContain('w15:val="keep-rpr-extension"');
    expect(stylesXml).toContain('<w:rPrChange');
    expect(stylesXml).toContain('w:id="17"');
    expect(stylesXml).toContain('w:author="Source Author"');

    // The modeled text formatting still comes from the canonical serializer.
    expect(stylesXml).toContain("<w:b/>");
    expect(stylesXml).toContain('w:color w:val="112233"');
  });
});
