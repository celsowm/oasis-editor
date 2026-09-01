import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type {
  EditorParagraphNode,
  EditorTableNode,
} from "@/core/model.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

async function importTable() {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}"><w:body>
      <w:tbl>
        <w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>
        <w:tblGrid><w:gridCol w:w="2400"/></w:tblGrid>
        <w:sdt>
          <w:sdtPr><w:tag w:val="row-control"/></w:sdtPr>
          <w:sdtContent>
            <w:tr>
              <w:sdt>
                <w:sdtPr><w:tag w:val="cell-control"/></w:sdtPr>
                <w:sdtContent>
                  <w:tc>
                    <w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>
                    <w:p><w:r><w:t>Alice</w:t></w:r></w:p>
                  </w:tc>
                </w:sdtContent>
              </w:sdt>
            </w:tr>
          </w:sdtContent>
        </w:sdt>
      </w:tbl>
      <w:sectPr/>
    </w:body></w:document>`,
  );
  return importDocxToEditorDocument(
    await zip.generateAsync({ type: "arraybuffer" }),
  );
}

function firstTable(
  document: Awaited<ReturnType<typeof importTable>>,
): EditorTableNode {
  return document.sections![0]!.blocks[0] as EditorTableNode;
}

async function exportDocumentXml(
  document: Awaited<ReturnType<typeof importTable>>,
): Promise<string> {
  const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
  return (await zip.file("word/document.xml")?.async("string")) ?? "";
}

describe("DOCX table structural SDTs", () => {
  it("unwraps row and cell controls into editable table nodes", async () => {
    const document = await importTable();
    const table = firstTable(document);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]!.cells).toHaveLength(1);
    expect(table.rows[0]!.sdtWrappers?.[0]?.sdtPr.tag).toBe("row-control");
    expect(table.rows[0]!.cells[0]!.sdtWrappers?.[0]?.sdtPr.tag).toBe(
      "cell-control",
    );
    const paragraph = table.rows[0]!.cells[0]!.blocks[0] as EditorParagraphNode;
    expect(paragraph.runs.map((run) => run.text).join("")).toBe("Alice");
  });

  it("re-wraps row and cell controls after cell content is edited", async () => {
    const document = await importTable();
    const table = firstTable(document);
    const paragraph = table.rows[0]!.cells[0]!.blocks[0] as EditorParagraphNode;
    paragraph.runs[0]!.text = "Bob";

    const xml = await exportDocumentXml(document);
    expect(xml).toContain('w:val="row-control"');
    expect(xml).toContain('w:val="cell-control"');
    expect(xml).toContain("Bob");
    expect(xml.split("<w:sdt>").length - 1).toBe(2);
    expect(xml.indexOf('w:val="row-control"')).toBeLessThan(
      xml.indexOf("<w:tr"),
    );
    expect(xml.indexOf('w:val="cell-control"')).toBeLessThan(
      xml.indexOf("<w:tc"),
    );
  });
});
