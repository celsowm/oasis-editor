import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

async function buildThreadedCommentDocx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
      <w:p><w:commentRangeStart w:id="0"/><w:r><w:t>Target</w:t></w:r><w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r></w:p>
      <w:sectPr/>
    </w:body></w:document>`,
  );
  zip.file(
    "word/comments.xml",
    `<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
      <w:comment w:id="0" w:author="Root"><w:p w14:paraId="AAAABBBB"><w:r><w:t>Root comment</w:t></w:r></w:p></w:comment>
      <w:comment w:id="1" w:author="Reply"><w:p w14:paraId="CCCCDDDD"><w:r><w:t>Reply comment</w:t></w:r></w:p></w:comment>
    </w:comments>`,
  );
  zip.file(
    "word/commentsExtended.xml",
    `<w15:commentsEx xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
      <w15:commentEx w15:paraId="AAAABBBB" w15:done="0"/>
      <w15:commentEx w15:paraId="CCCCDDDD" w15:paraIdParent="AAAABBBB" w15:done="1"/>
    </w15:commentsEx>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

function rootAndReply(document: Awaited<ReturnType<typeof importDocxToEditorDocument>>) {
  const comments = document.comments!;
  const root = comments.items[comments.order[0]!]!;
  const reply = comments.items[comments.order[1]!]!;
  return { root, reply };
}

describe("DOCX modern comment reply threads", () => {
  it("imports paraIdParent as an editor-local parent comment id", async () => {
    const document = await importDocxToEditorDocument(await buildThreadedCommentDocx());
    const { root, reply } = rootAndReply(document);

    expect(root.text).toBe("Root comment");
    expect(root.parentId).toBeUndefined();
    expect(reply.text).toBe("Reply comment");
    expect(reply.parentId).toBe(root.id);
    expect(reply.resolved).toBe(true);
    expect(reply.start).toBeUndefined();
    expect(reply.end).toBeUndefined();
  });

  it("rebuilds paraIdParent from local ids and reimports the same topology", async () => {
    const document = await importDocxToEditorDocument(await buildThreadedCommentDocx());
    const exported = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(exported);
    const extended =
      (await zip.file("word/commentsExtended.xml")?.async("string")) ?? "";

    expect(extended).toContain('w15:paraId="40000000"');
    expect(extended).toContain(
      'w15:paraId="40000001" w15:paraIdParent="40000000" w15:done="1"',
    );

    const reimported = await importDocxToEditorDocument(exported);
    const { root, reply } = rootAndReply(reimported);
    expect(reply.parentId).toBe(root.id);
    expect(reply.resolved).toBe(true);
  });

  it("keeps a reply when its parent paragraph id is dangling", async () => {
    const zip = await JSZip.loadAsync(await buildThreadedCommentDocx());
    const extended =
      (await zip.file("word/commentsExtended.xml")?.async("string")) ?? "";
    zip.file(
      "word/commentsExtended.xml",
      extended.replace('w15:paraIdParent="AAAABBBB"', 'w15:paraIdParent="DEADBEEF"'),
    );
    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const { reply } = rootAndReply(document);
    expect(reply.text).toBe("Reply comment");
    expect(reply.parentId).toBeUndefined();
  });
});
