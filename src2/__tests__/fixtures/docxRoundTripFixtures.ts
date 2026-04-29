import JSZip from "jszip";
import { createEditor2Document, createEditor2ParagraphFromRuns } from "../../core/editorState.js";
import type { Editor2Document } from "../../core/model.js";
import { createEditor2Table, createEditor2TableCell, createEditor2TableRow } from "../../core/editorState.js";

export interface DocxRoundTripFixture {
  name: string;
  document: Editor2Document;
}

function buildMixedFormattingFixture(): Editor2Document {
  const first = createEditor2ParagraphFromRuns([
    { text: "Alpha", styles: { bold: true, color: "#112233" } },
    { text: " beta", styles: { italic: true, underline: true, fontFamily: "Georgia", fontSize: 18 } },
    { text: "\nline", styles: { strike: true } },
  ]);
  first.style = {
    align: "justify",
    spacingBefore: 10,
    spacingAfter: 5,
    lineHeight: 1.4,
    indentLeft: 18,
    indentRight: 6,
    indentFirstLine: 12,
    pageBreakBefore: true,
    keepWithNext: true,
  };

  const second = createEditor2ParagraphFromRuns([
    { text: "Tab\tinside", styles: { subscript: true, highlight: "yellow" } },
  ]);

  return createEditor2Document([first, second]);
}

function buildListsFixture(): Editor2Document {
  const first = createEditor2ParagraphFromRuns([{ text: "One" }]);
  first.list = { kind: "bullet", level: 0 };

  const second = createEditor2ParagraphFromRuns([
    { text: "Two", styles: { superscript: true, highlight: "yellow" } },
  ]);
  second.list = { kind: "ordered", level: 1 };

  const third = createEditor2ParagraphFromRuns([{ text: "Three" }]);
  third.list = { kind: "ordered", level: 2 };

  return createEditor2Document([first, second, third]);
}

function buildWhitespaceFixture(): Editor2Document {
  const paragraph = createEditor2ParagraphFromRuns([
    { text: "  lead" },
    { text: "  middle  ", styles: { color: "#ff0000" } },
    { text: "tail\t\nnext", styles: { highlight: "yellow" } },
  ]);

  return createEditor2Document([paragraph]);
}

export function createMixedTableAndImageFixture(): Editor2Document {
  const image = {
    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    width: 64,
    height: 32,
  };
  const intro = createEditor2ParagraphFromRuns([{ text: "Intro" }]);
  const table = createEditor2Table([
    createEditor2TableRow([
      createEditor2TableCell(
        [
          createEditor2ParagraphFromRuns([
            { text: "Merged " },
            { text: "\uFFFC", image },
          ]),
        ],
        2,
        { rowSpan: 2, vMerge: "restart" },
      ),
      createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "TopRight" }])]),
    ]),
    createEditor2TableRow([
      (() => {
        const cell = createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "" }])], 2, {
          vMerge: "continue",
        });
        cell.blocks = [];
        return cell;
      })(),
      createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "BottomRight" }])]),
    ]),
  ]);
  const outro = createEditor2ParagraphFromRuns([{ text: "Outro" }]);

  return createEditor2Document([intro, table, outro]);
}

export async function createMixedTableAndImageDocxFile(): Promise<File> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Intro</w:t></w:r></w:p>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vMerge w:val="restart"/>
                </w:tcPr>
                <w:p><w:r><w:t>TopLeft</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>TopRight</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vMerge/>
                </w:tcPr>
                <w:p><w:r><w:t>Hidden</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>BottomRight</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
          <w:p><w:r><w:t>Outro</w:t></w:r></w:p>
        </w:body>
      </w:document>`,
  );
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new File([buffer], "import.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export function createDocxRoundTripFixtures(): DocxRoundTripFixture[] {
  return [
    { name: "mixed formatting and paragraph properties", document: buildMixedFormattingFixture() },
    { name: "list variants and levels", document: buildListsFixture() },
    { name: "whitespace, tabs and line breaks", document: buildWhitespaceFixture() },
    { name: "mixed table spans with inline image", document: createMixedTableAndImageFixture() },
  ];
}
