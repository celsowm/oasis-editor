import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import type { EditorDocument, EditorParagraphNode, EditorTableNode } from "../../core/model.js";
import { resolveEffectiveTextStyleForParagraph } from "../../core/model.js";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "word-parity", "fixtures");
const COMPLEX_DOCX = join(FIXTURES_DIR, "documento_complexo.docx");

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

describe("DOCX import", () => {
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
});
