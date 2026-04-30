import { describe, expect, it, beforeEach } from "vitest";
import JSZip from "jszip";
import { importDocxToEditor2Document } from "../../import/docx/importDocxToEditor2Document.js";
import { getParagraphText } from "../../core/model.js";
import { resetEditor2Ids } from "../../core/editorState.js";

async function buildDocx(documentXml: string, numberingXml?: string, relsXml?: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        ${numberingXml ? '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' : ""}
      </Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>`,
  );
  zip.file("word/document.xml", documentXml);
  if (numberingXml) {
    zip.file("word/numbering.xml", numberingXml);
  }
  if (relsXml) {
    zip.file("word/_rels/document.xml.rels", relsXml);
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("importDocxToEditor2Document", () => {
  beforeEach(() => {
    resetEditor2Ids();
  });

  it("imports paragraphs, runs, inline styles, alignment, list and page flags", async () => {
    const buffer = await buildDocx(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="240" w:after="120" w:line="360"/>
              <w:ind w:left="720" w:firstLine="360"/>
              <w:pageBreakBefore/>
              <w:keepNext/>
              <w:numPr>
                <w:ilvl w:val="0"/>
                <w:numId w:val="7"/>
              </w:numPr>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:color w:val="FF0000"/>
              </w:rPr>
              <w:t>Hello</w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:i/>
                <w:u w:val="single"/>
                <w:strike/>
                <w:vertAlign w:val="superscript"/>
                <w:rFonts w:ascii="Georgia"/>
                <w:sz w:val="28"/>
                <w:highlight w:val="yellow"/>
              </w:rPr>
              <w:t> world</w:t>
            </w:r>
          </w:p>
        </w:body>
      </w:document>`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:abstractNum w:abstractNumId="3">
          <w:lvl w:ilvl="0">
            <w:numFmt w:val="bullet"/>
          </w:lvl>
        </w:abstractNum>
        <w:num w:numId="7">
          <w:abstractNumId w:val="3"/>
        </w:num>
      </w:numbering>`,
    );

    const document = await importDocxToEditor2Document(buffer);
    const paragraph = document.blocks[0]!;
    if (paragraph.type !== "paragraph") {
      throw new Error("Expected paragraph block");
    }

    expect(getParagraphText(paragraph)).toBe("Hello world");
    expect(paragraph.runs.map((run) => run.text)).toEqual(["Hello", " world"]);
    expect(paragraph.runs[0]?.styles).toEqual({ bold: true, color: "#FF0000" });
    expect(paragraph.runs[1]?.styles).toEqual({
      italic: true,
      underline: true,
      strike: true,
      superscript: true,
      fontFamily: "Georgia",
      fontSize: 14,
      highlight: "yellow",
    });
    expect(paragraph.style).toEqual({
      align: "center",
      spacingBefore: 12,
      spacingAfter: 6,
      lineHeight: 1.5,
      indentLeft: 36,
      indentFirstLine: 18,
      pageBreakBefore: true,
      keepWithNext: true,
    });
    expect(paragraph.list).toEqual({ kind: "bullet", level: 0 });
  });

  it("imports ordered list paragraphs from numbering definitions", async () => {
    const buffer = await buildDocx(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr>
              <w:numPr>
                <w:ilvl w:val="1"/>
                <w:numId w:val="9"/>
              </w:numPr>
            </w:pPr>
            <w:r><w:t>Item</w:t></w:r>
          </w:p>
        </w:body>
      </w:document>`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:abstractNum w:abstractNumId="5">
          <w:lvl w:ilvl="1">
            <w:numFmt w:val="decimal"/>
          </w:lvl>
        </w:abstractNum>
        <w:num w:numId="9">
          <w:abstractNumId w:val="5"/>
        </w:num>
      </w:numbering>`,
    );

    const document = await importDocxToEditor2Document(buffer);
    const paragraph = document.blocks[0];
    if (paragraph?.type !== "paragraph") {
      throw new Error("Expected paragraph block");
    }
    expect(paragraph.list).toEqual({ kind: "ordered", level: 1 });
  });

  it("imports contiguous multilevel ordered list paragraphs", async () => {
    const buffer = await buildDocx(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="9"/></w:numPr></w:pPr><w:r><w:t>Top</w:t></w:r></w:p>
          <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="9"/></w:numPr></w:pPr><w:r><w:t>Nested A</w:t></w:r></w:p>
          <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="9"/></w:numPr></w:pPr><w:r><w:t>Nested B</w:t></w:r></w:p>
          <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="9"/></w:numPr></w:pPr><w:r><w:t>Top 2</w:t></w:r></w:p>
        </w:body>
      </w:document>`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:abstractNum w:abstractNumId="5">
          <w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl>
          <w:lvl w:ilvl="1"><w:numFmt w:val="decimal"/></w:lvl>
        </w:abstractNum>
        <w:num w:numId="9"><w:abstractNumId w:val="5"/></w:num>
      </w:numbering>`,
    );

    const document = await importDocxToEditor2Document(buffer);
    expect(document.blocks.map((block) => block.type === "paragraph" ? block.list : undefined)).toEqual([
      { kind: "ordered", level: 0 },
      { kind: "ordered", level: 1 },
      { kind: "ordered", level: 1 },
      { kind: "ordered", level: 0 },
    ]);
  });

  it("imports inline hyperlinks into run styles", async () => {
    const buffer = await buildDocx(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <w:body>
          <w:p>
            <w:r><w:t>Go </w:t></w:r>
            <w:hyperlink r:id="rIdLink1">
              <w:r>
                <w:rPr><w:u w:val="single"/></w:rPr>
                <w:t>there</w:t>
              </w:r>
            </w:hyperlink>
          </w:p>
        </w:body>
      </w:document>`,
      undefined,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdLink1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>
      </Relationships>`,
    );

    const document = await importDocxToEditor2Document(buffer);
    const paragraph = document.blocks[0];
    if (paragraph?.type !== "paragraph") {
      throw new Error("Expected paragraph block");
    }

    expect(getParagraphText(paragraph)).toBe("Go there");
    expect(paragraph.runs[1]?.styles).toEqual({
      underline: true,
      link: "https://example.com",
    });
  });

  it("imports tables in body order with cell paragraphs", async () => {
    const buffer = await buildDocx(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r><w:t>Before</w:t></w:r>
          </w:p>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>B1</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A2</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>B2</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`,
    );

    const document = await importDocxToEditor2Document(buffer);
    const table = document.blocks[1];

    expect(document.blocks[0]?.type).toBe("paragraph");
    expect(table?.type).toBe("table");
    if (table?.type !== "table") {
      throw new Error("Expected table block");
    }
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]?.cells).toHaveLength(2);
    expect(getParagraphText(table.rows[0]!.cells[0]!.blocks[0]!)).toBe("A1");
    expect(getParagraphText(table.rows[1]!.cells[1]!.blocks[0]!)).toBe("B2");
  });

  it("imports table cell grid spans from wordprocessingml", async () => {
    const buffer = await buildDocx(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr><w:gridSpan w:val="2"/></w:tcPr>
                <w:p><w:r><w:t>Merged</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>Tail</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`,
    );

    const document = await importDocxToEditor2Document(buffer);
    const table = document.blocks[0];
    if (table?.type !== "table") {
      throw new Error("Expected table block");
    }

    expect(table.rows[0]?.cells[0]?.colSpan).toBe(2);
    expect(getParagraphText(table.rows[0]!.cells[0]!.blocks[0]!)).toBe("Merged");
    expect(getParagraphText(table.rows[0]!.cells[1]!.blocks[0]!)).toBe("Tail");
  });

  it("imports vertical cell merges from wordprocessingml", async () => {
    const buffer = await buildDocx(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr><w:vMerge w:val="restart"/></w:tcPr>
                <w:p><w:r><w:t>A</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
            <w:tr>
              <w:tc>
                <w:tcPr><w:vMerge/></w:tcPr>
                <w:p><w:r><w:t>B</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`,
    );

    const document = await importDocxToEditor2Document(buffer);
    const table = document.blocks[0];
    if (table?.type !== "table") {
      throw new Error("Expected table block");
    }

    expect(table.rows[0]?.cells[0]?.vMerge).toBe("restart");
    expect(table.rows[0]?.cells[0]?.rowSpan).toBe(2);
    expect(table.rows[1]?.cells[0]?.vMerge).toBe("continue");
    expect(getParagraphText(table.rows[0]!.cells[0]!.blocks[0]!)).toBe("A");
    expect(table.rows[1]!.cells[0]!.blocks.length).toBe(0);
  });
});
