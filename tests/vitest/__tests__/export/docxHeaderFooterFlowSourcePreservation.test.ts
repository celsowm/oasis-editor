import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createEditorParagraphFromRuns } from "@/core/editorState.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WORD14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";
const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";
const OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

async function buildSourcePackage(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rIdHeaderSource" Type="${OFFICE_REL_NS}/header" Target="header1.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}" xmlns:r="${OFFICE_REL_NS}"><w:body>
  <w:p><w:r><w:t>Body</w:t></w:r></w:p>
  <w:sectPr><w:headerReference w:type="default" r:id="rIdHeaderSource"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body></w:document>`,
  );
  zip.file(
    "word/header1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" xmlns:w15="${WORD15_NS}" w15:rootAttr="keep-header-root">
  <w:p w14:paraId="AAAABBBB"><w:r><w:t>Header first</w:t></w:r></w:p>
  <w:customXml w:uri="urn:oasis:test" w:element="opaque" w15:wrapperAttr="keep-wrapper">
    <w:p><w:r><w:t>Opaque header wrapper</w:t></w:r></w:p>
  </w:customXml>
  <w:p w14:paraId="CCCCDDDD"><w:r><w:t>Header second</w:t></w:r></w:p>
</w:hdr>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed header/footer flow preservation", () => {
  it("anchors an opaque Word wrapper to the next original header paragraph after insertion", async () => {
    const buffer = await buildSourcePackage();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);

    const header = document.sections?.[0]?.header;
    if (!header || header.length < 2) {
      throw new Error("Expected two imported header paragraphs.");
    }
    header.splice(
      1,
      0,
      createEditorParagraphFromRuns([{ text: "Inserted header paragraph" }]),
    );

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const headerXml = await output.file("word/header1.xml")?.async("string");
    expect(headerXml).toBeDefined();
    expect(headerXml).toContain('w15:rootAttr="keep-header-root"');
    expect(headerXml).toContain('w15:wrapperAttr="keep-wrapper"');
    expect(headerXml).toContain("Opaque header wrapper");
    expect(headerXml).toContain('w14:paraId="CCCCDDDD"');

    const insertedIndex = headerXml!.indexOf("Inserted header paragraph");
    const wrapperIndex = headerXml!.indexOf("Opaque header wrapper");
    const secondIndex = headerXml!.indexOf("Header second");
    expect(insertedIndex).toBeLessThan(wrapperIndex);
    expect(wrapperIndex).toBeLessThan(secondIndex);
  });
});
