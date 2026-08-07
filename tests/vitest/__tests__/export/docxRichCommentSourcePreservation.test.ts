import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WORD14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";
const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";
const MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const COMMENTS_EXTENDED_REL =
  "http://schemas.microsoft.com/office/2011/relationships/commentsExtended";

async function buildSourcePackage(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
  <Override PartName="/word/commentsExtended.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}">
  <Relationship Id="rIdComments" Type="${OFFICE_REL_NS}/comments" Target="comments.xml"/>
  <Relationship Id="rIdCommentsEx" Type="${COMMENTS_EXTENDED_REL}" Target="commentsExtended.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}"><w:body>
  <w:p><w:commentRangeStart w:id="3"/><w:r><w:t>Body original</w:t></w:r><w:commentRangeEnd w:id="3"/><w:r><w:commentReference w:id="3"/></w:r></w:p>
  <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body></w:document>`,
  );
  zip.file(
    "word/comments.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" xmlns:w15="${WORD15_NS}" xmlns:mc="${MC_NS}" mc:Ignorable="w15">
  <w:comment w:id="3" w:author="Source Author" w15:entryAttr="keep-entry">
    <w:p w14:paraId="AAAA0001" w15:pAttr="keep-first-p"><w:r><w:rPr><w:b/><w:color w:val="AA0000"/></w:rPr><w:t>Rich</w:t></w:r></w:p>
    <w:p w14:paraId="BBBB0002"><w:r><w:rPr><w:i/></w:rPr><w:t>Comment</w:t></w:r></w:p>
    <w15:commentExtension w15:val="keep-comment-extension"/>
  </w:comment>
</w:comments>`,
  );
  zip.file(
    "word/commentsExtended.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w15:commentsEx xmlns:w15="${WORD15_NS}"><w15:commentEx w15:paraId="AAAA0001" w15:done="1" w15:paraIdParent="PARENT000"/></w15:commentsEx>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

async function importSourceBackedDocument() {
  const buffer = await buildSourcePackage();
  const document = await importDocxToEditorDocument(buffer);
  await attachDocxSourcePackage(document, buffer);
  return document;
}

describe("source-backed rich comment preservation", () => {
  it("reuses rich source body when the plain-text projection is unchanged", async () => {
    const document = await importSourceBackedDocument();
    const body = document.sections?.[0]?.blocks[0];
    if (!body || body.type !== "paragraph") throw new Error("Expected body paragraph.");
    const textRun = body.runs.find((run) => run.kind === "text" && run.text === "Body original");
    if (!textRun) throw new Error("Expected body text run.");
    textRun.text = "Body edited";

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const commentsXml = await output.file("word/comments.xml")?.async("string");
    const extendedXml = await output.file("word/commentsExtended.xml")?.async("string");
    expect(commentsXml).toBeDefined();
    expect(extendedXml).toBeDefined();

    expect(commentsXml!.match(/<w:p\b/g)?.length).toBe(2);
    expect(commentsXml).toContain("<w:b/>");
    expect(commentsXml).toContain("<w:i/>");
    expect(commentsXml).toContain('w:val="AA0000"');
    expect(commentsXml).toContain('w15:entryAttr="keep-entry"');
    expect(commentsXml).toContain('w15:pAttr="keep-first-p"');
    expect(commentsXml).toContain('w15:val="keep-comment-extension"');

    // The rich source body is kept, but the first paragraph keeps the generated
    // identity so commentsExtended remains internally consistent.
    expect(commentsXml).toContain('w14:paraId="40000000"');
    expect(commentsXml).not.toContain('w14:paraId="AAAA0001"');
    expect(commentsXml).toContain('w14:paraId="BBBB0002"');
    expect(extendedXml).toContain('w15:paraId="40000000"');
    expect(extendedXml).toContain('w15:done="1"');
  });

  it("uses canonical new text without resurrecting old Word formatting", async () => {
    const document = await importSourceBackedDocument();
    const comment = document.comments?.order
      .map((id) => document.comments!.items[id]!)
      .find((candidate) => candidate.docxIdHint === 3);
    if (!comment) throw new Error("Expected imported comment.");
    comment.text = "Changed comment";

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const commentsXml = await output.file("word/comments.xml")?.async("string");
    expect(commentsXml).toBeDefined();
    expect(commentsXml).toContain("Changed comment");
    expect(commentsXml).not.toContain(">Rich<");
    expect(commentsXml).not.toContain(">Comment<");
    expect(commentsXml).not.toContain("<w:b/>");
    expect(commentsXml).not.toContain("<w:i/>");

    // Metadata/extensions are orthogonal to the edited text and remain safe.
    expect(commentsXml).toContain('w15:entryAttr="keep-entry"');
    expect(commentsXml).toContain('w15:pAttr="keep-first-p"');
    expect(commentsXml).toContain('w15:val="keep-comment-extension"');
    expect(commentsXml).toContain('w14:paraId="40000000"');
  });
});
