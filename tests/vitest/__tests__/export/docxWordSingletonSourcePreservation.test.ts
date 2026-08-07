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
  <Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
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
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStylesSource" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rIdSettingsSource" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rIdNumberingSource" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rIdFontTableSource" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Custom"/>
        <w:numPr><w:ilvl w:val="0"/><w:numId w:val="42"/></w:numPr>
      </w:pPr>
      <w:r><w:t>Listed item</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
  );
  zip.file(
    "word/settings.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
  <w:defaultTabStop w:val="720"/>
  <w:zoom w:percent="125"/>
  <w:compat>
    <w:allowSpaceOfSameStyleInTable/>
    <w:doNotUseHTMLParagraphAutoSpacing/>
  </w:compat>
  <w15:opaqueSetting w15:val="keep-setting"/>
</w:settings>`,
  );
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
  <w:latentStyles w:defLockedState="0"><w:lsdException w:name="Heading 1"/></w:latentStyles>
  <w:style w:type="paragraph" w:styleId="Custom" w15:opaqueAttr="keep-style-attribute">
    <w:name w:val="Custom"/>
    <w:link w:val="CustomChar"/>
    <w15:styleExtension w15:val="keep-style-extension"/>
  </w:style>
</w:styles>`,
  );
  zip.file(
    "word/numbering.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="42">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="42"><w:abstractNumId w:val="42"/></w:num>
</w:numbering>`,
  );
  zip.file(
    "word/fontTable.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:font w:name="Calibri">
    <w:family w:val="swiss"/>
    <w:embedRegular r:id="rIdFont1"/>
  </w:font>
</w:fonts>`,
  );
  zip.file(
    "word/_rels/fontTable.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdFont1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font1.odttf"/>
</Relationships>`,
  );
  zip.file("word/fonts/font1.odttf", new Uint8Array([1, 3, 3, 7]));
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed Word singleton preservation", () => {
  it("keeps unknown singleton markup while generated modeled values change", async () => {
    const buffer = await buildSourcePackage();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);

    if (!document.settings) {
      throw new Error("Expected imported document settings.");
    }
    document.settings.defaultTabStop = 48;

    const customStyle = document.styles?.Custom;
    if (!customStyle) {
      throw new Error("Expected imported Custom style.");
    }
    customStyle.name = "Renamed Custom";

    const calibri = document.fontTable?.find((font) => font.name === "Calibri");
    if (!calibri) {
      throw new Error("Expected imported Calibri font declaration.");
    }
    calibri.altName = "Arial";

    const firstBlock = document.sections?.[0]?.blocks[0];
    if (!firstBlock || firstBlock.type !== "paragraph") {
      throw new Error("Expected imported list paragraph.");
    }
    firstBlock.list = undefined;

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );

    const settingsXml = await output.file("word/settings.xml")?.async("string");
    expect(settingsXml).toContain('w:defaultTabStop w:val="960"');
    expect(settingsXml).not.toContain('w:defaultTabStop w:val="720"');
    expect(settingsXml).toContain('w:zoom w:percent="125"');
    expect(settingsXml).toContain("w:doNotUseHTMLParagraphAutoSpacing");
    expect(settingsXml).toContain("w15:opaqueSetting");
    expect(settingsXml).toContain('w15:val="keep-setting"');

    const stylesXml = await output.file("word/styles.xml")?.async("string");
    expect(stylesXml).toContain('w:name w:val="Renamed Custom"');
    expect(stylesXml).not.toContain('w:name w:val="Custom"');
    expect(stylesXml).toContain("w:latentStyles");
    expect(stylesXml).toContain('w:link w:val="CustomChar"');
    expect(stylesXml).toContain('w15:opaqueAttr="keep-style-attribute"');
    expect(stylesXml).toContain("w15:styleExtension");

    const numberingXml = await output.file("word/numbering.xml")?.async("string");
    expect(numberingXml).toContain('w:abstractNumId="42"');
    expect(numberingXml).toContain('w:numId="42"');

    const fontTableXml = await output.file("word/fontTable.xml")?.async("string");
    expect(fontTableXml).toContain('w:altName w:val="Arial"');
    expect(fontTableXml).toContain('w:embedRegular r:id="rIdFont1"');

    expect(
      await output.file("word/fonts/font1.odttf")?.async("base64"),
    ).toBe("AQMDBw==");
    const fontRelationships = await output
      .file("word/_rels/fontTable.xml.rels")
      ?.async("string");
    expect(fontRelationships).toContain('Id="rIdFont1"');
    expect(fontRelationships).toContain('Target="fonts/font1.odttf"');
  });
});
