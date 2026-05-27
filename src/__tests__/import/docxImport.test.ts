import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { exportEditorDocumentToPdfBlob } from "../../export/pdf/exportEditorDocumentToPdf.js";
import type { EditorDocument, EditorParagraphNode, EditorTableCellNode, EditorTableNode } from "../../core/model.js";
import {
  getPageContentWidth,
  getParagraphText,
  getParagraphById,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../../core/model.js";
import { createEditorStateFromDocument } from "../../core/editorState.js";
import { estimateTableBlockHeight, projectDocumentLayout, projectParagraphLayout } from "../../ui/layoutProjection.js";
import { buildCanvasTableLayout } from "../../ui/canvas/CanvasTableLayout.js";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "word-parity", "fixtures");
const COMPLEX_DOCX = join(FIXTURES_DIR, "documento_complexo.docx");
const LOREM_COMPLEX_DOCX = join(FIXTURES_DIR, "lorem_ipsum_complex_document.docx");
const POINT_TO_PX = 96 / 72;
const DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX = 28;

function pdfColorCommand(color: string, operator: "rg" | "RG"): string {
  const normalized = color.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  return `${Number(r.toFixed(3))} ${Number(g.toFixed(3))} ${Number(b.toFixed(3))} ${operator}`;
}

function getDocumentParagraphs(document: EditorDocument): EditorParagraphNode[] {
  const blocks = document.sections?.flatMap((section) => section.blocks) ?? [];
  return blocks.filter((block): block is EditorParagraphNode => block.type === "paragraph");
}

function getDocumentTables(document: EditorDocument): EditorTableNode[] {
  const blocks = document.sections?.flatMap((section) => section.blocks) ?? [];
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

async function buildDocxWithSingleParagraph(indAttributes: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:ind ${indAttributes}/>
      </w:pPr>
      <w:r><w:t>Indented paragraph</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildDocxWithNormalFirstLineAndExplicitZero(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:ind w:firstLine="0"/></w:pPr>
      <w:r><w:t>14    DA CLASSIFICAÇÃO NOS TERMOS DA LEI DE ACESSO A INFORMAÇÃO</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:ind w:firstLine="720"/></w:pPr>
  </w:style>
</w:styles>`;

  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", stylesXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildDocxWithPageBreakBeforeTable(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Before break</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:tbl>
      <w:tblPr><w:tblW w:type="auto" w:w="0"/></w:tblPr>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:t>Table after break</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildDocxWithHeaderImage(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Body</w:t></w:r></w:p>
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeader"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>`;
  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:p>
    <w:r>
      <w:drawing>
        <wp:inline>
          <wp:extent cx="19050" cy="28575"/>
          <wp:docPr id="1" name="Header Logo" descr="Logo"/>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:blipFill><a:blip r:embed="rIdImage"/></pic:blipFill>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>
</w:hdr>`;
  const headerRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", documentRelsXml);
  zip.file("word/header1.xml", headerXml);
  zip.file("word/_rels/header1.xml.rels", headerRelsXml);
  zip.file(
    "word/media/image1.png",
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+Xh6qAAAAAElFTkSuQmCC",
    { base64: true },
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildDocxWithTypedHeaders(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Page one</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:p><w:r><w:t>Page two</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:p><w:r><w:t>Page three</w:t></w:r></w:p>
    <w:sectPr>
      <w:headerReference w:type="first" r:id="rIdFirstHeader"/>
      <w:headerReference w:type="even" r:id="rIdEvenHeader"/>
      <w:headerReference w:type="default" r:id="rIdDefaultHeader"/>
      <w:footerReference w:type="first" r:id="rIdFirstFooter"/>
      <w:footerReference w:type="even" r:id="rIdEvenFooter"/>
      <w:footerReference w:type="default" r:id="rIdDefaultFooter"/>
      <w:titlePg/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdFirstHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdEvenHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/>
  <Relationship Id="rIdDefaultHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header3.xml"/>
  <Relationship Id="rIdFirstFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  <Relationship Id="rIdEvenFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer2.xml"/>
  <Relationship Id="rIdDefaultFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer3.xml"/>
</Relationships>`;
  const partXml = (tag: "hdr" | "ftr", text: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:${tag} xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:${tag}>`;

  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", documentRelsXml);
  zip.file("word/header1.xml", partXml("hdr", "FIRST HEADER"));
  zip.file("word/header2.xml", partXml("hdr", "EVEN HEADER"));
  zip.file("word/header3.xml", partXml("hdr", "DEFAULT HEADER"));
  zip.file("word/footer1.xml", partXml("ftr", "FIRST FOOTER"));
  zip.file("word/footer2.xml", partXml("ftr", "EVEN FOOTER"));
  zip.file("word/footer3.xml", partXml("ftr", "DEFAULT FOOTER"));
  return zip.generateAsync({ type: "arraybuffer" });
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

  it("keeps Heading 1 spacing before at the top of the first imported page", async () => {
    const document = await importLoremComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const firstChapter = paragraphs.find((paragraph) => getParagraphText(paragraph) === "Capítulo 1")!;
    const effectiveStyle = resolveEffectiveParagraphStyle(firstChapter.style, document.styles);
    const layout = projectDocumentLayout(document, undefined, undefined, undefined, { layoutMode: "wordParity" });
    const firstBlock = layout.pages[0]!.blocks[0]!;
    const lineHeights = firstBlock.layout!.lines.reduce((sum, line) => sum + line.height, 0);

    expect(effectiveStyle.spacingBefore).toBe(32);
    expect(effectiveStyle.spacingAfter).toBe(0);
    expect(firstBlock.sourceBlockId).toBe(firstChapter.id);
    expect(firstBlock.layout?.startOffset).toBe(0);
    expect(firstBlock.estimatedHeight).toBeCloseTo(lineHeights + 32, 4);
  });

  it("preserves first-line indentation from DOCX in projected layout slots", async () => {
    const document = await importLoremComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const firstIndentedParagraph = paragraphs.find((paragraph) => (paragraph.style?.indentFirstLine ?? 0) > 0);
    const pageSettings = document.sections?.[0]?.pageSettings ?? document.pageSettings;

    expect(firstIndentedParagraph).toBeDefined();
    expect(firstIndentedParagraph!.style?.indentFirstLine).toBeCloseTo(29, 0);

    const layout = projectParagraphLayout(
      firstIndentedParagraph!,
      undefined,
      undefined,
      document.styles,
      pageSettings ? getPageContentWidth(pageSettings) : undefined,
    );

    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines[0]!.slots[0]?.left ?? 0).toBeCloseTo(29, 0);
    expect(layout.lines[1]!.slots[0]?.left ?? 0).toBeCloseTo(0, 0);
  });

  it("imports images with correct dimensions from DOCX", async () => {
    const document = await importLoremComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const imageParagraph = paragraphs.find((p) => p.runs.some((r) => r.image));

    expect(imageParagraph).toBeDefined();
    const imageRun = imageParagraph!.runs.find((r) => r.image)!;
    expect(imageRun.text).toBe("\uFFFC");
    expect(imageRun.image?.width).toBe(557);
    expect(imageRun.image?.height).toBe(278);
    expect(imageRun.image?.src).toMatch(/^asset:/);
    
    const assetId = imageRun.image!.src.split(":")[1]!;
    expect(document.assets?.[assetId]).toBeDefined();
    expect(document.assets?.[assetId]?.url).toMatch(/^data:image\/png;base64,/);
  });

  it("maps OOXML start/end indents and applies hanging precedence over firstLine", async () => {
    const buffer = await buildDocxWithSingleParagraph(
      'w:start="720" w:end="360" w:firstLine="300" w:hanging="180"',
    );
    const document = await importDocxToEditorDocument(buffer);
    const paragraph = getDocumentParagraphs(document)[0]!;

    expect(paragraph.style?.indentLeft).toBe(48);
    expect(paragraph.style?.indentRight).toBe(24);
    expect(paragraph.style?.indentHanging).toBe(12);
    expect(paragraph.style?.indentFirstLine).toBeUndefined();
  });

  it("preserves explicit zero first-line indentation over imported Normal style", async () => {
    const document = await importDocxToEditorDocument(await buildDocxWithNormalFirstLineAndExplicitZero());
    const paragraph = getDocumentParagraphs(document)[0]!;
    const pageSettings = document.sections?.[0]?.pageSettings ?? document.pageSettings;

    expect(document.styles?.Normal?.paragraphStyle?.indentFirstLine).toBe(48);
    expect(paragraph.style?.indentFirstLine).toBe(0);

    const layout = projectParagraphLayout(
      paragraph,
      undefined,
      undefined,
      document.styles,
      pageSettings ? getPageContentWidth(pageSettings) : undefined,
    );

    expect(layout.lines[0]!.slots[0]?.left).toBe(0);
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

  it("preserves a manual page break before a table", async () => {
    const document = await importDocxToEditorDocument(await buildDocxWithPageBreakBeforeTable());
    const table = getDocumentTables(document)[0]!;

    expect(table.style?.pageBreakBefore).toBe(true);

    const layout = projectDocumentLayout(document);
    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]!.blocks.map((block) => block.blockType)).toEqual(["paragraph"]);
    expect(layout.pages[1]!.blocks[0]?.blockType).toBe("table");
    expect(layout.pages[1]!.blocks[0]?.sourceBlockId).toBe(table.id);
  });

  it("loads images from header-specific relationships", async () => {
    const document = await importDocxToEditorDocument(await buildDocxWithHeaderImage());
    const imageRun = document.sections?.[0]?.header
      ?.flatMap((block) => (block.type === "paragraph" ? block.runs : []))
      .find((run) => run.image);

    expect(imageRun?.text).toBe("\uFFFC");
    expect(imageRun?.image?.width).toBe(2);
    expect(imageRun?.image?.height).toBe(3);
    expect(imageRun?.image?.alt).toBe("Logo");
    expect(imageRun?.image?.src).toMatch(/^asset:/);

    const assetId = imageRun!.image!.src.slice("asset:".length);
    expect(document.assets?.[assetId]?.url).toMatch(/^data:image\/png;base64,/);
  });

  it("imports and projects first, even, and default headers by page type", async () => {
    const document = await importDocxToEditorDocument(await buildDocxWithTypedHeaders());
    const section = document.sections?.[0];

    expect(section?.firstPageHeader?.[0]?.type).toBe("paragraph");
    expect(section?.evenPageHeader?.[0]?.type).toBe("paragraph");
    expect(section?.header?.[0]?.type).toBe("paragraph");
    expect(section?.firstPageFooter?.[0]?.type).toBe("paragraph");
    expect(section?.evenPageFooter?.[0]?.type).toBe("paragraph");
    expect(section?.footer?.[0]?.type).toBe("paragraph");

    const layout = projectDocumentLayout(document);
    const headerTexts = layout.pages.slice(0, 3).map((page) =>
      page.headerBlocks?.[0]?.layout?.text,
    );
    const footerTexts = layout.pages.slice(0, 3).map((page) =>
      page.footerBlocks?.[0]?.layout?.text,
    );

    expect(headerTexts).toEqual(["FIRST HEADER", "EVEN HEADER", "DEFAULT HEADER"]);
    expect(footerTexts).toEqual(["FIRST FOOTER", "EVEN FOOTER", "DEFAULT FOOTER"]);
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

  it("imports table grid column widths (gridCols) from DOCX", async () => {
    const document = await importLoremComplexDocument();
    const table = getDocumentTables(document)[0];

    expect(table).toBeDefined();
    // lorem_ipsum_complex_document.docx has 4 columns with w="2484" (124.2pt)
    expect(table!.gridCols).toBeDefined();
    expect(table!.gridCols).toHaveLength(4);
    table!.gridCols!.forEach((width) => {
      expect(width).toBeCloseTo(124.2, 1);
    });
  });

  it("keeps imported table layout height aligned with canvas table rendering", async () => {
    const document = await importLoremComplexDocument();
    const table = getDocumentTables(document)[0]!;
    const pageSettings = document.sections?.[0]?.pageSettings ?? document.pageSettings;
    const contentWidth = pageSettings ? getPageContentWidth(pageSettings) : 662;
    const estimatedHeight = estimateTableBlockHeight(
      table,
      document.styles,
      contentWidth,
    );
    const canvasLayout = buildCanvasTableLayout({
      table,
      state: createEditorStateFromDocument(document),
      pageIndex: 0,
      layoutMode: "fast",
      originX: 0,
      originY: 0,
      contentWidth,
      estimatedHeight,
    });

    expect(table.rows).toHaveLength(5);
    expect(estimatedHeight).toBeCloseTo(canvasLayout.height, 4);
  });

  it("imports individual table cell margins (tcMar) from DOCX", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcMar>
              <w:top w:w="200" w:type="dxa"/>
              <w:bottom w:w="100" w:type="dxa"/>
              <w:left w:w="300" w:type="dxa"/>
              <w:right w:w="400" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p><w:r><w:t>Cell with margins</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const document = await importDocxToEditorDocument(buffer);
    const table = getDocumentTables(document)[0]!;
    const cellStyle = table.rows[0]!.cells[0]!.style;

    expect(cellStyle?.paddingTop).toBe(10); // 200 / 20
    expect(cellStyle?.paddingBottom).toBe(5); // 100 / 20
    expect(cellStyle?.paddingLeft).toBe(15); // 300 / 20
    expect(cellStyle?.paddingRight).toBe(20); // 400 / 20
  });

  it("imports table cell vertical alignment from DOCX", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
          <w:p><w:r><w:t>Top</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:r><w:t>Middle</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:vAlign w:val="bottom"/></w:tcPr>
          <w:p><w:r><w:t>Bottom</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:vAlign w:val="both"/></w:tcPr>
          <w:p><w:r><w:t>Unsupported</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);

    const document = await importDocxToEditorDocument(await zip.generateAsync({ type: "arraybuffer" }));
    const cells = getDocumentTables(document)[0]!.rows[0]!.cells;

    expect(cells[0]!.style?.verticalAlign).toBe("top");
    expect(cells[1]!.style?.verticalAlign).toBe("middle");
    expect(cells[2]!.style?.verticalAlign).toBe("bottom");
    expect(cells[3]!.style?.verticalAlign).toBeUndefined();
  });

  it("imports table cell borders and carries them through DOCX and PDF export", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblGrid><w:gridCol w:w="2400"/></w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2400" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="single" w:sz="8" w:space="0" w:color="112233"/>
              <w:right w:val="dashed" w:sz="12" w:space="0" w:color="445566"/>
              <w:bottom w:val="nil"/>
              <w:left w:val="dotted" w:sz="6" w:space="0" w:color="778899"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p><w:r><w:t>Bordered cell</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);

    const document = await importDocxToEditorDocument(await zip.generateAsync({ type: "arraybuffer" }));
    const cellStyle = getDocumentTables(document)[0]!.rows[0]!.cells[0]!.style;

    expect(cellStyle?.borderTop).toEqual({ width: 1, type: "solid", color: "#112233" });
    expect(cellStyle?.borderRight).toEqual({ width: 1.5, type: "dashed", color: "#445566" });
    expect(cellStyle?.borderBottom).toEqual({ width: 0, type: "none", color: "transparent" });
    expect(cellStyle?.borderLeft).toEqual({ width: 0.75, type: "dotted", color: "#778899" });

    const exportedZip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
    const exportedDocumentXml = await exportedZip.file("word/document.xml")?.async("string");
    expect(exportedDocumentXml).toContain('<w:top w:val="single" w:sz="8" w:space="0" w:color="112233"/>');
    expect(exportedDocumentXml).toContain('<w:right w:val="dashed" w:sz="12" w:space="0" w:color="445566"/>');
    expect(exportedDocumentXml).toContain('<w:bottom w:val="nil"/>');
    expect(exportedDocumentXml).toContain('<w:left w:val="dotted" w:sz="6" w:space="0" w:color="778899"/>');

    const pdf = await (await exportEditorDocumentToPdfBlob(document)).text();
    expect(pdf).toContain(pdfColorCommand("#112233", "RG"));
    expect(pdf).toContain(pdfColorCommand("#445566", "RG"));
    expect(pdf).toContain(pdfColorCommand("#778899", "RG"));
    expect(pdf).not.toContain("transparent");
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
