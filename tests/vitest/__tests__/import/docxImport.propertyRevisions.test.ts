import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { EditorParagraphNode } from "@/core/model.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

async function importPropertyRevisionDocument() {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}"><w:body>
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:pPrChange w:id="21" w:author="Paragraph Author" w:date="2026-02-03T04:05:06Z">
            <w:pPr><w:jc w:val="right"/><w:keepNext/></w:pPr>
          </w:pPrChange>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:i/>
            <w:rPrChange w:id="20" w:author="Run Author" w:date="2026-02-02T03:04:05Z">
              <w:rPr><w:b/><w:color w:val="FF0000"/></w:rPr>
            </w:rPrChange>
          </w:rPr>
          <w:t>Original</w:t>
        </w:r>
      </w:p>
      <w:sectPr/>
    </w:body></w:document>`,
  );
  return importDocxToEditorDocument(
    await zip.generateAsync({ type: "arraybuffer" }),
  );
}

describe("DOCX run and paragraph property revisions", () => {
  it("imports current properties and their previous tracked snapshots", async () => {
    const document = await importPropertyRevisionDocument();
    const paragraph = document.sections![0]!.blocks[0] as EditorParagraphNode;
    const run = paragraph.runs[0]!;

    expect(run.styles?.italic).toBe(true);
    expect(run.styles?.propertyRevision).toMatchObject({
      id: "20",
      type: "property",
      author: "Run Author",
      previous: { bold: true },
    });
    expect(run.styles?.propertyRevision?.date).toBe(
      Date.parse("2026-02-02T03:04:05Z"),
    );

    expect(paragraph.style?.align).toBe("center");
    expect(paragraph.style?.propertyRevision).toMatchObject({
      id: "21",
      type: "property",
      author: "Paragraph Author",
      previous: { align: "right", keepWithNext: true },
    });
  });

  it("rebuilds edited content with canonical rPrChange and pPrChange", async () => {
    const document = await importPropertyRevisionDocument();
    const paragraph = document.sections![0]!.blocks[0] as EditorParagraphNode;
    const run = paragraph.runs[0]!;

    run.text = "Changed";
    run.styles = { ...run.styles, italic: undefined, underline: true };
    paragraph.style = { ...paragraph.style, align: "left" };

    const exported = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(exported);
    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";

    expect(xml).toContain("<w:t>Changed</w:t>");
    expect(xml).toMatch(
      /<w:rPrChange\b[^>]*w:id="20"[^>]*w:author="Run Author"[^>]*>[\s\S]*?<w:rPr>[\s\S]*?<w:b\/>[\s\S]*?<w:color w:val="FF0000"\/>[\s\S]*?<\/w:rPr>[\s\S]*?<\/w:rPrChange>/,
    );
    expect(xml).toMatch(
      /<w:pPrChange\b[^>]*w:id="21"[^>]*w:author="Paragraph Author"[^>]*>[\s\S]*?<w:pPr>[\s\S]*?<w:jc w:val="right"\/>[\s\S]*?<w:keepNext\/>[\s\S]*?<\/w:pPr>[\s\S]*?<\/w:pPrChange>/,
    );
    expect(xml.match(/<w:rPrChange\b/g)).toHaveLength(1);
    expect(xml.match(/<w:pPrChange\b/g)).toHaveLength(1);

    const reimported = await importDocxToEditorDocument(exported);
    const reimportedParagraph = reimported.sections![0]!.blocks[0] as EditorParagraphNode;
    expect(reimportedParagraph.runs[0]!.styles?.propertyRevision).toMatchObject({
      id: "20",
      previous: { bold: true },
    });
    expect(reimportedParagraph.style?.propertyRevision).toMatchObject({
      id: "21",
      previous: { align: "right", keepWithNext: true },
    });
  });
});
