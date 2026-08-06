import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { cloneBlocks } from "@/core/document/clone.js";
import { getDocumentParagraphsCanonical } from "@/core/model.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const CONTENT_TYPES_NS =
  "http://schemas.openxmlformats.org/package/2006/content-types";
const RELS_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";

async function nestedTablePackage(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<Types xmlns="${CONTENT_TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${WORD_NS}"><w:body><w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="6000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Before nested table</w:t></w:r></w:p><w:tbl><w:tblPr><w:tblW w:w="3000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Inner original</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:t>After nested table</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr/></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

function getOuterTable(
  document: Awaited<ReturnType<typeof importDocxToEditorDocument>>,
) {
  const block = document.sections?.[0]?.blocks[0] ?? document.blocks?.[0];
  if (!block || block.type !== "table") {
    throw new Error("Expected outer table.");
  }
  return block;
}

function getInnerTable(
  document: Awaited<ReturnType<typeof importDocxToEditorDocument>>,
) {
  const outer = getOuterTable(document);
  const inner = outer.rows[0]?.cells[0]?.blocks.find(
    (block) => block.type === "table",
  );
  if (!inner || inner.type !== "table") {
    throw new Error("Expected inner table.");
  }
  return inner;
}

describe("nested DOCX tables", () => {
  it("imports cell blocks in paragraph-table-paragraph order", async () => {
    const document = await importDocxToEditorDocument(
      await nestedTablePackage(),
    );
    const outer = getOuterTable(document);
    const blocks = outer.rows[0]!.cells[0]!.blocks;

    expect(blocks.map((block): string => block.type)).toEqual([
      "paragraph",
      "table",
      "paragraph",
    ]);
    expect(
      getDocumentParagraphsCanonical(document).map((paragraph) =>
        paragraph.runs.map((run) => run.text).join(""),
      ),
    ).toEqual([
      "Before nested table",
      "Inner original",
      "After nested table",
    ]);
  });

  it("edits, exports, and reimports the inner table without flattening it", async () => {
    const document = await importDocxToEditorDocument(
      await nestedTablePackage(),
    );
    const inner = getInnerTable(document);
    const innerParagraph = inner.rows[0]!.cells[0]!.blocks[0];
    if (!innerParagraph || innerParagraph.type !== "paragraph") {
      throw new Error("Expected inner paragraph.");
    }
    innerParagraph.runs[0]!.text = "Inner edited";

    const exported = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(exported);
    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
    expect(xml.match(/<w:tbl(?:\s|>)/g)).toHaveLength(2);
    expect(xml).toContain("Inner edited");
    expect(xml).not.toContain("Inner original");

    const reimported = await importDocxToEditorDocument(exported);
    const reimportedOuter = getOuterTable(reimported);
    expect(
      reimportedOuter.rows[0]!.cells[0]!.blocks.map(
        (block): string => block.type,
      ),
    ).toEqual(["paragraph", "table", "paragraph"]);
    const reimportedInner = getInnerTable(reimported);
    const reimportedParagraph = reimportedInner.rows[0]!.cells[0]!.blocks[0];
    expect(
      reimportedParagraph?.type === "paragraph"
        ? reimportedParagraph.runs.map((run) => run.text).join("")
        : null,
    ).toBe("Inner edited");
  });

  it("adds the required terminal paragraph when a cell ends with a table", async () => {
    const document = await importDocxToEditorDocument(
      await nestedTablePackage(),
    );
    const outer = getOuterTable(document);
    const inner = getInnerTable(document);
    outer.rows[0]!.cells[0]!.blocks = [inner];

    const exported = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(exported);
    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";

    expect(xml).toMatch(/<\/w:tbl><w:p\/><\/w:tc>/);
  });

  it("deep-clones nested tables independently", async () => {
    const document = await importDocxToEditorDocument(
      await nestedTablePackage(),
    );
    const outer = getOuterTable(document);
    const cloned = cloneBlocks([outer])[0];
    if (!cloned || cloned.type !== "table") {
      throw new Error("Expected cloned outer table.");
    }
    const clonedInner = cloned.rows[0]!.cells[0]!.blocks.find(
      (block) => block.type === "table",
    );
    if (!clonedInner || clonedInner.type !== "table") {
      throw new Error("Expected cloned inner table.");
    }
    const clonedParagraph = clonedInner.rows[0]!.cells[0]!.blocks[0];
    if (!clonedParagraph || clonedParagraph.type !== "paragraph") {
      throw new Error("Expected cloned inner paragraph.");
    }
    clonedParagraph.runs[0]!.text = "Clone only";

    const originalParagraph = getInnerTable(document).rows[0]!.cells[0]!.blocks[0];
    expect(
      originalParagraph?.type === "paragraph"
        ? originalParagraph.runs[0]!.text
        : null,
    ).toBe("Inner original");
  });
});
