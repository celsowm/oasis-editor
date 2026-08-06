import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxInWorker } from "@/import/docx/importDocxInWorker.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import { cloneRun } from "@/core/document/clone.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";
const WORD14_NS =
  "http://schemas.microsoft.com/office/word/2010/wordml";

async function buildDocxWithUnknownInlineXml(): Promise<ArrayBuffer> {
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
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="${PACKAGE_REL_NS}">
  <Relationship Id="rIdOffice" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" xmlns:cx="urn:oasis:test">
  <w:body>
    <w:p xmlns:w14="${WORD14_NS}" xmlns:cx="urn:oasis:test" w14:paraId="A1B2C3D4" cx:paragraphAttr="keep">
      <w:pPr xmlns:cx="urn:oasis:test">
        <w:jc w:val="center"/>
        <cx:paragraphProperty cx:value="keep"/>
      </w:pPr>
      <w:r xmlns:cx="urn:oasis:test" cx:runAttr="keep">
        <w:rPr><w:b/><cx:runProperty cx:value="keep"/></w:rPr>
        <w:t>Alpha</w:t>
        <cx:runTail cx:value="keep"/>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

async function exportedDocumentXml(
  document: Awaited<ReturnType<typeof importDocxInWorker>>,
): Promise<string> {
  const output = await JSZip.loadAsync(
    await exportEditorDocumentToDocxPreservingSource(document),
  );
  return (await output.file("word/document.xml")?.async("string")) ?? "";
}

describe("inline OOXML source preservation", () => {
  it("reuses unchanged paragraph properties and run subtrees in source order", async () => {
    const document = await importDocxInWorker(
      await buildDocxWithUnknownInlineXml(),
    );
    const xml = await exportedDocumentXml(document);

    expect(xml).toContain('w14:paraId="A1B2C3D4"');
    expect(xml).toContain('cx:paragraphAttr="keep"');
    expect(xml).toContain('<cx:paragraphProperty cx:value="keep"/>');
    expect(xml).toContain('cx:runAttr="keep"');
    expect(xml).toContain('<cx:runProperty cx:value="keep"/>');
    expect(xml).toContain('<cx:runTail cx:value="keep"/>');
    expect(xml.indexOf("<w:jc")).toBeLessThan(
      xml.indexOf("<cx:paragraphProperty"),
    );
    expect(xml.indexOf("<w:t>Alpha</w:t>")).toBeLessThan(
      xml.indexOf("<cx:runTail"),
    );
  });

  it("patches a text edit into the original run without dropping unknown XML", async () => {
    const document = await importDocxInWorker(
      await buildDocxWithUnknownInlineXml(),
    );
    const firstBlock = document.sections?.[0]?.blocks[0];
    if (!firstBlock || firstBlock.type !== "paragraph") {
      throw new Error("Expected an imported paragraph.");
    }

    const editedRun = cloneRun(firstBlock.runs[0]!);
    editedRun.text = "Beta";
    firstBlock.runs = [editedRun];

    const xml = await exportedDocumentXml(document);
    expect(xml).toContain("<w:t>Beta</w:t>");
    expect(xml).not.toContain("<w:t>Alpha</w:t>");
    expect(xml).toContain('cx:runAttr="keep"');
    expect(xml).toContain('<cx:runProperty cx:value="keep"/>');
    expect(xml).toContain('<cx:runTail cx:value="keep"/>');
    expect(xml).toContain('<cx:paragraphProperty cx:value="keep"/>');
    expect(xml.indexOf("<w:t>Beta</w:t>")).toBeLessThan(
      xml.indexOf("<cx:runTail"),
    );
  });

  it("keeps unknown run XML while modelled formatting is changed", async () => {
    const document = await importDocxInWorker(
      await buildDocxWithUnknownInlineXml(),
    );
    const firstBlock = document.sections?.[0]?.blocks[0];
    if (!firstBlock || firstBlock.type !== "paragraph") {
      throw new Error("Expected an imported paragraph.");
    }

    const editedRun = cloneRun(firstBlock.runs[0]!);
    editedRun.styles = {
      ...(editedRun.styles ?? {}),
      bold: false,
      italic: true,
    };
    firstBlock.runs = [editedRun];

    const xml = await exportedDocumentXml(document);
    expect(xml).toContain("<w:i/>");
    expect(xml).not.toContain("<w:b/>");
    expect(xml).toContain('cx:runAttr="keep"');
    expect(xml).toContain('<cx:runProperty cx:value="keep"/>');
    expect(xml).toContain('<cx:runTail cx:value="keep"/>');
    expect(xml.indexOf("<w:i/>")).toBeLessThan(
      xml.indexOf("<cx:runProperty"),
    );
  });
});
