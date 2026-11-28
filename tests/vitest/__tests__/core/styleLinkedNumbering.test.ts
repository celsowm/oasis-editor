import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildListLabels, getDocumentParagraphs, resolveParagraphList } from "@/core/model.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { getEditorListOoxmlNumberingMetadata } from "@/ooxml/word/numberingMetadata.js";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

function numberingXml(withLinks: boolean): string {
  return `<w:numbering ${W}>
    <w:abstractNum w:abstractNumId="3">
      ${withLinks ? '<w:styleLink w:val="LegalList"/><w:numStyleLink w:val="LegalNumbering"/>' : ""}
      <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/></w:lvl>
    </w:abstractNum>
    <w:num w:numId="9"><w:abstractNumId w:val="3"/></w:num>
  </w:numbering>`;
}

function stylesXml(withNumPr: boolean): string {
  return `<w:styles ${W}>
    <w:docDefaults><w:rPrDefault><w:rPr/></w:rPrDefault><w:pPrDefault><w:pPr/></w:pPrDefault></w:docDefaults>
    <w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>
    <w:style w:type="paragraph" w:styleId="LegalList"><w:name w:val="Legal List"/>${withNumPr ? '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="9"/></w:numPr></w:pPr>' : ""}</w:style>
    <w:style w:type="paragraph" w:styleId="Derived"><w:name w:val="Derived"/><w:basedOn w:val="LegalList"/></w:style>
  </w:styles>`;
}

function documentXml(): string {
  return `<w:document ${W}><w:body>
    <w:p><w:pPr><w:pStyle w:val="LegalList"/></w:pPr><w:r><w:t>First</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Derived"/></w:pPr><w:r><w:t>Second</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Normal"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="9"/></w:numPr></w:pPr><w:r><w:t>Third</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body></w:document>`;
}

async function buildDocx(withNumPr = true, withLinks = false): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("word/styles.xml", stylesXml(withNumPr));
  zip.file("word/numbering.xml", numberingXml(withLinks));
  zip.file("word/document.xml", documentXml());
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("style-linked numbering", () => {
  it("applies a list from w:style/w:pPr and inherits it via basedOn", async () => {
    const document = await importDocxToEditorDocument(await buildDocx());
    const [first, second, third] = getDocumentParagraphs(document);

    expect(document.styles!.LegalList.paragraphStyle!.list).toMatchObject({
      kind: "ordered",
      instanceId: "9",
      format: "lowerRoman",
    });
    expect(document.styles!.Derived.paragraphStyle!.list).toMatchObject({
      instanceId: "9",
    });
    expect(resolveParagraphList(first!, document.styles)).toBeDefined();
    expect(first!.list).toBeUndefined(); // not baked into the paragraph

    const labels = buildListLabels(document, "en-US");
    expect(labels.get(first!.id)).toBe("i.");
    expect(labels.get(second!.id)).toBe("ii.");
    expect(labels.get(third!.id)).toBe("iii.");
  });

  it("lets a direct numPr win over the style list", async () => {
    const document = await importDocxToEditorDocument(await buildDocx());
    const [, , third] = getDocumentParagraphs(document);
    expect(third!.list).toMatchObject({ instanceId: "9" });
  });

  it("round-trips w:numPr in style definitions", async () => {
    const document = await importDocxToEditorDocument(await buildDocx());
    const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
    const styles = (await zip.file("word/styles.xml")?.async("string")) ?? "";
    expect(styles).toMatch(/<w:style[^>]*w:styleId="LegalList"[^>]*>.*<w:numPr><w:ilvl w:val="0"\/><w:numId w:val="9"\/><\/w:numPr>/);
    const numbering = (await zip.file("word/numbering.xml")?.async("string")) ?? "";
    expect(numbering).toMatch(/<w:abstractNum w:abstractNumId="3">/);
  });

  it("preserves numStyleLink and styleLink from w:abstractNum", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocx(true, true),
    );
    const list = document.styles!.LegalList.paragraphStyle!.list!;
    expect(getEditorListOoxmlNumberingMetadata(list)).toMatchObject({
      numStyleLink: "LegalNumbering",
      styleLink: "LegalList",
    });
    const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
    const numbering = (await zip.file("word/numbering.xml")?.async("string")) ?? "";
    expect(numbering).toMatch(/<w:styleLink w:val="LegalList"\/>/);
    expect(numbering).toMatch(/<w:numStyleLink w:val="LegalNumbering"\/>/);
  });
});
