import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WORD14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";
const CONTENT_TYPES_NS =
  "http://schemas.openxmlformats.org/package/2006/content-types";
const RELS_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";

async function tablePackage(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<Types xmlns="${CONTENT_TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${WORD_NS}"><w:body><w:tbl xmlns:w14="${WORD14_NS}" w14:paraId="7A7A7A7A"><w14:customMarker w14:val="preserve-me"/><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid><w:gridCol w:w="2400"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Original cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr/></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

async function exportedDocumentXml(
  document: Awaited<ReturnType<typeof importDocxToEditorDocument>>,
): Promise<string> {
  const output = await JSZip.loadAsync(
    await exportEditorDocumentToDocx(document),
  );
  return (await output.file("word/document.xml")?.async("string")) ?? "";
}

describe("whole-table OOXML source preservation", () => {
  it("reuses an unchanged table subtree with unknown attributes and children", async () => {
    const document = await importDocxToEditorDocument(await tablePackage());
    const xml = await exportedDocumentXml(document);

    expect(xml).toContain('w14:paraId="7A7A7A7A"');
    expect(xml).toContain("w14:customMarker");
    expect(xml).toContain('w14:val="preserve-me"');
  });

  it("regenerates edited content while retaining source-only table extensions", async () => {
    const document = await importDocxToEditorDocument(await tablePackage());
    const table = document.sections?.[0]?.blocks[0];
    if (!table || table.type !== "table") {
      throw new Error("Expected an imported table.");
    }
    const paragraph = table.rows[0]?.cells[0]?.blocks[0];
    if (!paragraph || paragraph.type !== "paragraph") {
      throw new Error("Expected an imported cell paragraph.");
    }
    paragraph.runs[0]!.text = "Edited cell";

    const xml = await exportedDocumentXml(document);
    expect(xml).toContain("Edited cell");
    expect(xml).not.toContain("Original cell");
    expect(xml).toContain('w14:paraId="7A7A7A7A"');
    expect(xml).toContain("w14:customMarker");
    expect(xml).toContain('w14:val="preserve-me"');
  });
});
