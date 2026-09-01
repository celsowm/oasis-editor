import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { EditorParagraphNode, EditorTextRun } from "@/core/model.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

async function importParagraph(innerXml: string) {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}"><w:body><w:p>${innerXml}</w:p><w:sectPr/></w:body></w:document>`,
  );
  return importDocxToEditorDocument(
    await zip.generateAsync({ type: "arraybuffer" }),
  );
}

function paragraphOf(
  document: Awaited<ReturnType<typeof importParagraph>>,
): EditorParagraphNode {
  return document.sections![0]!.blocks[0] as EditorParagraphNode;
}

async function documentXml(
  document: Awaited<ReturnType<typeof importParagraph>>,
): Promise<string> {
  const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
  return (await zip.file("word/document.xml")?.async("string")) ?? "";
}

describe("DOCX inline SDT", () => {
  it("imports inline content instead of dropping it", async () => {
    const document = await importParagraph(`
      <w:r><w:t>Before </w:t></w:r>
      <w:sdt>
        <w:sdtPr><w:tag w:val="customer"/></w:sdtPr>
        <w:sdtContent><w:r><w:t>Alice</w:t></w:r></w:sdtContent>
      </w:sdt>
      <w:r><w:t> after</w:t></w:r>`);

    const paragraph = paragraphOf(document);
    expect(paragraph.runs.map((run) => run.text).join("")).toBe(
      "Before Alice after",
    );
    expect(paragraph.runs).toHaveLength(3);
    expect(paragraph.runs[1]!.sdtWrappers).toHaveLength(1);
    expect(paragraph.runs[1]!.sdtWrappers![0]!.sdtPr.tag).toBe("customer");
    expect(paragraph.runs[0]!.sdtWrappers).toBeUndefined();
    expect(paragraph.runs[2]!.sdtWrappers).toBeUndefined();
  });

  it("preserves nested inline content controls outermost first", async () => {
    const document = await importParagraph(`
      <w:sdt>
        <w:sdtPr><w:tag w:val="outer"/></w:sdtPr>
        <w:sdtContent>
          <w:r><w:t>A</w:t></w:r>
          <w:sdt>
            <w:sdtPr><w:tag w:val="inner"/></w:sdtPr>
            <w:sdtContent><w:r><w:t>B</w:t></w:r></w:sdtContent>
          </w:sdt>
        </w:sdtContent>
      </w:sdt>`);

    const paragraph = paragraphOf(document);
    expect(paragraph.runs.map((run) => run.text).join("")).toBe("AB");
    expect(paragraph.runs[0]!.sdtWrappers?.map((w) => w.sdtPr.tag)).toEqual([
      "outer",
    ]);
    expect(paragraph.runs[1]!.sdtWrappers?.map((w) => w.sdtPr.tag)).toEqual([
      "outer",
      "inner",
    ]);
  });

  it("canonically re-wraps an inline SDT after the run structure changes", async () => {
    const document = await importParagraph(`
      <w:r><w:t>Before </w:t></w:r>
      <w:sdt>
        <w:sdtPr><w:tag w:val="customer"/></w:sdtPr>
        <w:sdtContent><w:r><w:t>Alice</w:t></w:r></w:sdtContent>
      </w:sdt>
      <w:r><w:t> after</w:t></w:r>`);
    const paragraph = paragraphOf(document);
    const bound = paragraph.runs[1]!;
    const first: EditorTextRun = {
      ...bound,
      id: `${bound.id}:1`,
      text: "Ali",
    };
    const second: EditorTextRun = {
      ...bound,
      id: `${bound.id}:2`,
      text: "cia",
    };
    paragraph.runs.splice(1, 1, first, second);

    const xml = await documentXml(document);
    expect(xml).toContain("<w:sdt>");
    expect(xml).toContain('<w:tag w:val="customer"/>');
    expect(xml).toContain("<w:sdtContent>");
    expect(xml.indexOf("Ali")).toBeGreaterThan(xml.indexOf("<w:sdtContent>"));
    expect(xml.indexOf("cia")).toBeGreaterThan(xml.indexOf("Ali"));
    expect(xml.indexOf("</w:sdtContent>")).toBeGreaterThan(xml.indexOf("cia"));
    expect(xml.split("<w:sdt>").length - 1).toBe(1);
  });
});
