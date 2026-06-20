import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import type { EditorBookmark, EditorDocument } from "@/core/model.js";

async function buildDocx(bodyXml: string): Promise<ArrayBuffer> {
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
  return zip.generateAsync({ type: "arraybuffer" });
}

function bookmarks(document: EditorDocument): EditorBookmark[] {
  const registry = document.bookmarks;
  if (!registry) return [];
  return registry.order.map((id) => registry.items[id]!);
}

async function exportXml(document: EditorDocument): Promise<string> {
  const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
  return (await zip.file("word/document.xml")?.async("string")) ?? "";
}

describe("DOCX import: bookmarks nested inside a run", () => {
  it("captures a bookmark whose start/end sit between a run's <w:t> children", async () => {
    // The whole bookmark lives *inside* one <w:r>, between its <w:t> children —
    // a valid OOXML encoding the importer used to silently drop.
    const docx = await buildDocx(
      `<w:p>
        <w:r>
          <w:t>Hello </w:t>
          <w:bookmarkStart w:id="5" w:name="Target"/>
          <w:t>world</w:t>
          <w:bookmarkEnd w:id="5"/>
          <w:t>!</w:t>
        </w:r>
      </w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const bm = bookmarks(document)[0]!;
    expect(bm.name).toBe("Target");
    expect(bm.start?.offset).toBe(6);
    expect(bm.end?.offset).toBe(11);
    // Both anchors are in the same (single) paragraph.
    expect(bm.start?.paragraphId).toBe(bm.end?.paragraphId);
  });

  it("captures a zero-width bookmark nested mid-run", async () => {
    const docx = await buildDocx(
      `<w:p>
        <w:r>
          <w:t>abc</w:t>
          <w:bookmarkStart w:id="1" w:name="Zero"/>
          <w:bookmarkEnd w:id="1"/>
          <w:t>def</w:t>
        </w:r>
      </w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const bm = bookmarks(document)[0]!;
    expect(bm.name).toBe("Zero");
    expect(bm.start?.offset).toBe(3);
    expect(bm.end?.offset).toBe(3);
  });

  it("round-trips a nested-in-run bookmark through export → reimport", async () => {
    const docx = await buildDocx(
      `<w:p>
        <w:r>
          <w:t>Hello </w:t>
          <w:bookmarkStart w:id="7" w:name="Target"/>
          <w:t>world</w:t>
          <w:bookmarkEnd w:id="7"/>
        </w:r>
      </w:p>`,
    );
    const imported = await importDocxToEditorDocument(docx);
    // Export emits boundaries at paragraph level (between runs) — still 1:1.
    const xml = await exportXml(imported);
    expect(xml).toContain('<w:bookmarkStart w:id="7" w:name="Target"/>');
    expect(xml).toContain('<w:bookmarkEnd w:id="7"/>');

    const exported = await exportEditorDocumentToDocx(imported);
    const reimported = await importDocxToEditorDocument(exported);
    const bm = bookmarks(reimported)[0]!;
    expect(bm.name).toBe("Target");
    expect(bm.start?.offset).toBe(6);
    expect(bm.end?.offset).toBe(11);
  });

  it("handles two bookmarks nested in the same run", async () => {
    const docx = await buildDocx(
      `<w:p>
        <w:r>
          <w:t>aa</w:t>
          <w:bookmarkStart w:id="1" w:name="One"/>
          <w:t>bb</w:t>
          <w:bookmarkEnd w:id="1"/>
          <w:bookmarkStart w:id="2" w:name="Two"/>
          <w:t>cc</w:t>
          <w:bookmarkEnd w:id="2"/>
        </w:r>
      </w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const all = bookmarks(document);
    const one = all.find((b) => b.name === "One")!;
    const two = all.find((b) => b.name === "Two")!;
    expect([one.start?.offset, one.end?.offset]).toEqual([2, 4]);
    expect([two.start?.offset, two.end?.offset]).toEqual([4, 6]);
  });
});
