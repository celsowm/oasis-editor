import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { EditorParagraphNode } from "@/core/model.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const PACKAGE_REL_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const DATASTORE_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/customXml";

async function buildBoundDocx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/customXml/itemProps1.xml" ContentType="application/vnd.openxmlformats-officedocument.customXmlProperties+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}">
      <Relationship Id="rIdOffice" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/>
    </Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}"><w:body>
      <w:sdt>
        <w:sdtPr>
          <w:tag w:val="customer-name"/>
          <w:dataBinding w:prefixMappings="xmlns:c='urn:customer'" w:xpath="/c:customer/c:name" w:storeItemID="{STORE-1}"/>
          <w:text/>
        </w:sdtPr>
        <w:sdtContent><w:p><w:r><w:t>Alice</w:t></w:r></w:p></w:sdtContent>
      </w:sdt>
      <w:sectPr/>
    </w:body></w:document>`,
  );
  zip.file(
    "customXml/item1.xml",
    `<customer xmlns="urn:customer"><name>Alice</name></customer>`,
  );
  zip.file(
    "customXml/itemProps1.xml",
    `<ds:datastoreItem xmlns:ds="${DATASTORE_NS}" ds:itemID="{STORE-1}"/>`,
  );
  zip.file(
    "customXml/_rels/item1.xml.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}">
      <Relationship Id="rIdProps" Type="${OFFICE_REL_NS}/customXmlProps" Target="itemProps1.xml"/>
    </Relationships>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed custom XML binding", () => {
  it("writes an edited bound SDT into the final customXml package part", async () => {
    const input = await buildBoundDocx();
    const document = await importDocxToEditorDocument(input);
    await attachDocxSourcePackage(document, input);

    const paragraph = document.sections![0]!.blocks[0] as EditorParagraphNode;
    expect(paragraph.sdtWrappers![0]!.sdtPr.dataBinding).toEqual({
      prefixMappings: "xmlns:c='urn:customer'",
      xpath: "/c:customer/c:name",
      storeItemID: "{STORE-1}",
    });
    paragraph.runs[0]!.text = "Bob";

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const customXml = await output.file("customXml/item1.xml")?.async("string");
    const documentXml = await output.file("word/document.xml")?.async("string");

    expect(customXml).toContain(">Bob<");
    expect(customXml).not.toContain(">Alice<");
    expect(documentXml).toContain("Bob");
    expect(documentXml).toContain("<w:dataBinding ");
    expect(documentXml).toContain('w:storeItemID="{STORE-1}"');
  });
});
