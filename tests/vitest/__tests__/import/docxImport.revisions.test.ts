import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { EditorParagraphNode } from "@/core/model.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

async function importRevisionDocument(): Promise<
  Awaited<ReturnType<typeof importDocxToEditorDocument>>
> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}"><w:body>
      <w:p>
        <w:r><w:t>A</w:t></w:r>
        <w:ins w:id="1" w:author="Alice" w:date="2026-01-02T03:04:05Z">
          <w:r><w:t>B</w:t></w:r>
        </w:ins>
        <w:del w:id="2" w:author="Bob" w:date="2026-01-03T03:04:05Z">
          <w:r><w:delText>C</w:delText></w:r>
        </w:del>
        <w:moveFrom w:id="3" w:author="Carol" w:date="2026-01-04T03:04:05Z">
          <w:r><w:delText>D</w:delText></w:r>
        </w:moveFrom>
        <w:moveTo w:id="3" w:author="Carol" w:date="2026-01-04T03:04:05Z">
          <w:r><w:t>E</w:t></w:r>
        </w:moveTo>
      </w:p>
      <w:sectPr/>
    </w:body></w:document>`,
  );
  return importDocxToEditorDocument(
    await zip.generateAsync({ type: "arraybuffer" }),
  );
}

describe("DOCX run tracked changes", () => {
  it("imports insert, delete and paired move semantics", async () => {
    const document = await importRevisionDocument();
    const paragraph = document.sections![0]!.blocks[0] as EditorParagraphNode;

    expect(paragraph.runs.map((run) => run.text)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    expect(paragraph.runs[0]!.revision).toBeUndefined();
    expect(paragraph.runs[1]!.revision).toMatchObject({
      id: "1",
      type: "insert",
      author: "Alice",
    });
    expect(paragraph.runs[2]!.revision).toMatchObject({
      id: "2",
      type: "delete",
      author: "Bob",
    });
    expect(paragraph.runs[3]!.revision).toMatchObject({
      id: "3",
      type: "delete",
      move: "from",
      author: "Carol",
    });
    expect(paragraph.runs[4]!.revision).toMatchObject({
      id: "3",
      type: "insert",
      move: "to",
      author: "Carol",
    });
    expect(paragraph.runs[1]!.revision?.date).toBe(
      Date.parse("2026-01-02T03:04:05Z"),
    );
  });

  it("rebuilds edited revisions with canonical wrappers and deletion text", async () => {
    const document = await importRevisionDocument();
    const paragraph = document.sections![0]!.blocks[0] as EditorParagraphNode;
    paragraph.runs[1]!.text = "Inserted";
    paragraph.runs[2]!.text = "Deleted";
    paragraph.runs[3]!.text = "Moved from";
    paragraph.runs[4]!.text = "Moved to";

    const exported = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(exported);
    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";

    expect(xml).toMatch(
      /<w:ins\b[^>]*w:id="1"[^>]*>[\s\S]*?<w:t>Inserted<\/w:t>[\s\S]*?<\/w:ins>/,
    );
    expect(xml).toMatch(
      /<w:del\b[^>]*w:id="2"[^>]*>[\s\S]*?<w:delText>Deleted<\/w:delText>[\s\S]*?<\/w:del>/,
    );
    expect(xml).toMatch(
      /<w:moveFrom\b[^>]*w:id="3"[^>]*>[\s\S]*?<w:delText>Moved from<\/w:delText>[\s\S]*?<\/w:moveFrom>/,
    );
    expect(xml).toMatch(
      /<w:moveTo\b[^>]*w:id="3"[^>]*>[\s\S]*?<w:t>Moved to<\/w:t>[\s\S]*?<\/w:moveTo>/,
    );
    expect(xml).not.toContain("<w:delText>C</w:delText>");
    expect(xml).not.toContain("<w:delText>D</w:delText>");

    const reimported = await importDocxToEditorDocument(exported);
    const reimportedParagraph = reimported.sections![0]!
      .blocks[0] as EditorParagraphNode;
    expect(reimportedParagraph.runs.map((run) => run.text)).toEqual([
      "A",
      "Inserted",
      "Deleted",
      "Moved from",
      "Moved to",
    ]);
    expect(reimportedParagraph.runs[3]!.revision).toMatchObject({
      type: "delete",
      move: "from",
    });
    expect(reimportedParagraph.runs[4]!.revision).toMatchObject({
      type: "insert",
      move: "to",
    });
  });

  it("round-trips deleted field instructions as w:delInstrText", async () => {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<w:document xmlns:w="${WORD_NS}"><w:body>
        <w:p>
          <w:del w:id="9" w:author="Field Author" w:date="2026-01-05T03:04:05Z">
            <w:r><w:delInstrText xml:space="preserve"> REF target </w:delInstrText></w:r>
          </w:del>
        </w:p>
        <w:sectPr/>
      </w:body></w:document>`,
    );
    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const paragraph = document.sections![0]!.blocks[0] as EditorParagraphNode;
    expect(paragraph.runs).toHaveLength(1);
    expect(paragraph.runs[0]!.kind).toBe("fieldInstruction");
    expect(paragraph.runs[0]!.revision?.type).toBe("delete");

    if (paragraph.runs[0]!.kind === "fieldInstruction") {
      paragraph.runs[0]!.fieldInstruction = " REF changed ";
    }
    const exported = await exportEditorDocumentToDocx(document);
    const output = await JSZip.loadAsync(exported);
    const xml =
      (await output.file("word/document.xml")?.async("string")) ?? "";
    expect(xml).toContain("<w:delInstrText");
    expect(xml).toContain("REF changed");
    expect(xml).not.toContain("REF target");
  });
});
