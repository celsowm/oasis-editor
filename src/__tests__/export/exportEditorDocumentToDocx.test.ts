import { beforeEach, describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
  createEditorStateFromDocument,
  resetEditorIds,
} from "../../core/editorState.js";
import { moveSelectedImageToPosition } from "../../core/editorCommands.js";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import { getParagraphText, getParagraphs, paragraphOffsetToPosition } from "../../core/model.js";
import {
  createDocxRoundTripFixtures,
  createMixedTableAndImageFixture,
} from "../fixtures/docxRoundTripFixtures.js";
import { normalizeEditorDocument } from "../shared/normalizeEditorDocument.js";

describe("exportEditorDocumentToDocx", () => {
  beforeEach(() => {
    resetEditorIds();
  });

  it("writes the minimal docx package parts for the supported subset", async () => {
    const firstParagraph = createEditorParagraphFromRuns([
      { text: "Hello", styles: { bold: true, color: "#ff0000" } },
      { text: " world", styles: { italic: true, underline: true, fontFamily: "Georgia", fontSize: 14 } },
    ]);
    firstParagraph.style = {
      align: "center",
      spacingBefore: 12,
      spacingAfter: 6,
      lineHeight: 1.5,
      indentLeft: 36,
      indentFirstLine: 18,
      pageBreakBefore: true,
      keepWithNext: true,
    };
    firstParagraph.list = { kind: "bullet", level: 0 };

    const secondParagraph = createEditorParagraphFromRuns([
      { text: "Second", styles: { strike: true, highlight: "yellow" } },
    ]);
    secondParagraph.list = { kind: "ordered", level: 1 };

    const document = createEditorDocument([firstParagraph, secondParagraph]);
    const buffer = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(buffer);

    const contentTypes = await zip.file("[Content_Types].xml")?.async("string");
    const documentXml = await zip.file("word/document.xml")?.async("string");
    const numberingXml = await zip.file("word/numbering.xml")?.async("string");
    const documentRels = await zip.file("word/_rels/document.xml.rels")?.async("string");

    expect(contentTypes).toContain("/word/document.xml");
    expect(contentTypes).toContain("/word/numbering.xml");
    expect(documentXml).toContain('<w:jc w:val="center"/>');
    expect(documentXml).toContain('<w:spacing w:before="240" w:after="120" w:line="360"/>');
    expect(documentXml).toContain('<w:ind w:left="720" w:firstLine="360"/>');
    expect(documentXml).toContain("<w:pageBreakBefore/>");
    expect(documentXml).toContain("<w:keepNext/>");
    expect(documentXml).toContain('<w:b/>');
    expect(documentXml).toContain('<w:color w:val="ff0000"/>');
    expect(documentXml).toContain('<w:u w:val="single"/>');
    expect(documentXml).toContain('<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/>');
    expect(documentXml).toContain('<w:sz w:val="28"/>');
    expect(numberingXml).toContain('<w:numFmt w:val="bullet"/>');
    expect(numberingXml).toContain('<w:numFmt w:val="decimal"/>');
    expect(documentRels).toContain("/numbering");
  });

  it("round-trips the supported subset through docx export and import", async () => {
    const firstParagraph = createEditorParagraphFromRuns([
      { text: "Alpha", styles: { bold: true, color: "#112233", superscript: true } },
      { text: " beta", styles: { italic: true, underline: true, fontFamily: "Times New Roman", fontSize: 16 } },
    ]);
    firstParagraph.style = {
      align: "justify",
      spacingBefore: 10,
      spacingAfter: 4,
      lineHeight: 1.3,
      indentLeft: 24,
      indentRight: 12,
      indentFirstLine: 8,
      pageBreakBefore: true,
      keepWithNext: true,
    };
    firstParagraph.list = { kind: "ordered", level: 2 };

    const secondParagraph = createEditorParagraphFromRuns([
      { text: "Gamma", styles: { strike: true, highlight: "yellow", subscript: true } },
    ]);

    const exported = createEditorDocument([firstParagraph, secondParagraph]);
    const buffer = await exportEditorDocumentToDocx(exported);

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    const [importedFirst, importedSecond] = imported.blocks;
    if (importedFirst?.type !== "paragraph" || importedSecond?.type !== "paragraph") {
      throw new Error("Expected paragraph blocks");
    }

    expect(getParagraphText(importedFirst!)).toBe("Alpha beta");
    expect(importedFirst.runs.map((run) => ({ text: run.text, styles: run.styles }))).toEqual([
      { text: "Alpha", styles: { bold: true, color: "#112233", superscript: true } },
      {
        text: " beta",
        styles: { italic: true, underline: true, fontFamily: "Times New Roman", fontSize: 16 },
      },
    ]);
    expect(importedFirst.style).toEqual({
      align: "justify",
      spacingBefore: 10,
      spacingAfter: 4,
      lineHeight: 1.3,
      indentLeft: 24,
      indentRight: 12,
      indentFirstLine: 8,
      pageBreakBefore: true,
      keepWithNext: true,
    });
    expect(importedFirst.list).toEqual({ kind: "ordered", level: 2 });

    expect(getParagraphText(importedSecond!)).toBe("Gamma");
    expect(importedSecond.runs[0]?.styles).toEqual({
      strike: true,
      highlight: "yellow",
      subscript: true,
    });
  });

  it("round-trips contiguous multilevel ordered lists", async () => {
    const firstParagraph = createEditorParagraphFromRuns([{ text: "Top" }]);
    firstParagraph.list = { kind: "ordered", level: 0 };
    const secondParagraph = createEditorParagraphFromRuns([{ text: "Nested A" }]);
    secondParagraph.list = { kind: "ordered", level: 1 };
    const thirdParagraph = createEditorParagraphFromRuns([{ text: "Nested B" }]);
    thirdParagraph.list = { kind: "ordered", level: 1 };
    const fourthParagraph = createEditorParagraphFromRuns([{ text: "Top 2" }]);
    fourthParagraph.list = { kind: "ordered", level: 0 };

    const exported = createEditorDocument([
      firstParagraph,
      secondParagraph,
      thirdParagraph,
      fourthParagraph,
    ]);
    const buffer = await exportEditorDocumentToDocx(exported);

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    const paragraphs = getParagraphs(createEditorStateFromDocument(imported));

    expect(paragraphs.map((paragraph) => paragraph.list)).toEqual([
      { kind: "ordered", level: 0 },
      { kind: "ordered", level: 1 },
      { kind: "ordered", level: 1 },
      { kind: "ordered", level: 0 },
    ]);
  });

  for (const fixture of createDocxRoundTripFixtures()) {
    it(`round-trips fixture: ${fixture.name}`, async () => {
      const buffer = await exportEditorDocumentToDocx(fixture.document);

      resetEditorIds();
      const imported = await importDocxToEditorDocument(buffer);

      expect(normalizeEditorDocument(imported)).toEqual(
        normalizeEditorDocument(fixture.document),
      );
    });
  }

  it("maps hex highlight colors to valid docx highlight keywords", async () => {
    const paragraph = createEditorParagraphFromRuns([
      { text: "Marked", styles: { highlight: "#fef08a" } },
    ]);
    const document = createEditorDocument([paragraph]);
    const buffer = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain('<w:highlight w:val="yellow"/>');
  });

  it("exports and reimports inline hyperlinks", async () => {
    const paragraph = createEditorParagraphFromRuns([
      { text: "Go " },
      { text: "there", styles: { link: "https://example.com", underline: true } },
    ]);
    const document = createEditorDocument([paragraph]);

    const buffer = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");

    expect(documentXml).toContain("<w:hyperlink");
    expect(relsXml).toContain('/hyperlink');
    expect(relsXml).toContain('Target="https://example.com"');

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    const importedParagraph = imported.blocks[0];
    if (importedParagraph?.type !== "paragraph") {
      throw new Error("Expected paragraph block");
    }

    expect(importedParagraph.runs[1]?.styles).toEqual({
      underline: true,
      link: "https://example.com",
    });
  });

  it("exports and reimports simple tables while preserving block order", async () => {
    const intro = createEditorParagraphFromRuns([{ text: "Intro" }]);
    const table = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([createEditorParagraphFromRuns([{ text: "A1" }])]),
        createEditorTableCell([createEditorParagraphFromRuns([{ text: "B1", styles: { bold: true } }])]),
      ]),
      createEditorTableRow([
        createEditorTableCell([createEditorParagraphFromRuns([{ text: "A2" }])]),
        createEditorTableCell([createEditorParagraphFromRuns([{ text: "B2", styles: { italic: true } }])]),
      ]),
    ]);
    const outro = createEditorParagraphFromRuns([{ text: "Outro" }]);
    const document = createEditorDocument([intro, table, outro]);

    const buffer = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain("<w:tbl>");
    expect(documentXml).toContain("A1");
    expect(documentXml).toContain("B2");

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    const importedTable = imported.blocks[1];

    expect(imported.blocks[0]?.type).toBe("paragraph");
    expect(importedTable?.type).toBe("table");
    expect(imported.blocks[2]?.type).toBe("paragraph");
    if (importedTable?.type !== "table") {
      throw new Error("Expected imported table block");
    }
    expect(importedTable.rows[0]!.cells[0]!.blocks[0]!).toBeDefined();
    expect(importedTable.rows[0]!.cells[1]!.blocks[0]!.runs[0]!.styles).toEqual({ bold: true });
    expect(importedTable.rows[1]!.cells[1]!.blocks[0]!.runs[0]!.styles).toEqual({ italic: true });
  });

  it("exports and reimports table cell grid spans", async () => {
    const table = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([createEditorParagraphFromRuns([{ text: "Merged" }])], 2),
        createEditorTableCell([createEditorParagraphFromRuns([{ text: "Tail" }])]),
      ]),
    ]);

    const buffer = await exportEditorDocumentToDocx(createEditorDocument([table]));
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain('<w:gridSpan w:val="2"/>');

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    const importedTable = imported.blocks[0];
    if (importedTable?.type !== "table") {
      throw new Error("Expected imported table block");
    }

    expect(importedTable.rows[0]!.cells[0]!.colSpan).toBe(2);
    expect(getParagraphText(importedTable.rows[0]!.cells[0]!.blocks[0]!)).toBe("Merged");
    expect(getParagraphText(importedTable.rows[0]!.cells[1]!.blocks[0]!)).toBe("Tail");
  });

  it("exports and reimports vertical table cell spans", async () => {
    const topCell = createEditorTableCell([createEditorParagraphFromRuns([{ text: "A" }])], 1, {
      rowSpan: 2,
      vMerge: "restart",
    });
    const bottomCell = createEditorTableCell([createEditorParagraphFromRuns([{ text: "B" }])]);
    bottomCell.blocks = [];
    bottomCell.vMerge = "continue";
    const table = createEditorTable([
      createEditorTableRow([topCell]),
      createEditorTableRow([bottomCell]),
    ]);

    const buffer = await exportEditorDocumentToDocx(createEditorDocument([table]));
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain('<w:vMerge w:val="restart"/>');
    expect(documentXml).toContain("<w:vMerge/>");

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    const importedTable = imported.blocks[0];
    if (importedTable?.type !== "table") {
      throw new Error("Expected imported table block");
    }

    expect(importedTable.rows[0]!.cells[0]!.rowSpan).toBe(2);
    expect(importedTable.rows[0]!.cells[0]!.vMerge).toBe("restart");
    expect(importedTable.rows[1]!.cells[0]!.vMerge).toBe("continue");
  });

  it("exports and reimports table header rows", async () => {
    const table = createEditorTable([
      createEditorTableRow(
        [createEditorTableCell([createEditorParagraphFromRuns([{ text: "Header" }])])],
        { isHeader: true },
      ),
      createEditorTableRow([createEditorTableCell([createEditorParagraphFromRuns([{ text: "Body" }])])]),
    ]);

    const buffer = await exportEditorDocumentToDocx(createEditorDocument([table]));
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain("<w:trPr><w:tblHeader/></w:trPr>");

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    const importedTable = imported.blocks[0];
    if (importedTable?.type !== "table") {
      throw new Error("Expected imported table block");
    }

    expect(importedTable.rows[0]!.isHeader).toBe(true);
    expect(importedTable.rows[1]!.isHeader).toBeUndefined();
  });

  it("exports and reimports custom page settings", async () => {
    const paragraph = createEditorParagraphFromRuns([{ text: "Page" }]);
    const document = createEditorDocument([paragraph], {
      width: 1056,
      height: 816,
      orientation: "landscape",
      margins: {
        top: 48,
        right: 96,
        bottom: 144,
        left: 120,
        header: 24,
        footer: 36,
        gutter: 10,
      },
    });

    const buffer = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain('<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>');
    expect(documentXml).toContain(
      '<w:pgMar w:top="720" w:right="1440" w:bottom="2160" w:left="1800" w:header="360" w:footer="540" w:gutter="150"/>',
    );

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    expect(normalizeEditorDocument(imported)).toEqual(normalizeEditorDocument(document));
  });

  it("exports and reimports mixed table spans", async () => {
    const mergedTopCell = createEditorTableCell(
      [createEditorParagraphFromRuns([{ text: "Merged" }])],
      2,
      {
        rowSpan: 2,
        vMerge: "restart",
      },
    );
    const row1Tail = createEditorTableCell([createEditorParagraphFromRuns([{ text: "Row1Tail" }])]);
    const continuedCell = createEditorTableCell(
      [createEditorParagraphFromRuns([{ text: "Hidden" }])],
      2,
      {
        vMerge: "continue",
      },
    );
    continuedCell.blocks = [];
    const row2Tail = createEditorTableCell([createEditorParagraphFromRuns([{ text: "Row2Tail" }])]);
    const table = createEditorTable([
      createEditorTableRow([mergedTopCell, row1Tail]),
      createEditorTableRow([continuedCell, row2Tail]),
    ]);

    const document = createEditorDocument([table]);
    const buffer = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain('<w:gridSpan w:val="2"/>');
    expect(documentXml).toContain('<w:vMerge w:val="restart"/>');
    expect(documentXml).toContain("<w:vMerge/>");

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    expect(normalizeEditorDocument(imported)).toEqual(normalizeEditorDocument(document));
  });

  it("exports and reimports inline images via DOCX relationships", async () => {
    const paragraph = createEditorParagraphFromRuns([
      { text: "Look: " },
      { text: "\uFFFC", image: { src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", width: 100, height: 100, alt: "Chart" } }
    ]);
    const document = createEditorDocument([paragraph]);
    
    const buffer = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(buffer);
    const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");
    const docXml = await zip.file("word/document.xml")?.async("string");
    
    expect(relsXml).toContain("image1.png");
    expect(docXml).toContain("<w:drawing>");
    expect(docXml).toContain("<a:blip r:embed=");
    expect(docXml).toContain('descr="Chart"');

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    const importedRun = (imported.blocks[0] as any).runs[1];
    
    expect(importedRun.image).toBeDefined();
    expect(importedRun.image?.width).toBe(100);
    expect(importedRun.image?.height).toBe(100);
    expect(importedRun.image?.src).toContain("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
    expect(importedRun.image?.alt).toBe("Chart");
  });

  it("exports and reimports inline images inside table cells", async () => {
    const imageRun = {
      text: "\uFFFC",
      image: {
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        width: 272,
        height: 102,
      },
    };
    const table = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([createEditorParagraphFromRuns([{ text: "A1" }])]),
        createEditorTableCell([
          createEditorParagraphFromRuns([{ text: "Cell " }, imageRun]),
        ]),
      ]),
    ]);
    const document = createEditorDocument([table]);

    const buffer = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file("word/document.xml")?.async("string");
    const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");

    expect(docXml).toContain("<w:tbl>");
    expect(docXml).toContain("<w:drawing>");
    expect(relsXml).toContain("/image");

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    const importedTable = imported.blocks[0];
    if (importedTable?.type !== "table") {
      throw new Error("Expected imported table block");
    }

    const importedCellParagraph = importedTable.rows[0]!.cells[1]!.blocks[0]!;
    expect(getParagraphText(importedCellParagraph)).toBe("Cell \uFFFC");
    expect(importedCellParagraph.runs[1]?.image).toBeDefined();
    expect(importedCellParagraph.runs[1]?.image?.width).toBe(272);
    expect(importedCellParagraph.runs[1]?.image?.height).toBe(102);
  });

  it("exports and reimports inline images inside mixed-span table cells", async () => {
    const imageRun = {
      text: "\uFFFC",
      image: {
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        width: 272,
        height: 102,
      },
    };
    const table = createEditorTable([
      createEditorTableRow([
        createEditorTableCell(
          [createEditorParagraphFromRuns([{ text: "Merged " }, imageRun])],
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
    const document = createEditorDocument([table]);

    const buffer = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file("word/document.xml")?.async("string");
    const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");

    expect(docXml).toContain('<w:gridSpan w:val="2"/>');
    expect(docXml).toContain('<w:vMerge w:val="restart"/>');
    expect(docXml).toContain("<w:drawing>");
    expect(relsXml).toContain("/image");

    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);
    const importedTable = imported.blocks[0];
    if (importedTable?.type !== "table") {
      throw new Error("Expected imported table block");
    }

    const importedMergedCellParagraph = importedTable.rows[0]!.cells[0]!.blocks[0]!;
    expect(getParagraphText(importedMergedCellParagraph)).toBe("Merged \uFFFC");
    expect(importedMergedCellParagraph.runs[1]?.image).toBeDefined();
    expect(importedMergedCellParagraph.runs[1]?.image?.width).toBe(272);
    expect(importedMergedCellParagraph.runs[1]?.image?.height).toBe(102);
    expect(importedTable.rows[0]!.cells[0]!.colSpan).toBe(2);
    expect(importedTable.rows[0]!.cells[0]!.rowSpan).toBe(2);
    expect(importedTable.rows[1]!.cells[0]!.colSpan).toBe(2);
    expect(importedTable.rows[1]!.cells[0]!.vMerge).toBe("continue");
  });

  it("round-trips mixed table spans with an inline image after a core move", async () => {
    const original = createMixedTableAndImageFixture();
    const state = createEditorStateFromDocument(original, { paragraphIndex: 1, offset: 7 });
    const paragraphs = getParagraphs(state);
    const sourceParagraph = paragraphs[1];
    const targetParagraph = paragraphs[2];
    if (!sourceParagraph || !targetParagraph) {
      throw new Error("Expected source and target paragraphs");
    }

    const moved = moveSelectedImageToPosition(
      {
        ...state,
        selection: {
          anchor: paragraphOffsetToPosition(sourceParagraph, 7),
          focus: paragraphOffsetToPosition(sourceParagraph, 8),
        },
      },
      paragraphOffsetToPosition(targetParagraph, 0),
    );

    const buffer = await exportEditorDocumentToDocx(moved.document);
    resetEditorIds();
    const imported = await importDocxToEditorDocument(buffer);

    const expected = createMixedTableAndImageFixture();
    const expectedTable = expected.blocks[1];
    if (expectedTable?.type !== "table") {
      throw new Error("Expected table block");
    }
    const expectedSourceCellParagraph = expectedTable.rows[0]!.cells[0]!.blocks[0]!;
    expectedSourceCellParagraph.runs = createEditorParagraphFromRuns([{ text: "Merged " }]).runs;
    expectedTable.rows[0]!.cells[1]!.blocks[0]!.runs = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        image: {
          src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          width: 64,
          height: 32,
        },
      },
      { text: "TopRight" },
    ]).runs;

    expect(normalizeEditorDocument(imported)).toEqual(normalizeEditorDocument(expected));
  });
});
