import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
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
  <Override PartName="/word/header42.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}">
  <Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}" xmlns:r="${OFFICE_REL_NS}">
  <w:body>
    <w:p><w:r><w:t>Body</w:t></w:r></w:p>
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeaderSource"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}">
  <Relationship Id="rIdHeaderSource" Type="${OFFICE_REL_NS}/header" Target="header42.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/header42.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr
  xmlns:w="${WORD_NS}"
  xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  mc:Ignorable="w15"
  w15:opaqueRootAttr="keep-root-attribute">
  <w15:opaqueHeaderData w15:val="keep-root-child"/>
  <w:p><w:r><w:t>Original header</w:t></w:r></w:p>
</w:hdr>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed header/footer root preservation", () => {
  it("preserves root extensions while a header story is edited", async () => {
    const buffer = await buildSourcePackage();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);

    const headerBlock = document.sections?.[0]?.header?.[0];
    if (!headerBlock || headerBlock.type !== "paragraph") {
      throw new Error("Expected imported default header paragraph.");
    }
    headerBlock.runs[0]!.text = "Edited header";

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const headerXml = await output.file("word/header42.xml")?.async("string");
    if (!headerXml) {
      throw new Error("Expected source header path to survive export.");
    }

    expect(headerXml).toContain(">Edited header<");
    expect(headerXml).not.toContain(">Original header<");
    expect(headerXml).toContain(
      'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"',
    );
    expect(headerXml).toContain('mc:Ignorable="w15"');
    expect(headerXml).toContain('w15:opaqueRootAttr="keep-root-attribute"');
    expect(headerXml).toContain("w15:opaqueHeaderData");
    expect(headerXml).toContain('w15:val="keep-root-child"');
    expect(output.file("word/header1.xml")).toBeNull();
  });
});
