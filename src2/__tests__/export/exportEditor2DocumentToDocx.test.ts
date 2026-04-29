import { beforeEach, describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditor2Document,
  createEditor2ParagraphFromRuns,
  createEditor2Table,
  createEditor2TableCell,
  createEditor2TableRow,
  resetEditor2Ids,
} from "../../core/editorState.js";
import { exportEditor2DocumentToDocx } from "../../export/docx/exportEditor2DocumentToDocx.js";
import { importDocxToEditor2Document } from "../../import/docx/importDocxToEditor2Document.js";
import { getParagraphText } from "../../core/model.js";
import { createDocxRoundTripFixtures } from "../fixtures/docxRoundTripFixtures.js";
import { normalizeEditor2Document } from "../shared/normalizeEditor2Document.js";

describe("exportEditor2DocumentToDocx", () => {
  beforeEach(() => {
    resetEditor2Ids();
  });

  it("writes the minimal docx package parts for the supported subset", async () => {
    const firstParagraph = createEditor2ParagraphFromRuns([
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

    const secondParagraph = createEditor2ParagraphFromRuns([
      { text: "Second", styles: { strike: true, highlight: "yellow" } },
    ]);
    secondParagraph.list = { kind: "ordered", level: 1 };

    const document = createEditor2Document([firstParagraph, secondParagraph]);
    const buffer = await exportEditor2DocumentToDocx(document);
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
    const firstParagraph = createEditor2ParagraphFromRuns([
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

    const secondParagraph = createEditor2ParagraphFromRuns([
      { text: "Gamma", styles: { strike: true, highlight: "yellow", subscript: true } },
    ]);

    const exported = createEditor2Document([firstParagraph, secondParagraph]);
    const buffer = await exportEditor2DocumentToDocx(exported);

    resetEditor2Ids();
    const imported = await importDocxToEditor2Document(buffer);
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

  for (const fixture of createDocxRoundTripFixtures()) {
    it(`round-trips fixture: ${fixture.name}`, async () => {
      const buffer = await exportEditor2DocumentToDocx(fixture.document);

      resetEditor2Ids();
      const imported = await importDocxToEditor2Document(buffer);

      expect(normalizeEditor2Document(imported)).toEqual(
        normalizeEditor2Document(fixture.document),
      );
    });
  }

  it("maps hex highlight colors to valid docx highlight keywords", async () => {
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "Marked", styles: { highlight: "#fef08a" } },
    ]);
    const document = createEditor2Document([paragraph]);
    const buffer = await exportEditor2DocumentToDocx(document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain('<w:highlight w:val="yellow"/>');
  });

  it("exports and reimports simple tables while preserving block order", async () => {
    const intro = createEditor2ParagraphFromRuns([{ text: "Intro" }]);
    const table = createEditor2Table([
      createEditor2TableRow([
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "A1" }])]),
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "B1", styles: { bold: true } }])]),
      ]),
      createEditor2TableRow([
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "A2" }])]),
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "B2", styles: { italic: true } }])]),
      ]),
    ]);
    const outro = createEditor2ParagraphFromRuns([{ text: "Outro" }]);
    const document = createEditor2Document([intro, table, outro]);

    const buffer = await exportEditor2DocumentToDocx(document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain("<w:tbl>");
    expect(documentXml).toContain("A1");
    expect(documentXml).toContain("B2");

    resetEditor2Ids();
    const imported = await importDocxToEditor2Document(buffer);
    const importedTable = imported.blocks[1];

    expect(imported.blocks[0]?.type).toBe("paragraph");
    expect(importedTable?.type).toBe("table");
    expect(imported.blocks[2]?.type).toBe("paragraph");
    if (importedTable?.type !== "table") {
      throw new Error("Expected imported table block");
    }
    expect(getParagraphText(importedTable.rows[0]!.cells[0]!.blocks[0]!)).toBe("A1");
    expect(importedTable.rows[0]!.cells[1]!.blocks[0]!.runs[0]!.styles).toEqual({ bold: true });
    expect(importedTable.rows[1]!.cells[1]!.blocks[0]!.runs[0]!.styles).toEqual({ italic: true });
  });
});
