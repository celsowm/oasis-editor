import { describe, expect, it, beforeEach } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { resetEditorIds } from "@/core/editorState.js";
import { getDocumentParagraphs, getDocumentTables } from "./docxTestHelpers.js";
import type { EditorBookmark, EditorDocument } from "@/core/model.js";

beforeEach(() => {
  resetEditorIds();
});

async function buildBookmarkDocx(bodyXml: string): Promise<ArrayBuffer> {
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

describe("DOCX import: bookmarks", () => {
  it("extracts a bookmark wrapping inline text with correct offsets", async () => {
    const docx = await buildBookmarkDocx(
      `<w:p>
        <w:r><w:t>Hello </w:t></w:r>
        <w:bookmarkStart w:id="0" w:name="Target"/>
        <w:r><w:t>world</w:t></w:r>
        <w:bookmarkEnd w:id="0"/>
        <w:r><w:t>!</w:t></w:r>
      </w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);

    // Marker runs are stripped; only the real text runs remain.
    const paragraph = getDocumentParagraphs(document)[0]!;
    expect(paragraph.runs.map((r) => r.text).join("")).toBe("Hello world!");

    const list = bookmarks(document);
    expect(list).toHaveLength(1);
    const bm = list[0]!;
    expect(bm.name).toBe("Target");
    expect(bm.start?.paragraphId).toBe(paragraph.id);
    expect(bm.start?.offset).toBe(6); // after "Hello "
    expect(bm.end?.paragraphId).toBe(paragraph.id);
    expect(bm.end?.offset).toBe(11); // after "Hello world"
    expect(bm.docxIdHint).toBe(0);
  });

  it("drops the reserved _GoBack bookmark but keeps hidden _Toc bookmarks", async () => {
    const docx = await buildBookmarkDocx(
      `<w:p>
        <w:bookmarkStart w:id="0" w:name="_GoBack"/>
        <w:bookmarkEnd w:id="0"/>
        <w:bookmarkStart w:id="1" w:name="_Toc12345"/>
        <w:r><w:t>Chapter</w:t></w:r>
        <w:bookmarkEnd w:id="1"/>
      </w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const list = bookmarks(document);
    expect(list.map((b) => b.name)).toEqual(["_Toc12345"]);
    expect(list[0]!.hidden).toBe(true);
  });

  it("preserves a zero-width bookmark", async () => {
    const docx = await buildBookmarkDocx(
      `<w:p>
        <w:r><w:t>abc</w:t></w:r>
        <w:bookmarkStart w:id="0" w:name="Mark"/>
        <w:bookmarkEnd w:id="0"/>
        <w:r><w:t>def</w:t></w:r>
      </w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const bm = bookmarks(document)[0]!;
    expect(bm.start?.offset).toBe(3);
    expect(bm.end?.offset).toBe(3);
  });

  it("extracts a bookmark spanning two paragraphs", async () => {
    const docx = await buildBookmarkDocx(
      `<w:p>
        <w:bookmarkStart w:id="0" w:name="Span"/>
        <w:r><w:t>First</w:t></w:r>
      </w:p>
      <w:p>
        <w:r><w:t>Second</w:t></w:r>
        <w:bookmarkEnd w:id="0"/>
      </w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const paragraphs = getDocumentParagraphs(document);
    const bm = bookmarks(document)[0]!;
    expect(bm.start?.paragraphId).toBe(paragraphs[0]!.id);
    expect(bm.start?.offset).toBe(0);
    expect(bm.end?.paragraphId).toBe(paragraphs[1]!.id);
    expect(bm.end?.offset).toBe(6);
  });

  it("extracts bookmarks inside table cells and column bookmarks", async () => {
    const docx = await buildBookmarkDocx(
      `<w:tbl>
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>
            <w:p>
              <w:bookmarkStart w:id="0" w:name="CellMark" w:colFirst="0" w:colLast="1"/>
              <w:r><w:t>cell</w:t></w:r>
              <w:bookmarkEnd w:id="0"/>
            </w:p>
          </w:tc>
        </w:tr>
      </w:tbl>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const bm = bookmarks(document)[0]!;
    expect(bm.name).toBe("CellMark");
    expect(bm.colFirst).toBe(0);
    expect(bm.colLast).toBe(1);
    // The marker run was stripped from the cell paragraph.
    const cellParagraph =
      getDocumentTables(document)[0]!.rows[0]!.cells[0]!.blocks[0]!;
    if (cellParagraph.type === "paragraph") {
      expect(cellParagraph.runs.map((r) => r.text).join("")).toBe("cell");
    }
  });
});

describe("DOCX export: bookmarks", () => {
  it("emits matching w:bookmarkStart / w:bookmarkEnd with the same id", async () => {
    const docx = await buildBookmarkDocx(
      `<w:p>
        <w:r><w:t>Hello </w:t></w:r>
        <w:bookmarkStart w:id="7" w:name="Target"/>
        <w:r><w:t>world</w:t></w:r>
        <w:bookmarkEnd w:id="7"/>
      </w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const xml = await exportXml(document);

    const startMatch = xml.match(
      /<w:bookmarkStart w:id="(\d+)" w:name="Target"\/>/,
    );
    expect(startMatch).not.toBeNull();
    const id = startMatch![1];
    expect(xml).toContain(`<w:bookmarkEnd w:id="${id}"/>`);
    // The start sits after the "Hello " run and before the "world" run.
    expect(xml).toMatch(
      new RegExp(
        `Hello </w:t></w:r><w:bookmarkStart w:id="${id}" w:name="Target"/><w:r>`,
      ),
    );
    expect(xml.indexOf("world")).toBeGreaterThan(
      xml.indexOf(`<w:bookmarkStart w:id="${id}"`),
    );
    expect(xml.indexOf(`<w:bookmarkEnd w:id="${id}"/>`)).toBeGreaterThan(
      xml.indexOf("world"),
    );
  });

  it("round-trips bookmark name and offsets through export → import", async () => {
    const docx = await buildBookmarkDocx(
      `<w:p>
        <w:r><w:t>Hello </w:t></w:r>
        <w:bookmarkStart w:id="3" w:name="Target"/>
        <w:r><w:t>world</w:t></w:r>
        <w:bookmarkEnd w:id="3"/>
      </w:p>`,
    );
    const reimported = await importDocxToEditorDocument(
      await exportEditorDocumentToDocx(await importDocxToEditorDocument(docx)),
    );
    const bm = bookmarks(reimported)[0]!;
    expect(bm.name).toBe("Target");
    expect(bm.start?.offset).toBe(6);
    expect(bm.end?.offset).toBe(11);
  });

  it("round-trips an internal hyperlink pointing at a bookmark target", async () => {
    const docx = await buildBookmarkDocx(
      `<w:p>
        <w:hyperlink w:anchor="Target"><w:r><w:t>Jump</w:t></w:r></w:hyperlink>
      </w:p>
      <w:p>
        <w:bookmarkStart w:id="0" w:name="Target"/>
        <w:r><w:t>Destination</w:t></w:r>
        <w:bookmarkEnd w:id="0"/>
      </w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const xml = await exportXml(document);

    // The link and its target both survive.
    expect(xml).toContain('<w:hyperlink w:anchor="Target">');
    expect(xml).toContain('w:name="Target"');

    const reimported = await importDocxToEditorDocument(
      await exportEditorDocumentToDocx(document),
    );
    const linkRun = getDocumentParagraphs(reimported)[0]!.runs.find(
      (r) => r.styles?.link,
    );
    expect(linkRun?.styles?.link).toBe("#Target");
    expect(bookmarks(reimported).some((b) => b.name === "Target")).toBe(true);
  });
});
