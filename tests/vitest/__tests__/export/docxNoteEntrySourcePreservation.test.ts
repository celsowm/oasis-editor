import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createEditorParagraphFromRuns } from "@/core/editorState.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";
const OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

async function buildSourcePackage(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rIdFootnotesSource" Type="${OFFICE_REL_NS}/footnotes" Target="footnotes.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}"><w:body>
  <w:p><w:r><w:t>Body</w:t></w:r><w:r><w:footnoteReference w:id="17"/></w:r></w:p>
  <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body></w:document>`,
  );
  zip.file(
    "word/footnotes.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="${WORD_NS}" xmlns:w15="${WORD15_NS}">
  <w:footnote w:type="separator" w:id="-1" w15:separatorAttr="keep-separator"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>
  <w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>
  <w:footnote w:type="continuationNotice" w:id="5" w15:noticeAttr="keep-notice"><w:p><w:r><w:t>Continued</w:t></w:r></w:p></w:footnote>
  <w:footnote w:id="17" w15:entryAttr="keep-entry">
    <w:p><w:r><w:footnoteRef/><w:t>Active source note</w:t></w:r></w:p>
    <w15:entryExtension w15:val="keep-entry-extension"/>
    <w:sdt><w:sdtContent><w:p><w:r><w:t>Opaque SDT note content</w:t></w:r></w:p></w:sdtContent></w:sdt>
  </w:footnote>
  <w:footnote w:id="99"><w:p><w:r><w:footnoteRef/><w:t>Unreferenced source note</w:t></w:r></w:p></w:footnote>
</w:footnotes>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

async function importSourceBackedDocument() {
  const buffer = await buildSourcePackage();
  const document = await importDocxToEditorDocument(buffer);
  await attachDocxSourcePackage(document, buffer);
  return document;
}

function addNewReferencedFootnote(
  document: Awaited<ReturnType<typeof importSourceBackedDocument>>,
): void {
  if (!document.footnotes || !document.sections?.[0]) {
    throw new Error("Expected imported footnote registry and section.");
  }
  const newId = "footnote:new";
  document.footnotes.items[newId] = {
    id: newId,
    blocks: [createEditorParagraphFromRuns([{ text: "New Oasis note" }])],
  };
  const paragraph = document.sections[0].blocks[0];
  if (!paragraph || paragraph.type !== "paragraph") {
    throw new Error("Expected body paragraph.");
  }
  paragraph.runs.push({
    id: "run:new-footnote-ref",
    kind: "footnoteReference",
    text: "",
    footnoteReference: { footnoteId: newId },
  });
}

describe("source-backed note entry preservation", () => {
  it("keeps imported ids, opaque entry markup, live unreferenced notes and allocates new ids above source max", async () => {
    const document = await importSourceBackedDocument();
    addNewReferencedFootnote(document);

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const documentXml = await output.file("word/document.xml")?.async("string");
    const footnotesXml = await output.file("word/footnotes.xml")?.async("string");
    expect(documentXml).toBeDefined();
    expect(footnotesXml).toBeDefined();

    expect(documentXml).toContain('w:footnoteReference w:id="17"');
    expect(documentXml).toContain('w:footnoteReference w:id="100"');
    expect(footnotesXml).toContain('<w:footnote w:id="17"');
    expect(footnotesXml).toContain('<w:footnote w:id="99"');
    expect(footnotesXml).toContain('<w:footnote w:id="100"');
    expect(footnotesXml).toContain("New Oasis note");
    expect(footnotesXml).toContain("Unreferenced source note");

    expect(footnotesXml).toContain('w15:separatorAttr="keep-separator"');
    expect(footnotesXml).toContain('w:type="continuationNotice"');
    expect(footnotesXml).toContain('w15:noticeAttr="keep-notice"');
    expect(footnotesXml).toContain('w15:entryAttr="keep-entry"');
    expect(footnotesXml).toContain('w15:val="keep-entry-extension"');
    expect(footnotesXml).toContain("<w:sdt>");
    expect(footnotesXml).toContain("Opaque SDT note content");
  });

  it("does not resurrect a source note removed from the registry", async () => {
    const document = await importSourceBackedDocument();
    const sourceOnly = Object.values(document.footnotes?.items ?? {}).find(
      (note) => note.docxId === 99,
    );
    if (!sourceOnly || !document.footnotes) {
      throw new Error("Expected imported unreferenced source note 99.");
    }
    delete document.footnotes.items[sourceOnly.id];

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const footnotesXml = await output.file("word/footnotes.xml")?.async("string");
    expect(footnotesXml).toBeDefined();
    expect(footnotesXml).not.toContain('<w:footnote w:id="99"');
    expect(footnotesXml).not.toContain("Unreferenced source note");
  });
});
