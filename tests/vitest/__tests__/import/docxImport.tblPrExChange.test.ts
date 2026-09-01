import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { EditorTableNode } from "@/core/model.js";
import { projectTrackedRevisions } from "@/core/document/trackedRevisions.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

async function importTablePropertyExceptionRevision() {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid>
      <w:tr>
        <w:tblPrEx>
          <w:tblW w:w="4000" w:type="dxa"/>
          <w:jc w:val="right"/>
          <w:tblPrExChange w:id="71" w:author="Table Author" w:date="2026-02-08T01:02:03Z">
            <w:tblPrEx>
              <w:tblW w:w="2000" w:type="dxa"/>
              <w:jc w:val="left"/>
            </w:tblPrEx>
          </w:tblPrExChange>
        </w:tblPrEx>
        <w:tc><w:p><w:r><w:t>Cell</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:sectPr/>
  </w:body>
</w:document>`,
  );
  return importDocxToEditorDocument(await zip.generateAsync({ type: "arraybuffer" }));
}

function firstTable(document: Awaited<ReturnType<typeof importTablePropertyExceptionRevision>>): EditorTableNode {
  return document.sections![0]!.blocks[0] as EditorTableNode;
}

describe("DOCX tracked table property exceptions", () => {
  it("decodes tblPrExChange while retaining raw round-trip fallback", async () => {
    const document = await importTablePropertyExceptionRevision();
    const row = firstTable(document).rows[0]!;

    expect(row.propertyExceptions).toMatchObject({ width: 200, align: "right" });
    expect(row.propertyExceptionsRevision).toMatchObject({
      id: "71",
      author: "Table Author",
      type: "property",
      previous: { width: 100, align: "left" },
    });
    expect(row.tblPrExChangeXml).toContain("tblPrExChange");

    const exported = await exportEditorDocumentToDocx(document);
    const reimported = await importDocxToEditorDocument(exported);
    expect(firstTable(reimported).rows[0]!.propertyExceptionsRevision).toMatchObject({
      id: "71",
      previous: { width: 100, align: "left" },
    });
  });

  it("projects Original and Final exactly and removes the resolved change", async () => {
    const document = await importTablePropertyExceptionRevision();

    const original = projectTrackedRevisions(document, "original");
    expect(original.complete).toBe(true);
    expect(original.resolvedRevisionIds).toContain("71");
    const originalRow = firstTable(original.document).rows[0]!;
    expect(originalRow.propertyExceptions).toMatchObject({ width: 100, align: "left" });
    expect(originalRow.propertyExceptionsRevision).toBeUndefined();
    expect(originalRow.tblPrExChangeXml).toBeUndefined();

    const originalZip = await JSZip.loadAsync(await exportEditorDocumentToDocx(original.document));
    const originalXml = (await originalZip.file("word/document.xml")?.async("string")) ?? "";
    expect(originalXml).not.toContain("tblPrExChange");
    expect(originalXml).toContain('<w:tblW w:w="2000" w:type="dxa"/>');
    expect(originalXml).toContain('<w:jc w:val="left"/>');

    const final = projectTrackedRevisions(document, "final");
    expect(final.complete).toBe(true);
    const finalRow = firstTable(final.document).rows[0]!;
    expect(finalRow.propertyExceptions).toMatchObject({ width: 200, align: "right" });
    expect(finalRow.propertyExceptionsRevision).toBeUndefined();
    expect(finalRow.tblPrExChangeXml).toBeUndefined();
  });

  it("serializes a typed revision when no raw change XML is available", async () => {
    const document = await importTablePropertyExceptionRevision();
    const row = firstTable(document).rows[0]!;
    row.tblPrExChangeXml = undefined;

    const exported = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(exported);
    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
    expect(xml).toContain("<w:tblPrExChange ");
    expect(xml).toContain('<w:tblW w:w="2000" w:type="dxa"/>');

    const reimported = await importDocxToEditorDocument(exported);
    expect(firstTable(reimported).rows[0]!.propertyExceptionsRevision).toMatchObject({
      id: "71",
      previous: { width: 100, align: "left" },
    });
  });
});
