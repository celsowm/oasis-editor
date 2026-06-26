import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import type { EditorParagraphNode } from "@/core/model.js";

const SECT_PR = `<w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>`;

async function importBody(bodyXml: string) {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyXml}${SECT_PR}</w:body>
</w:document>`,
  );
  return importDocxToEditorDocument(
    await zip.generateAsync({ type: "arraybuffer" }),
  );
}

async function reexport(document: Awaited<ReturnType<typeof importBody>>) {
  const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
  return (await zip.file("word/document.xml")?.async("string")) ?? "";
}

function bodyBlocks(document: Awaited<ReturnType<typeof importBody>>) {
  return document.sections![0]!.blocks;
}

describe("DOCX block-level SDT (content control) round-trip", () => {
  const SINGLE_SDT = `
    <w:sdt>
      <w:sdtPr>
        <w:alias w:val="Title"/>
        <w:tag w:val="doc-title"/>
        <w:id w:val="12345"/>
      </w:sdtPr>
      <w:sdtContent>
        <w:p><w:r><w:t>Inside the control</w:t></w:r></w:p>
      </w:sdtContent>
    </w:sdt>`;

  it("unwraps the content so it still renders/edits as a normal block", async () => {
    const document = await importBody(SINGLE_SDT);
    const blocks = bodyBlocks(document);
    expect(blocks).toHaveLength(1);
    const paragraph = blocks[0] as EditorParagraphNode;
    expect(paragraph.type).toBe("paragraph");
    expect(paragraph.runs[0]!.text).toBe("Inside the control");
  });

  it("preserves the w:sdtPr wrapper on the block", async () => {
    const document = await importBody(SINGLE_SDT);
    const paragraph = bodyBlocks(document)[0] as EditorParagraphNode;
    expect(paragraph.sdtWrappers).toHaveLength(1);
    const wrapper = paragraph.sdtWrappers![0]!;
    expect(wrapper.groupId).toMatch(/^sdt:/);
    expect(wrapper.sdtPrXml).toContain("w:tag");
    expect(wrapper.sdtPrXml).toContain("doc-title");
  });

  it("re-wraps the content in a single w:sdt on export", async () => {
    const document = await importBody(SINGLE_SDT);
    const xml = await reexport(document);
    expect(xml).toContain("<w:sdt>");
    expect(xml).toContain("<w:sdtContent>");
    expect(xml).toContain('w:val="doc-title"');
    expect(xml).toContain("Inside the control");
    // Exactly one content control, wrapping the paragraph.
    expect(xml.split("<w:sdt>").length - 1).toBe(1);
    expect(xml.indexOf("<w:sdtContent>")).toBeLessThan(
      xml.indexOf("Inside the control"),
    );
  });

  it("coalesces a multi-paragraph control back into one w:sdt", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr><w:tag w:val="rich"/></w:sdtPr>
        <w:sdtContent>
          <w:p><w:r><w:t>First</w:t></w:r></w:p>
          <w:p><w:r><w:t>Second</w:t></w:r></w:p>
        </w:sdtContent>
      </w:sdt>`);
    const blocks = bodyBlocks(document);
    expect(blocks).toHaveLength(2);
    const [a, b] = blocks as EditorParagraphNode[];
    // Both blocks share the same wrapper group so export re-wraps them together.
    expect(a!.sdtWrappers?.[0]?.groupId).toBe(b!.sdtWrappers?.[0]?.groupId);

    const xml = await reexport(document);
    expect(xml.split("<w:sdt>").length - 1).toBe(1);
    expect(xml).toContain("First");
    expect(xml).toContain("Second");
  });

  it("re-wraps nested content controls from the inside out", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr><w:tag w:val="outer"/></w:sdtPr>
        <w:sdtContent>
          <w:p><w:r><w:t>Before</w:t></w:r></w:p>
          <w:sdt>
            <w:sdtPr><w:tag w:val="inner"/></w:sdtPr>
            <w:sdtContent>
              <w:p><w:r><w:t>Nested</w:t></w:r></w:p>
            </w:sdtContent>
          </w:sdt>
        </w:sdtContent>
      </w:sdt>`);
    const blocks = bodyBlocks(document) as EditorParagraphNode[];
    expect(blocks).toHaveLength(2);
    // "Before" is under the outer control only; "Nested" under outer then inner.
    expect(blocks[0]!.sdtWrappers).toHaveLength(1);
    expect(blocks[1]!.sdtWrappers).toHaveLength(2);

    const xml = await reexport(document);
    expect(xml).toContain('w:val="outer"');
    expect(xml).toContain('w:val="inner"');
    expect(xml.split("<w:sdt>").length - 1).toBe(2);
    // The inner tag must appear after the outer one (outer wraps inner).
    expect(xml.indexOf('w:val="outer"')).toBeLessThan(
      xml.indexOf('w:val="inner"'),
    );
  });

  it("leaves ordinary blocks free of sdt wrappers", async () => {
    const document = await importBody(`<w:p><w:r><w:t>Plain</w:t></w:r></w:p>`);
    const paragraph = bodyBlocks(document)[0] as EditorParagraphNode;
    expect(paragraph.sdtWrappers).toBeUndefined();
    const xml = await reexport(document);
    expect(xml).not.toContain("<w:sdt>");
  });
});
