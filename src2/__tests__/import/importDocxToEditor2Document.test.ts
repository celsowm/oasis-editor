import { describe, expect, it, beforeEach } from "vitest";
import JSZip from "jszip";
import { importDocxToEditor2Document } from "../../import/docx/importDocxToEditor2Document.js";
import { getParagraphText } from "../../core/model.js";
import { resetEditor2Ids } from "../../core/editorState.js";

async function buildDocx(documentXml: string, numberingXml?: string): Promise<ArrayBuffer> {
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
    expect(document.blocks[0]?.list).toEqual({ kind: "ordered", level: 1 });
  });
});
