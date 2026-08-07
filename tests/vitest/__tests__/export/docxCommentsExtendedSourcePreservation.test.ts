import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WORD14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";
const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";
const MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";
const COMMENTS_EXTENDED_REL =
  "http://schemas.microsoft.com/office/2011/relationships/commentsExtended";
const TEST_EXTENSION_NS = "urn:oasis:test-comment-extension";

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
  <Relationship Id="rIdCommentsSource" Type="${OFFICE_REL_NS}/comments" Target="comments.xml"/>
  <Relationship Id="rIdCommentsExtendedSource" Type="${COMMENTS_EXTENDED_REL}" Target="commentsExtended.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}">
  <w:body>
    <w:p>
      <w:commentRangeStart w:id="3"/><w:r><w:t>A</w:t></w:r><w:commentRangeEnd w:id="3"/><w:r><w:commentReference w:id="3"/></w:r>
      <w:commentRangeStart w:id="7"/><w:r><w:t>B</w:t></w:r><w:commentRangeEnd w:id="7"/><w:r><w:commentReference w:id="7"/></w:r>
    </w:p>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`,
  );
  zip.file(
    "word/comments.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}">
  <w:comment w:id="3" w:author="Parent"><w:p w14:paraId="AAAA0001"><w:r><w:t>Parent comment</w:t></w:r></w:p></w:comment>
  <w:comment w:id="7" w:author="Child"><w:p w14:paraId="BBBB0002"><w:r><w:t>Child comment</w:t></w:r></w:p></w:comment>
</w:comments>`,
  );
  zip.file(
    "word/commentsExtended.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w15:commentsEx xmlns:w15="${WORD15_NS}" xmlns:mc="${MC_NS}" xmlns:cx="${TEST_EXTENSION_NS}" mc:Ignorable="cx" cx:rootAttr="keep-root">
  <w15:commentEx w15:paraId="AAAA0001" w15:done="0" cx:threadToken="parent"/>
  <w15:commentEx w15:paraId="BBBB0002" w15:paraIdParent="AAAA0001" w15:done="1" cx:threadToken="child"><cx:childMetadata cx:val="keep-child"/></w15:commentEx>
  <cx:rootMetadata cx:val="keep-root-child"/>
</w15:commentsEx>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed commentsExtended preservation", () => {
  it("remaps parent paraId while generated done state wins over source metadata", async () => {
    const buffer = await buildSourcePackage();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);

    const child = document.comments?.order
      .map((id) => document.comments!.items[id]!)
      .find((comment) => comment.docxIdHint === 7);
    if (!child) {
      throw new Error("Expected imported child comment.");
    }
    expect(child.resolved).toBe(true);
    child.resolved = false;

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const commentsXml = await output.file("word/comments.xml")?.async("string");
    const extendedXml = await output
      .file("word/commentsExtended.xml")
      ?.async("string");
    expect(commentsXml).toBeDefined();
    expect(extendedXml).toBeDefined();

    // Imported w:ids remain stable, while body paraIds are regenerated by the
    // current comment serializer in deterministic order.
    expect(commentsXml).toContain('w:id="3"');
    expect(commentsXml).toContain('w:id="7"');
    expect(commentsXml).toContain('w14:paraId="40000000"');
    expect(commentsXml).toContain('w14:paraId="40000001"');

    // Thread metadata follows the regenerated paraIds instead of dangling back
    // to the source values. The user's resolved-state edit remains authoritative.
    expect(extendedXml).toContain('w15:paraId="40000001"');
    expect(extendedXml).toContain('w15:paraIdParent="40000000"');
    expect(extendedXml).toMatch(
      /w15:commentEx[^>]*w15:paraId="40000001"[^>]*w15:done="0"/,
    );
    expect(extendedXml).not.toContain('w15:paraIdParent="AAAA0001"');

    expect(extendedXml).toContain('mc:Ignorable="cx"');
    expect(extendedXml).toContain('cx:rootAttr="keep-root"');
    expect(extendedXml).toContain('cx:threadToken="parent"');
    expect(extendedXml).toContain('cx:threadToken="child"');
    expect(extendedXml).toContain('cx:val="keep-child"');
    expect(extendedXml).toContain('cx:val="keep-root-child"');
  });
});
