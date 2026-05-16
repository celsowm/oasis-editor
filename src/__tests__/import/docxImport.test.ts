import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import type { EditorDocument, EditorParagraphNode, EditorTableCellNode, EditorTableNode } from "../../core/model.js";
import { getPageContentWidth, getParagraphText, getParagraphById, resolveEffectiveTextStyleForParagraph } from "../../core/model.js";
import { createEditorStateFromDocument } from "../../core/editorState.js";
import { projectParagraphLayout } from "../../ui/layoutProjection.js";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "word-parity", "fixtures");
const COMPLEX_DOCX = join(FIXTURES_DIR, "documento_complexo.docx");
const LOREM_COMPLEX_DOCX = join(FIXTURES_DIR, "lorem_ipsum_complex_document.docx");
const POINT_TO_PX = 96 / 72;
const DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX = 28;

function getDocumentParagraphs(document: EditorDocument): EditorParagraphNode[] {
  const blocks = document.sections?.flatMap((section) => section.blocks) ?? document.blocks;
  return blocks.filter((block): block is EditorParagraphNode => block.type === "paragraph");
}

function getDocumentTables(document: EditorDocument): EditorTableNode[] {
  const blocks = document.sections?.flatMap((section) => section.blocks) ?? document.blocks;
  return blocks.filter((block): block is EditorTableNode => block.type === "table");
}

async function importComplexDocument(): Promise<EditorDocument> {
  const docxBuffer = await readFile(COMPLEX_DOCX);
  return importDocxToEditorDocument(
    docxBuffer.buffer.slice(docxBuffer.byteOffset, docxBuffer.byteOffset + docxBuffer.byteLength),
  );
}

async function importLoremComplexDocument(): Promise<EditorDocument> {
  const docxBuffer = await readFile(LOREM_COMPLEX_DOCX);
  return importDocxToEditorDocument(
    docxBuffer.buffer.slice(docxBuffer.byteOffset, docxBuffer.byteOffset + docxBuffer.byteLength),
  );
}

function getCellContentWidth(cell: EditorTableCellNode): number {
  const widthPx = typeof cell.style?.width === "number" ? cell.style.width * POINT_TO_PX : 624;
  const horizontalPaddingPx =
    cell.style?.padding !== undefined
      ? cell.style.padding * POINT_TO_PX * 2
      : DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX;
  return Math.max(24, widthPx - horizontalPaddingPx);
}

describe("DOCX import", () => {
  it("preserves long lorem paragraphs and page-break-only paragraphs structurally", async () => {
    const document = await importLoremComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const firstChapter = paragraphs.find((paragraph) => getParagraphText(paragraph) === "Capítulo 1");
    const secondChapter = paragraphs.find((paragraph) => getParagraphText(paragraph) === "Capítulo 2");
    const firstLorem = paragraphs[paragraphs.findIndex((paragraph) => paragraph === firstChapter) + 1]!;

    expect(firstChapter?.style?.styleId?.toLowerCase()).toBe("heading1");
    expect(secondChapter?.style?.pageBreakBefore).toBe(true);
    expect(getParagraphText(firstLorem)).toHaveLength(2015);
    expect(getParagraphText(firstLorem)).not.toContain("\n");
    expect(firstLorem.style?.align).toBe("justify");
    expect(paragraphs.some((paragraph) => getParagraphText(paragraph).includes("\f"))).toBe(false);
    expect(paragraphs.filter((paragraph) => getParagraphText(paragraph).length === 0)).toHaveLength(0);
  });

  it("creates a valid canonical selection when imported doc uses sections with empty legacy blocks", async () => {
    const document = await importLoremComplexDocument();
    expect((document.sections?.length ?? 0) > 0).toBe(true);
    expect(document.blocks).toHaveLength(0);

    const state = createEditorStateFromDocument(document);
    const focusedParagraph = getParagraphById(
      state.document,
      state.selection.focus.paragraphId,
    );

    expect(state.activeZone).toBe("main");
    expect(focusedParagraph).toBeDefined();
  });

  it("lays out imported lorem text by wrapping one real paragraph instead of forced line breaks", async () => {
    const document = await importLoremComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const firstLorem = paragraphs.find((paragraph) => getParagraphText(paragraph).length === 2015)!;
    const pageSettings = document.sections?.[0]?.pageSettings ?? document.pageSettings;
    const layout = projectParagraphLayout(
      firstLorem,
      undefined,
      undefined,
      document.styles,
      pageSettings ? getPageContentWidth(pageSettings) : undefined,
    );
    const lineTexts = layout.lines.map((line) => line.fragments.map((fragment) => fragment.text).join("").trim());

    expect(getParagraphText(firstLorem)).not.toContain("\n");
    expect(layout.lines.length).toBeGreaterThan(10);
    expect(lineTexts).not.toContain("Sed");
  });

  it("preserves manual page breaks as paragraph page breaks", async () => {
    const document = await importComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const summary = paragraphs.find((paragraph) =>
      paragraph.runs.some((run) => run.text.includes("Sumário")),
    );
    const secondTitle = paragraphs.find((paragraph, index) =>
      index > 20 && paragraph.runs.some((run) => run.text.includes("TERMO DE REFERÊNCIA")),
    );
    const renderedBreakContinuation = paragraphs.find((paragraph) =>
      paragraph.runs.some((run) => run.text.includes("dispositivos iOS/iPadOS e simuladores")),
    );
    const footerPageField = document.sections?.[0]?.footer?.flatMap((block) =>
      block.type === "paragraph" ? block.runs : [],
    ).find((run) => run.field?.type === "PAGE");

    expect(summary?.style?.pageBreakBefore).toBe(true);
    expect(secondTitle?.style?.pageBreakBefore).toBe(true);
    expect(renderedBreakContinuation?.style?.pageBreakBefore).toBe(true);
    expect(footerPageField?.field?.type).toBe("PAGE");
    expect(paragraphs.some((paragraph) => paragraph.runs.some((run) => run.text.includes("\f")))).toBe(false);
  });

  it("preserves mixed Times New Roman and Calibri theme fonts in the complex document", async () => {
    const document = await importComplexDocument();
    const paragraphs = getDocumentParagraphs(document);

    const effectiveFamilies = paragraphs.flatMap((paragraph) =>
      paragraph.runs.map((run) =>
        resolveEffectiveTextStyleForParagraph(run.styles, paragraph.style?.styleId, document.styles).fontFamily,
      ),
    ).filter((family): family is string => typeof family === "string");

    expect(effectiveFamilies.some((family) => family.includes("Times New Roman"))).toBe(true);
    expect(effectiveFamilies.some((family) => family.includes("Calibri"))).toBe(true);
  });

  it("preserves complex document table cell shading, widths, and cell font sizes", async () => {
    const document = await importComplexDocument();
    const tables = getDocumentTables(document);
    const firstTable = tables[0];

    expect(firstTable).toBeDefined();
    expect(firstTable!.rows[0]!.cells.map((cell) => cell.style?.shading)).toEqual([
      "#D9EAF7",
      "#D9EAF7",
      "#D9EAF7",
      "#D9EAF7",
    ]);
    expect(firstTable!.rows[0]!.cells.map((cell) => cell.style?.width)).toEqual([
      34,
      326,
      62.35,
      62.35,
    ]);

    const tableFontSizes = tables.flatMap((table) =>
      table.rows.flatMap((row) =>
        row.cells.flatMap((cell) =>
          cell.blocks.flatMap((paragraph) =>
            paragraph.runs.map((run) =>
              resolveEffectiveTextStyleForParagraph(run.styles, paragraph.style?.styleId, document.styles).fontSize,
            ),
          ),
        ),
      ),
    );

    expect(tableFontSizes).toContain(12);
    expect(tableFontSizes).toContain(10.6667);
  });

  it("wraps imported table cell text using the cell width", async () => {
    const document = await importComplexDocument();
    const technicalSpecsTable = getDocumentTables(document)[1];
    const storageSpecCell = technicalSpecsTable!.rows.find((row) =>
      row.cells[0]?.blocks.some((paragraph) => getParagraphText(paragraph).includes("Armazenamento")),
    )!.cells[1]!;
    const paragraph = storageSpecCell.blocks[0]!;
    const layout = projectParagraphLayout(
      paragraph,
      undefined,
      undefined,
      document.styles,
      getCellContentWidth(storageSpecCell),
    );

    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines[0]!.fragments.map((fragment) => fragment.text).join("")).not.toContain("rápido");
  });
});
