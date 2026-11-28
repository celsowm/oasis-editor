import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

async function buildPreservationDocx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rIdDoc" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rIdNum" Type="${OFFICE_REL_NS}/numbering" Target="numbering.xml"/><Relationship Id="rIdStyles" Type="${OFFICE_REL_NS}/styles" Target="styles.xml"/></Relationships>`,
  );
  zip.file(
    "word/numbering.xml",
    `<w:numbering ${W}>
      <w:abstractNum w:abstractNumId="1"><w:nsid w:val="A1B2C3D4"/><w:multiLevelType w:val="multilevel"/><w:tmpl w:val="DEADBEEF"/>
        <w:lvl w:ilvl="0" w:tplc="04090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/>
          <w:legacy w:legacy="1" w:legacySpace="240" w:legacyIndent="480"/>
        </w:lvl>
      </w:abstractNum>
      <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
    </w:numbering>`,
  );
  zip.file(
    "word/styles.xml",
    `<w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr/></w:rPrDefault><w:pPrDefault><w:pPr/></w:pPrDefault></w:docDefaults>
      <w:latentStyles w:count="1" w:defQFormat="1"><w:lsdException w:name="Normal" w:qFormat="1"/></w:latentStyles>
      <w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>
    </w:styles>`,
  );
  zip.file(
    "word/document.xml",
    `<w:document ${W}><w:body><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>Item</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("advanced numbering and style preservation", () => {
  it("keeps multiLevelType, template metadata, legacy level data and latent styles", async () => {
    const buffer = await buildPreservationDocx();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);
    const zip = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const numbering = (await zip.file("word/numbering.xml")?.async("string")) ?? "";
    expect(numbering).toContain('<w:multiLevelType w:val="multilevel"/>');
    expect(numbering).toContain('<w:nsid w:val="A1B2C3D4"/>');
    expect(numbering).toContain('<w:tmpl w:val="DEADBEEF"/>');
    expect(numbering).toContain('w:tplc="04090001"');
    expect(numbering).toContain('w:tentative="1"');
    expect(numbering).toContain('<w:legacy w:legacy="1"');

    const styles = (await zip.file("word/styles.xml")?.async("string")) ?? "";
    expect(styles).toContain("<w:latentStyles");
    expect(styles).toContain('<w:lsdException w:name="Normal" w:qFormat="1"/>');
  });
});
