import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { EditorParagraphNode } from "@/core/model.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

it("keeps an inline SDT when bookmark events force canonical paragraph export", async () => {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}"><w:body>
      <w:p>
        <w:sdt>
          <w:sdtPr><w:tag w:val="bound-text"/><w:text/></w:sdtPr>
          <w:sdtContent>
            <w:bookmarkStart w:id="7" w:name="inside"/>
            <w:r><w:t>Alice</w:t></w:r>
            <w:bookmarkEnd w:id="7"/>
          </w:sdtContent>
        </w:sdt>
      </w:p>
      <w:sectPr/>
    </w:body></w:document>`,
  );
  const document = await importDocxToEditorDocument(
    await zip.generateAsync({ type: "arraybuffer" }),
  );
  const paragraph = document.sections![0]!.blocks[0] as EditorParagraphNode;
  expect(paragraph.runs[0]!.sdtWrappers?.[0]?.sdtPr.tag).toBe("bound-text");
  expect(document.bookmarks?.order).toHaveLength(1);

  paragraph.runs[0]!.text = "Alicia";
  const output = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
  const xml = (await output.file("word/document.xml")?.async("string")) ?? "";

  expect(xml).toContain('<w:tag w:val="bound-text"/>');
  expect(xml).toContain("<w:sdtContent>");
  expect(xml).toContain('<w:bookmarkStart w:id="0" w:name="inside"/>');
  expect(xml).toContain("Alicia");
  expect(xml).toContain('<w:bookmarkEnd w:id="0"/>');
  expect(xml.split("<w:sdt>").length - 1).toBe(1);
});
