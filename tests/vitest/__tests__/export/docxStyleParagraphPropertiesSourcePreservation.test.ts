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
    <w:pPr w15:containerAttr="keep-container">
      <w:spacing w:before="120" w:after="60" w15:spacingAttr="keep-spacing"/>
      <w:ind w:left="720" w:hanging="360" w15:indAttr="keep-ind"/>
      <w15:pPrExtension w15:val="keep-direct-extension"/>
    </w:pPr>
  </w:style>
</w:styles>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed style paragraph-property preservation", () => {
  it("keeps nested extension markup when a named style is regenerated", async () => {
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

    // Root/container extension data already had preservation coverage; these
    // nested attributes prove the same guarantee now reaches modeled pPr
    // descendants instead of stopping at the pPr boundary.
    expect(stylesXml).toContain('w15:containerAttr="keep-container"');
    expect(stylesXml).toContain('w15:spacingAttr="keep-spacing"');
    expect(stylesXml).toContain('w15:indAttr="keep-ind"');
    expect(stylesXml).toContain('w15:val="keep-direct-extension"');

    // Modeled Word values remain present through canonical import/export.
    expect(stylesXml).toContain('w:before="120"');
    expect(stylesXml).toContain('w:after="60"');
    expect(stylesXml).toContain('w:left="720"');
    expect(stylesXml).toContain('w:hanging="360"');
  });
});
