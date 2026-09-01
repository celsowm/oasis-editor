import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { EditorParagraphNode } from "@/core/model.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";

async function importBody(body: string) {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}" xmlns:w15="${WORD15_NS}"><w:body>${body}<w:sectPr/></w:body></w:document>`,
  );
  return importDocxToEditorDocument(
    await zip.generateAsync({ type: "arraybuffer" }),
  );
}

async function exportXml(
  document: Awaited<ReturnType<typeof importBody>>,
): Promise<string> {
  const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
  return (await zip.file("word/document.xml")?.async("string")) ?? "";
}

function blocks(document: Awaited<ReturnType<typeof importBody>>) {
  return document.sections![0]!.blocks;
}

describe("modern Word content controls", () => {
  it("parses and emits canonical attribute-based w:dataBinding", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr>
          <w:tag w:val="customer-name"/>
          <w:dataBinding
            w:prefixMappings="xmlns:ns='urn:customers'"
            w:xpath="/ns:customers/ns:customer[1]/ns:name"
            w:storeItemID="{ABC-123}"/>
          <w:text/>
        </w:sdtPr>
        <w:sdtContent><w:p><w:r><w:t>Acme</w:t></w:r></w:p></w:sdtContent>
      </w:sdt>`);

    const sdtPr = blocks(document)[0]!.sdtWrappers![0]!.sdtPr;
    expect(sdtPr.dataBinding).toEqual({
      prefixMappings: "xmlns:ns='urn:customers'",
      xpath: "/ns:customers/ns:customer[1]/ns:name",
      storeItemID: "{ABC-123}",
    });

    const xml = await exportXml(document);
    expect(xml).toContain("<w:dataBinding ");
    expect(xml).toContain("w:prefixMappings=\"xmlns:ns=&apos;urn:customers&apos;\"");
    expect(xml).toContain(
      'w:xpath="/ns:customers/ns:customer[1]/ns:name"',
    );
    expect(xml).toContain('w:storeItemID="{ABC-123}"');
    expect(xml).not.toContain("<w:prefixMappings");
    expect(xml).not.toContain("<w:xpath");
    expect(xml).not.toContain("<w:storeItemID");
  });

  it("parses Word 2013 repeating-section metadata and item semantics", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr>
          <w:tag w:val="people"/>
          <w15:repeatingSection>
            <w15:sectionTitle w15:val="Person"/>
            <w15:doNotAllowInsertDeleteSection w15:val="1"/>
          </w15:repeatingSection>
        </w:sdtPr>
        <w:sdtContent>
          <w:sdt>
            <w:sdtPr>
              <w:tag w:val="person-item"/>
              <w15:repeatingSectionItem/>
            </w:sdtPr>
            <w:sdtContent>
              <w:p><w:r><w:t>Alice</w:t></w:r></w:p>
            </w:sdtContent>
          </w:sdt>
        </w:sdtContent>
      </w:sdt>`);

    const paragraph = blocks(document)[0] as EditorParagraphNode;
    expect(paragraph.sdtWrappers).toHaveLength(2);
    expect(paragraph.sdtWrappers![0]!.sdtPr.subtype).toEqual({
      kind: "repeatingSection",
    });
    expect(
      paragraph.sdtWrappers![0]!.sdtPr.repeatingSectionProperties,
    ).toEqual({
      sectionTitle: "Person",
      doNotAllowInsertDeleteSection: true,
    });
    expect(paragraph.sdtWrappers![1]!.sdtPr.subtype).toEqual({
      kind: "repeatingSectionItem",
    });

    paragraph.runs[0]!.text = "Bob";
    const xml = await exportXml(document);
    expect(xml).toContain("<w15:repeatingSection ");
    expect(xml).toContain('w15:sectionTitle w15:val="Person"');
    expect(xml).toContain(
      'w15:doNotAllowInsertDeleteSection w15:val="1"',
    );
    expect(xml).toContain("<w15:repeatingSectionItem ");
    expect(xml).not.toContain("<w:repeatingSection");
    expect(xml).not.toContain("<w:repeatingSectionItem");
    expect(xml).toContain("Bob");
  });
});
