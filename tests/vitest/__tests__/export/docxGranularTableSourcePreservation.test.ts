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

async function granularTablePackage(): Promise<ArrayBuffer> {
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
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}"><w:body><w:tbl><w:tblPr w14:tblAttr="keep"><w14:beforeTable w14:val="1"/><w:tblW w:w="2400" w:type="dxa"/><w:jc w:val="left"/><w14:afterTable w14:val="2"/></w:tblPr><w:tblGrid w14:gridAttr="keep"><w:gridCol w:w="2400"/><w14:gridExtension w14:val="grid"/></w:tblGrid><w:tr><w:tblPrEx w14:exceptionAttr="keep"><w:tblW w:w="2400" w:type="dxa"/><w14:exceptionExtension w14:val="exception"/></w:tblPrEx><w:trPr w14:rowAttr="keep"><w:trHeight w:val="400" w:hRule="atLeast"/><w14:rowExtension w14:val="row"/></w:trPr><w:tc><w:tcPr w14:cellAttr="keep"><w:tcW w:w="2400" w:type="dxa"/><w:vAlign w:val="top"/><w14:cellExtension w14:val="cell"/></w:tcPr><w:p><w:r><w:t>Original cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr/></w:body></w:document>`,
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

function importedTable(
  document: Awaited<ReturnType<typeof importDocxToEditorDocument>>,
) {
  const table = document.sections?.[0]?.blocks[0];
  if (!table || table.type !== "table") {
    throw new Error("Expected an imported table.");
  }
  return table;
}

describe("granular table OOXML source preservation", () => {
  it("keeps unknown table, grid, row, exception, and cell properties after a text edit", async () => {
    const document = await importDocxToEditorDocument(
      await granularTablePackage(),
    );
    const table = importedTable(document);
    table.rows[0]!.cells[0]!.blocks[0]!.runs[0]!.text = "Edited cell";

    const xml = await exportedDocumentXml(document);
    expect(xml).toContain("Edited cell");
    expect(xml).not.toContain("Original cell");
    expect(xml).toContain('w14:tblAttr="keep"');
    expect(xml).toContain("w14:beforeTable");
    expect(xml).toContain("w14:afterTable");
    expect(xml).toContain('w14:gridAttr="keep"');
    expect(xml).toContain("w14:gridExtension");
    expect(xml).toContain('w14:exceptionAttr="keep"');
    expect(xml).toContain("w14:exceptionExtension");
    expect(xml).toContain('w14:rowAttr="keep"');
    expect(xml).toContain("w14:rowExtension");
    expect(xml).toContain('w14:cellAttr="keep"');
    expect(xml).toContain("w14:cellExtension");
  });

  it("overlays every edited known property without dropping source-only extensions", async () => {
    const document = await importDocxToEditorDocument(
      await granularTablePackage(),
    );
    const table = importedTable(document);
    table.style = { ...(table.style ?? {}), align: "center" };
    table.gridCols = [180];
    const row = table.rows[0]!;
    row.style = { ...(row.style ?? {}), height: 30 };
    row.propertyExceptions = {
      ...(row.propertyExceptions ?? {}),
      align: "right",
    };
    const cell = row.cells[0]!;
    cell.style = { ...(cell.style ?? {}), verticalAlign: "bottom" };
    cell.blocks[0]!.runs[0]!.text = "Edited properties";

    const xml = await exportedDocumentXml(document);
    expect(xml).toContain('<w:jc w:val="center"');
    expect(xml).not.toContain('<w:jc w:val="left"');
    expect(xml).toContain('<w:gridCol w:w="3600"');
    expect(xml).toContain('<w:trHeight w:val="600"');
    expect(xml).toContain('<w:jc w:val="right"');
    expect(xml).toContain('<w:vAlign w:val="bottom"');
    expect(xml).not.toContain('<w:vAlign w:val="top"');
    expect(xml).toContain("w14:beforeTable");
    expect(xml).toContain("w14:afterTable");
    expect(xml).toContain("w14:gridExtension");
    expect(xml).toContain("w14:exceptionExtension");
    expect(xml).toContain("w14:rowExtension");
    expect(xml).toContain("w14:cellExtension");
    expect(xml).toContain('w14:tblAttr="keep"');
    expect(xml).toContain('w14:gridAttr="keep"');
    expect(xml).toContain('w14:exceptionAttr="keep"');
    expect(xml).toContain('w14:rowAttr="keep"');
    expect(xml).toContain('w14:cellAttr="keep"');
  });
});
