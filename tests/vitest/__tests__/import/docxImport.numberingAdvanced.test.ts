import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { getDocumentParagraphs } from "@/core/model.js";
import { resolveListPrefix } from "@/ui/canvas/listNumbering.js";

async function buildAdvancedNumberingDocx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/numbering.xml",
    `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:abstractNum w:abstractNumId="4">
        <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="upperRoman"/><w:lvlText w:val="%1."/><w:lvlJc w:val="right"/></w:lvl>
        <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%1.%2)"/><w:lvlJc w:val="center"/><w:isLgl/></w:lvl>
      </w:abstractNum>
      <w:num w:numId="7"><w:abstractNumId w:val="4"/><w:lvlOverride w:ilvl="1"><w:startOverride w:val="3"/><w:lvl w:ilvl="1"><w:numFmt w:val="upperLetter"/><w:lvlText w:val="(%1-%2)"/><w:lvlJc w:val="right"/></w:lvl></w:lvlOverride></w:num>
      <w:num w:numId="8"><w:abstractNumId w:val="4"/></w:num>
    </w:numbering>`,
  );
  const paragraph = (numId: string, level: number, text: string) =>
    `<w:p><w:pPr><w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph("7", 0, "A")}${paragraph("7", 1, "B")}${paragraph("8", 0, "C")}${paragraph("8", 1, "D")}<w:sectPr/></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("advanced DOCX numbering import", () => {
  it("imports instances, composite patterns, alignment, legal mode and level overrides", async () => {
    const document = await importDocxToEditorDocument(
      await buildAdvancedNumberingDocx(),
    );
    const [first, overridden, restarted, legal] =
      getDocumentParagraphs(document);

    expect(first!.list).toMatchObject({
      instanceId: "7",
      format: "upperRoman",
      levelText: "%1.",
      alignment: "right",
    });
    expect(overridden!.list).toMatchObject({
      instanceId: "7",
      format: "upperLetter",
      startAt: 3,
      levelText: "(%1-%2)",
      alignment: "right",
    });
    expect(restarted!.list?.instanceId).toBe("8");
    expect(legal!.list).toMatchObject({
      instanceId: "8",
      legal: true,
      levelText: "%1.%2)",
      alignment: "center",
    });
    expect(resolveListPrefix(first!, document)).toBe("I.");
    expect(resolveListPrefix(overridden!, document)).toBe("(I-C)");
    expect(resolveListPrefix(restarted!, document)).toBe("I.");
    expect(resolveListPrefix(legal!, document)).toBe("1.1)");
  });
});
