import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { getDocumentParagraphs } from "@/core/model.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { getEditorListOoxmlNumberingMetadata } from "@/ooxml/word/numberingMetadata.js";

async function buildUncommonNumberingDocx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/numbering.xml",
    `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:abstractNum w:abstractNumId="12">
        <w:lvl w:ilvl="0">
          <w:start w:val="1"/>
          <w:numFmt w:val="chineseCounting"/>
          <w:lvlRestart w:val="2"/>
          <w:pStyle w:val="ListSpecial"/>
          <w:lvlText w:val="%1、"/>
          <w:lvlJc w:val="left"/>
        </w:lvl>
      </w:abstractNum>
      <w:num w:numId="21"><w:abstractNumId w:val="12"/></w:num>
    </w:numbering>`,
  );
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
      <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="21"/></w:numPr></w:pPr><w:r><w:t>Item</w:t></w:r></w:p>
      <w:sectPr/>
    </w:body></w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

async function exportedNumberingXml(
  document: Awaited<ReturnType<typeof importDocxToEditorDocument>>,
): Promise<string> {
  const output = await JSZip.loadAsync(
    await exportEditorDocumentToDocx(document),
  );
  return (await output.file("word/numbering.xml")?.async("string")) ?? "";
}

describe("uncommon OOXML numbering metadata", () => {
  it("preserves the original ST_NumberFormat, lvlRestart, and pStyle", async () => {
    const document = await importDocxToEditorDocument(
      await buildUncommonNumberingDocx(),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;
    if (!paragraph.list) {
      throw new Error("Expected an imported list paragraph.");
    }

    expect(paragraph.list.kind).toBe("ordered");
    expect(paragraph.list.format).toBeUndefined();
    expect(getEditorListOoxmlNumberingMetadata(paragraph.list)).toMatchObject({
      format: "chineseCounting",
      restartAfterLevel: 2,
      paragraphStyleId: "ListSpecial",
    });

    const xml = await exportedNumberingXml(document);
    expect(xml).toContain('<w:numFmt w:val="chineseCounting"/>');
    expect(xml).toContain('<w:lvlRestart w:val="2"/>');
    expect(xml).toContain('<w:pStyle w:val="ListSpecial"/>');
    expect(xml).toContain('<w:lvlText w:val="%1、"/>');
  });

  it("lets an explicit editor format change override the preserved source token", async () => {
    const document = await importDocxToEditorDocument(
      await buildUncommonNumberingDocx(),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;
    if (!paragraph.list) {
      throw new Error("Expected an imported list paragraph.");
    }

    paragraph.list.format = "decimal";
    const xml = await exportedNumberingXml(document);
    expect(xml).toContain('<w:numFmt w:val="decimal"/>');
    expect(xml).not.toContain("chineseCounting");
    expect(xml).toContain('<w:lvlRestart w:val="2"/>');
    expect(xml).toContain('<w:pStyle w:val="ListSpecial"/>');
  });
});
