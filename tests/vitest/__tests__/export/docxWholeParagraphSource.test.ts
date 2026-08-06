import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { cloneRun } from "@/core/document/clone.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import { importDocxInWorker } from "@/import/docx/importDocxInWorker.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";

async function buildDocxWithUnknownParagraphChildren(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rIdOffice" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}" xmlns:cx="urn:oasis:future"><w:body>
      <w:p cx:state="keep">
        <w:pPr><w:jc w:val="left"/></w:pPr>
        <cx:beforeRun cx:value="1"/>
        <w:proofErr w:type="spellStart"/>
        <w:r><w:rPr><w:b/></w:rPr><w:t>Unchanged</w:t></w:r>
        <w:proofErr w:type="spellEnd"/>
        <cx:afterRun cx:value="2"/>
      </w:p>
      <w:sectPr/>
    </w:body></w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

async function exportDocumentXml(
  document: Awaited<ReturnType<typeof importDocxInWorker>>,
): Promise<string> {
  const output = await JSZip.loadAsync(
    await exportEditorDocumentToDocxPreservingSource(document),
  );
  return (await output.file("word/document.xml")?.async("string")) ?? "";
}

function expectUnknownParagraphChildren(xml: string): void {
  expect(xml).toContain('cx:state="keep"');
  expect(xml).toContain('<cx:beforeRun cx:value="1"/>');
  expect(xml).toContain('<w:proofErr w:type="spellStart"/>');
  expect(xml).toContain('<w:proofErr w:type="spellEnd"/>');
  expect(xml).toContain('<cx:afterRun cx:value="2"/>');
}

describe("whole paragraph OOXML source reuse", () => {
  it("preserves unknown direct children and wrappers when the paragraph is unchanged", async () => {
    const document = await importDocxInWorker(
      await buildDocxWithUnknownParagraphChildren(),
    );
    const xml = await exportDocumentXml(document);

    expectUnknownParagraphChildren(xml);
    expect(xml.indexOf("<cx:beforeRun")).toBeLessThan(
      xml.indexOf("<w:t>Unchanged</w:t>"),
    );
    expect(xml.indexOf("<w:t>Unchanged</w:t>")).toBeLessThan(
      xml.indexOf("<cx:afterRun"),
    );
  });

  it("overlays text and formatting edits without moving unknown paragraph children", async () => {
    const document = await importDocxInWorker(
      await buildDocxWithUnknownParagraphChildren(),
    );
    const paragraph = document.sections?.[0]?.blocks[0];
    if (!paragraph || paragraph.type !== "paragraph") {
      throw new Error("Expected an imported paragraph.");
    }

    paragraph.style = { ...(paragraph.style ?? {}), align: "right" };
    const editedRun = cloneRun(paragraph.runs[0]!);
    editedRun.text = "Changed";
    editedRun.styles = {
      ...(editedRun.styles ?? {}),
      bold: false,
      italic: true,
    };
    paragraph.runs = [editedRun];

    const xml = await exportDocumentXml(document);
    expectUnknownParagraphChildren(xml);
    expect(xml).toContain('<w:jc w:val="right"/>');
    expect(xml).toContain("<w:i/>");
    expect(xml).not.toContain("<w:b/>");
    expect(xml).toContain("<w:t>Changed</w:t>");
    expect(xml).not.toContain("<w:t>Unchanged</w:t>");
    expect(xml.indexOf("<cx:beforeRun")).toBeLessThan(
      xml.indexOf("<w:t>Changed</w:t>"),
    );
    expect(xml.indexOf("<w:t>Changed</w:t>")).toBeLessThan(
      xml.indexOf("<cx:afterRun"),
    );
  });
});
