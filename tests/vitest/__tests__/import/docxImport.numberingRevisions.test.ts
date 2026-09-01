import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { EditorParagraphNode } from "@/core/model.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

async function importNumberingRevisionDocument() {
  const zip = new JSZip();
  zip.file(
    "word/numbering.xml",
    `<w:numbering xmlns:w="${WORD_NS}">
      <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
      <w:num w:numId="5"><w:abstractNumId w:val="0"/></w:num>
    </w:numbering>`,
  );
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}"><w:body>
      <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/><w:numberingChange w:id="40" w:author="List Author" w:date="2026-02-05T06:07:08Z" w:original="1."/></w:numPr></w:pPr><w:r><w:t>Listed</w:t></w:r></w:p>
      <w:p><w:pPr><w:numPr><w:numberingChange w:id="41" w:author="Removal Author" w:date="2026-02-06T06:07:08Z" w:original="2."/></w:numPr></w:pPr><w:r><w:t>Unlisted now</w:t></w:r></w:p>
      <w:sectPr/>
    </w:body></w:document>`,
  );
  return importDocxToEditorDocument(await zip.generateAsync({ type: "arraybuffer" }));
}

describe("DOCX paragraph numbering revisions", () => {
  it("imports numberingChange independently from the current list", async () => {
    const document = await importNumberingRevisionDocument();
    const first = document.sections![0]!.blocks[0] as EditorParagraphNode;
    const second = document.sections![0]!.blocks[1] as EditorParagraphNode;

    expect(first.list?.instanceId).toBe("5");
    expect(first.numberingRevision).toMatchObject({
      id: "40", author: "List Author", original: "1."
    });
    expect(first.numberingRevision?.date).toBe(Date.parse("2026-02-05T06:07:08Z"));

    expect(second.list).toBeUndefined();
    expect(second.numberingRevision).toMatchObject({
      id: "41", author: "Removal Author", original: "2."
    });
  });

  it("round-trips numberingChange without inventing a list for removed numbering", async () => {
    const document = await importNumberingRevisionDocument();
    const second = document.sections![0]!.blocks[1] as EditorParagraphNode;
    second.runs[0]!.text = "Changed text";
    second.numberingRevision!.original = "2.&old";

    const exported = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(exported);
    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";

    expect(xml).toMatch(/<w:numPr><w:numberingChange\b[^>]*w:id="41"[^>]*w:author="Removal Author"[^>]*w:original="2\.&amp;old"\/><\/w:numPr>/);
    expect(xml).toContain("<w:t>Changed text</w:t>");

    const reimported = await importDocxToEditorDocument(exported);
    const reimportedSecond = reimported.sections![0]!.blocks[1] as EditorParagraphNode;
    expect(reimportedSecond.list).toBeUndefined();
    expect(reimportedSecond.numberingRevision).toMatchObject({
      id: "41", original: "2.&old"
    });
  });
});
