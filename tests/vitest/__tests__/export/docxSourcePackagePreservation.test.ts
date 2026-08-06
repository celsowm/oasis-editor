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
  <Default Extension="bin" ContentType="application/octet-stream"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>
  <Override PartName="/customXml/item1.xml" ContentType="application/xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rIdCustomProps" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Original</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdCustomXml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/item1.xml"/>
</Relationships>`,
  );
  zip.file(
    "docProps/custom.xml",
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties"><property name="CaseId"/></Properties>`,
  );
  zip.file("customXml/item1.xml", "<case><id>42</id></case>");
  zip.file("word/embeddings/opaque.bin", new Uint8Array([7, 8, 9, 10]));
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed DOCX export", () => {
  it("preserves unrelated OPC parts, content types, and relationships after an edit", async () => {
    const buffer = await buildSourcePackage();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);

    const firstBlock = document.sections?.[0]?.blocks[0];
    if (!firstBlock || firstBlock.type !== "paragraph") {
      throw new Error("Expected the imported first block to be a paragraph.");
    }
    firstBlock.runs[0]!.text = "Edited";

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );

    expect(await output.file("customXml/item1.xml")?.async("string")).toBe(
      "<case><id>42</id></case>",
    );
    expect(await output.file("docProps/custom.xml")?.async("string")).toContain(
      'name="CaseId"',
    );
    expect(
      await output.file("word/embeddings/opaque.bin")?.async("base64"),
    ).toBe("BwgJCg==");

    const documentXml = await output.file("word/document.xml")?.async("string");
    expect(documentXml).toContain("Edited");
    expect(documentXml).not.toContain(">Original<");

    const contentTypes = await output
      .file("[Content_Types].xml")
      ?.async("string");
    expect(contentTypes).toContain("/docProps/custom.xml");
    expect(contentTypes).toContain("/customXml/item1.xml");
    expect(contentTypes).toContain('Extension="bin"');

    const rootRelationships = await output
      .file("_rels/.rels")
      ?.async("string");
    expect(rootRelationships).toContain('Id="rIdCustomProps"');
    expect(rootRelationships).toContain('Target="docProps/custom.xml"');

    const documentRelationships = await output
      .file("word/_rels/document.xml.rels")
      ?.async("string");
    expect(documentRelationships).toContain('Id="rIdCustomXml"');
    expect(documentRelationships).toContain('Target="../customXml/item1.xml"');
  });
});
