import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { getDocumentParagraphs } from "./docxTestHelpers.js";
import type { EditorComment, EditorDocument } from "@/core/model.js";

/**
 * Build a minimal .docx with a body plus optional `word/comments.xml` and
 * `word/commentsExtended.xml` parts.
 */
async function buildCommentDocx(
  bodyXml: string,
  commentsXml?: string,
  commentsExtendedXml?: string,
): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${bodyXml}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`,
  );
  if (commentsXml) {
    zip.file("word/comments.xml", commentsXml);
  }
  if (commentsExtendedXml) {
    zip.file("word/commentsExtended.xml", commentsExtendedXml);
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

const COMMENTS_NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" ' +
  'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"';

function comments(document: EditorDocument): EditorComment[] {
  const registry = document.comments;
  if (!registry) return [];
  return registry.order.map((id) => registry.items[id]!);
}

async function exportPart(
  document: EditorDocument,
  path: string,
): Promise<string> {
  const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
  return (await zip.file(path)?.async("string")) ?? "";
}

describe("DOCX import: comments", () => {
  it("imports a commented range plus its body", async () => {
    const docx = await buildCommentDocx(
      `<w:p>
        <w:r><w:t>Hello </w:t></w:r>
        <w:commentRangeStart w:id="0"/>
        <w:r><w:t>world</w:t></w:r>
        <w:commentRangeEnd w:id="0"/>
        <w:r><w:commentReference w:id="0"/></w:r>
        <w:r><w:t>!</w:t></w:r>
      </w:p>`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments ${COMMENTS_NS}>
  <w:comment w:id="0" w:author="Celso Fontes" w:date="2026-06-14T22:41:00Z" w:initials="CF">
    <w:p w14:paraId="5FE4A3C2"><w:r><w:t>Looks good</w:t></w:r></w:p>
  </w:comment>
</w:comments>`,
    );
    const document = await importDocxToEditorDocument(docx);

    // Marker runs are stripped; only the real text runs remain.
    const paragraph = getDocumentParagraphs(document)[0]!;
    expect(paragraph.runs.map((r) => r.text).join("")).toBe("Hello world!");

    const list = comments(document);
    expect(list).toHaveLength(1);
    const c = list[0]!;
    expect(c.author).toBe("Celso Fontes");
    expect(c.initials).toBe("CF");
    expect(c.text).toBe("Looks good");
    expect(c.date).toBe(Date.parse("2026-06-14T22:41:00Z"));
    expect(c.start?.paragraphId).toBe(paragraph.id);
    expect(c.start?.offset).toBe(6); // after "Hello "
    expect(c.end?.paragraphId).toBe(paragraph.id);
    expect(c.end?.offset).toBe(11); // after "Hello world"
    expect(c.docxIdHint).toBe(0);
  });

  it("reads the resolved flag from commentsExtended.xml", async () => {
    const docx = await buildCommentDocx(
      `<w:p>
        <w:commentRangeStart w:id="0"/>
        <w:r><w:t>text</w:t></w:r>
        <w:commentRangeEnd w:id="0"/>
        <w:r><w:commentReference w:id="0"/></w:r>
      </w:p>`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments ${COMMENTS_NS}>
  <w:comment w:id="0" w:author="A"><w:p w14:paraId="AAAA0001"><w:r><w:t>done one</w:t></w:r></w:p></w:comment>
</w:comments>`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w15:commentsEx ${COMMENTS_NS}>
  <w15:commentEx w15:paraId="AAAA0001" w15:done="1"/>
</w15:commentsEx>`,
    );
    const document = await importDocxToEditorDocument(docx);
    expect(comments(document)[0]!.resolved).toBe(true);
  });

  it("imports a comment spanning two paragraphs", async () => {
    const docx = await buildCommentDocx(
      `<w:p>
        <w:commentRangeStart w:id="0"/>
        <w:r><w:t>First</w:t></w:r>
      </w:p>
      <w:p>
        <w:r><w:t>Second</w:t></w:r>
        <w:commentRangeEnd w:id="0"/>
        <w:r><w:commentReference w:id="0"/></w:r>
      </w:p>`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments ${COMMENTS_NS}>
  <w:comment w:id="0" w:author="A"><w:p w14:paraId="BBBB0001"><w:r><w:t>spanning</w:t></w:r></w:p></w:comment>
</w:comments>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const paragraphs = getDocumentParagraphs(document);
    const c = comments(document)[0]!;
    expect(c.start?.paragraphId).toBe(paragraphs[0]!.id);
    expect(c.start?.offset).toBe(0);
    expect(c.end?.paragraphId).toBe(paragraphs[1]!.id);
    expect(c.end?.offset).toBe(6);
  });
});

describe("DOCX export: comments", () => {
  it("emits commentRangeStart/End/reference and a comments.xml body", async () => {
    const docx = await buildCommentDocx(
      `<w:p>
        <w:r><w:t>Hello </w:t></w:r>
        <w:commentRangeStart w:id="0"/>
        <w:r><w:t>world</w:t></w:r>
        <w:commentRangeEnd w:id="0"/>
        <w:r><w:commentReference w:id="0"/></w:r>
      </w:p>`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments ${COMMENTS_NS}>
  <w:comment w:id="0" w:author="Celso Fontes" w:initials="CF"><w:p w14:paraId="5FE4A3C2"><w:r><w:t>Looks good</w:t></w:r></w:p></w:comment>
</w:comments>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const docXml = await exportPart(document, "word/document.xml");

    const startMatch = docXml.match(/<w:commentRangeStart w:id="(\d+)"\/>/);
    expect(startMatch).not.toBeNull();
    const id = startMatch![1];
    expect(docXml).toContain(`<w:commentRangeEnd w:id="${id}"/>`);
    expect(docXml).toContain(`<w:commentReference w:id="${id}"/>`);
    // start before "world", end + reference after it.
    expect(docXml.indexOf("world")).toBeGreaterThan(
      docXml.indexOf(`<w:commentRangeStart w:id="${id}"`),
    );
    expect(docXml.indexOf(`<w:commentRangeEnd w:id="${id}"/>`)).toBeGreaterThan(
      docXml.indexOf("world"),
    );

    const commentsXml = await exportPart(document, "word/comments.xml");
    expect(commentsXml).toContain('w:author="Celso Fontes"');
    expect(commentsXml).toContain("Looks good");
  });

  it("round-trips author, body and offsets through export → import", async () => {
    const docx = await buildCommentDocx(
      `<w:p>
        <w:r><w:t>Hello </w:t></w:r>
        <w:commentRangeStart w:id="3"/>
        <w:r><w:t>world</w:t></w:r>
        <w:commentRangeEnd w:id="3"/>
        <w:r><w:commentReference w:id="3"/></w:r>
      </w:p>`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments ${COMMENTS_NS}>
  <w:comment w:id="3" w:author="Celso Fontes"><w:p w14:paraId="5FE4A3C2"><w:r><w:t>Looks good</w:t></w:r></w:p></w:comment>
</w:comments>`,
    );
    const reimported = await importDocxToEditorDocument(
      await exportEditorDocumentToDocx(await importDocxToEditorDocument(docx)),
    );
    const c = comments(reimported)[0]!;
    expect(c.author).toBe("Celso Fontes");
    expect(c.text).toBe("Looks good");
    expect(c.start?.offset).toBe(6);
    expect(c.end?.offset).toBe(11);
  });
});
