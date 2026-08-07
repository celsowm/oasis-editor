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
<w:document xmlns:w="${WORD_NS}"><w:body><w:p><w:r><w:t>Body</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  );
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${WORD_NS}" xmlns:w15="${WORD15_NS}">
  <w:style w:type="table" w:styleId="FancyTable">
    <w:name w:val="Fancy Table"/>
    <w:tblPr w15:directTblPrAttr="keep-direct-tblpr">
      <w15:directTblPrExtension w15:val="keep-direct-tblpr-extension"/>
    </w:tblPr>
    <w:tblStylePr w:type="firstRow" w15:conditionalAttr="keep-conditional-root">
      <w:pPr w15:pPrAttr="keep-ppr-root">
        <w:spacing w:before="120" w:after="60" w15:spacingAttr="keep-spacing"/>
        <w15:pPrExtension w15:val="keep-ppr-extension"/>
      </w:pPr>
      <w:rPr w15:rPrAttr="keep-rpr-root">
        <w:b/>
        <w:color w:val="112233" w15:colorAttr="keep-color"/>
        <w15:rPrExtension w15:val="keep-rpr-extension"/>
      </w:rPr>
      <w:tblPr w15:tblPrAttr="keep-cond-tblpr-root">
        <w:tblW w:w="4000" w:type="pct" w15:widthAttr="keep-cond-width"/>
        <w15:tblPrExtension w15:val="keep-cond-tblpr-extension"/>
      </w:tblPr>
      <w:trPr w15:trPrAttr="keep-trpr-root">
        <w:tblHeader/>
        <w:trHeight w:val="300" w:hRule="atLeast" w15:heightAttr="keep-height"/>
        <w15:trPrExtension w15:val="keep-trpr-extension"/>
      </w:trPr>
      <w:tcPr w15:tcPrAttr="keep-tcpr-root">
        <w:tcW w:w="1440" w:type="dxa" w15:cellWidthAttr="keep-cell-width"/>
        <w:shd w:fill="FFFF00" w15:shadingAttr="keep-shading"/>
        <w15:tcPrExtension w15:val="keep-tcpr-extension"/>
      </w:tcPr>
      <w15:conditionalExtension w15:val="keep-conditional-extension"/>
    </w:tblStylePr>
    <w:tblStylePr w:type="seCell" w15:opaqueAttr="keep-opaque-root">
      <w15:opaqueOnly w15:val="keep-opaque-only"/>
    </w:tblStylePr>
  </w:style>
</w:styles>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed table style preservation", () => {
  it("keeps conditional property extensions while edited modeled values win", async () => {
    const buffer = await buildSourcePackage();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);

    const style = document.styles?.FancyTable;
    const firstRow = style?.tableStyle?.conditionalFormats?.firstRow;
    if (!style || !firstRow?.paragraphStyle) {
      throw new Error("Expected imported FancyTable firstRow conditional style.");
    }
    style.name = "Renamed Fancy Table";
    firstRow.paragraphStyle.spacingAfter = 20; // px -> 300 twips

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const stylesXml = await output.file("word/styles.xml")?.async("string");
    expect(stylesXml).toBeDefined();
    expect(stylesXml).toContain('w:name w:val="Renamed Fancy Table"');
    expect(stylesXml).not.toContain('w:name w:val="Fancy Table"');

    // Canonical modeled value wins over the source 60-twip value.
    expect(stylesXml).toContain('w:after="300"');
    expect(stylesXml).not.toContain('w:after="60"');

    // Direct table-style properties and every conditional property container
    // retain extension markup nested inside otherwise modeled Word children.
    for (const token of [
      'w15:directTblPrAttr="keep-direct-tblpr"',
      'w15:conditionalAttr="keep-conditional-root"',
      'w15:pPrAttr="keep-ppr-root"',
      'w15:spacingAttr="keep-spacing"',
      'w15:rPrAttr="keep-rpr-root"',
      'w15:colorAttr="keep-color"',
      'w15:tblPrAttr="keep-cond-tblpr-root"',
      'w15:widthAttr="keep-cond-width"',
      'w15:trPrAttr="keep-trpr-root"',
      'w15:heightAttr="keep-height"',
      'w15:tcPrAttr="keep-tcpr-root"',
      'w15:cellWidthAttr="keep-cell-width"',
      'w15:shadingAttr="keep-shading"',
      'w15:val="keep-direct-tblpr-extension"',
      'w15:val="keep-ppr-extension"',
      'w15:val="keep-rpr-extension"',
      'w15:val="keep-cond-tblpr-extension"',
      'w15:val="keep-trpr-extension"',
      'w15:val="keep-tcpr-extension"',
      'w15:val="keep-conditional-extension"',
    ]) {
      expect(stylesXml).toContain(token);
    }

    // The direct tblPr contains no modeled table style property, so the normal
    // serializer omits it. Source preservation must restore it before the first
    // conditional block, not append it after tblStylePr and violate CT_Style.
    const directTblPrIndex = stylesXml!.indexOf(
      'w15:directTblPrAttr="keep-direct-tblpr"',
    );
    const firstConditionalIndex = stylesXml!.indexOf(
      'w:type="firstRow"',
    );
    expect(directTblPrIndex).toBeGreaterThan(-1);
    expect(directTblPrIndex).toBeLessThan(firstConditionalIndex);

    // This conditional block contains no modeled formatting at all, so it is
    // absent from EditorTableStyle but must survive as an opaque source block.
    expect(stylesXml).toContain('w:type="seCell"');
    expect(stylesXml).toContain('w15:opaqueAttr="keep-opaque-root"');
    expect(stylesXml).toContain('w15:val="keep-opaque-only"');
  });
});
