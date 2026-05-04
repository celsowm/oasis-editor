import JSZip from "jszip";
import { createEditorDocument, createEditorParagraphFromRuns } from "../../core/editorState.js";
import type { EditorDocument } from "../../core/model.js";
import { createEditorTable, createEditorTableCell, createEditorTableRow } from "../../core/editorState.js";

export interface DocxRoundTripFixture {
  name: string;
  document: EditorDocument;
}

function buildMixedFormattingFixture(): EditorDocument {
  const first = createEditorParagraphFromRuns([
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

  const second = createEditorParagraphFromRuns([
    { text: "Tab\tinside", styles: { subscript: true, highlight: "yellow" } },
  ]);

  return createEditorDocument([first, second]);
}

function buildListsFixture(): EditorDocument {
  const first = createEditorParagraphFromRuns([{ text: "One" }]);
  first.list = { kind: "bullet", level: 0 };

  const second = createEditorParagraphFromRuns([
    { text: "Two", styles: { superscript: true, highlight: "yellow" } },
  ]);
  second.list = { kind: "ordered", level: 1 };

  const third = createEditorParagraphFromRuns([{ text: "Three" }]);
  third.list = { kind: "ordered", level: 2 };

  return createEditorDocument([first, second, third]);
}

function buildWhitespaceFixture(): EditorDocument {
  const paragraph = createEditorParagraphFromRuns([
    { text: "  lead" },
    { text: "  middle  ", styles: { color: "#ff0000" } },
    { text: "tail\t\nnext", styles: { highlight: "yellow" } },
  ]);

  return createEditorDocument([paragraph]);
}

export function createMixedTableAndImageFixture(): EditorDocument {
  const image = {
    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    width: 64,
    height: 32,
  };
  const intro = createEditorParagraphFromRuns([{ text: "Intro" }]);
  const table = createEditorTable([
    createEditorTableRow([
      createEditorTableCell(
        [
          createEditorParagraphFromRuns([
            { text: "Merged " },
            { text: "\uFFFC", image },
          ]),
        ],
        2,
        { rowSpan: 2, vMerge: "restart" },
      ),
      createEditorTableCell([createEditorParagraphFromRuns([{ text: "TopRight" }])]),
    ]),
    createEditorTableRow([
      (() => {
        const cell = createEditorTableCell([createEditorParagraphFromRuns([{ text: "" }])], 2, {
          vMerge: "continue",
        });
        cell.blocks = [];
        return cell;
      })(),
      createEditorTableCell([createEditorParagraphFromRuns([{ text: "BottomRight" }])]),
    ]),
  ]);
  const outro = createEditorParagraphFromRuns([{ text: "Outro" }]);

  return createEditorDocument([intro, table, outro]);
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
