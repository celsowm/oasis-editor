import type {
  EditorBlockNode,
  EditorDocument,
  EditorPageMargins,
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorTextRun,
} from "../../core/model.js";
import { getDocumentSections } from "../../core/model.js";
import {
  layoutPdfParagraph,
  measurePdfRunTextWidthPt,
  pdfRunFontSizePt,
  resolvePdfRunText,
  type PdfParagraphFragment,
  type PdfParagraphLine,
  type PdfParagraphTextContext,
} from "./layout/layoutParagraph.js";
import { PdfTextMeasurer } from "./layout/PdfTextMeasurer.js";
import { OasisPdfWriter } from "./OasisPdfWriter.js";

const PX_TO_PT = 72 / 96;
const DEFAULT_FONT_SIZE_PT = 11.25;
const DEFAULT_LINE_HEIGHT_PT = 16;
const LIST_INDENT_PT = 18;
const LIST_PREFIX_GAP_PT = 6;

interface PdfListState {
  orderedCounters: Map<string, number>;
}

interface PdfHeaderFooterPage {
  pageIndex: number;
  width: number;
  height: number;
  margins: EditorPageMargins;
  header?: EditorBlockNode[];
  footer?: EditorBlockNode[];
}

function pxToPt(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value * PX_TO_PT;
}

function styleLengthToPt(value: number | null | undefined): number {
  return value !== undefined && value !== null ? pxToPt(value) : 0;
}

function measurePlainTextWidthPt(text: string, fontSize: number, context: PdfParagraphTextContext): number {
  return context.measurer.measureTextWidth({
    text,
    fontSize,
  });
}

function resolveParagraphX(
  paragraph: EditorParagraphNode,
  contentLeft: number,
  contentWidth: number,
  lineWidth: number,
): number {
  if (lineWidth <= 0) {
    return contentLeft;
  }

  switch (paragraph.style?.align) {
    case "center":
      return contentLeft + Math.max(0, (contentWidth - lineWidth) / 2);
    case "right":
      return contentLeft + Math.max(0, contentWidth - lineWidth);
    case "justify":
    case "left":
    default:
      return contentLeft;
  }
}

function resolveParagraphHorizontalMetrics(
  paragraph: EditorParagraphNode,
  marginLeft: number,
  contentWidth: number,
): { left: number; width: number } {
  const indentLeft = styleLengthToPt(paragraph.style?.indentLeft);
  const indentRight = styleLengthToPt(paragraph.style?.indentRight);
  const firstLineOffset =
    styleLengthToPt(paragraph.style?.indentFirstLine) - styleLengthToPt(paragraph.style?.indentHanging);
  const listOffset = paragraph.list ? LIST_INDENT_PT * ((paragraph.list.level ?? 0) + 1) : 0;
  const left = marginLeft + indentLeft + firstLineOffset + listOffset;
  const width = Math.max(
    1,
    contentWidth - indentLeft - indentRight - Math.max(0, firstLineOffset) - listOffset,
  );
  return { left, width };
}

function drawTextHighlight(
  writer: OasisPdfWriter,
  pageIndex: number,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  run: EditorTextRun,
): void {
  if (!run.styles?.highlight || width <= 0) {
    return;
  }

  writer.drawRect(pageIndex, {
    x,
    y: y - fontSize * 0.82,
    width,
    height: fontSize,
    fill: run.styles.highlight,
  });
}

function drawTextDecorations(
  writer: OasisPdfWriter,
  pageIndex: number,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  color: string,
  run: EditorTextRun,
): void {
  if (width <= 0) {
    return;
  }

  const lineWidth = Math.max(0.5, fontSize / 18);
  if (run.styles?.underline) {
    writer.drawLine(pageIndex, {
      x1: x,
      y1: y + fontSize * 0.14,
      x2: x + width,
      y2: y + fontSize * 0.14,
      stroke: color,
      lineWidth,
    });
  }
  if (run.styles?.strike) {
    writer.drawLine(pageIndex, {
      x1: x,
      y1: y - fontSize * 0.32,
      x2: x + width,
      y2: y - fontSize * 0.32,
      stroke: color,
      lineWidth,
    });
  }
}

function drawLineFragment(
  writer: OasisPdfWriter,
  pageIndex: number,
  fragment: PdfParagraphFragment,
  lineX: number,
  y: number,
): void {
  const run = fragment.run;
  const x = lineX + fragment.x;
  const color = run.styles?.color ?? "#111827";
  drawTextHighlight(writer, pageIndex, x, y, fragment.width, fragment.fontSize, run);
  writer.drawText(pageIndex, {
    x,
    y,
    text: fragment.text,
    fontSize: fragment.fontSize,
    color,
    bold: run.styles?.bold,
    italic: run.styles?.italic,
  });
  drawTextDecorations(writer, pageIndex, x, y, fragment.width, fragment.fontSize, color, run);
}

function drawParagraphLine(
  writer: OasisPdfWriter,
  pageIndex: number,
  paragraph: EditorParagraphNode,
  line: PdfParagraphLine,
  contentLeft: number,
  contentWidth: number,
  y: number,
): void {
  const lineX = resolveParagraphX(paragraph, contentLeft, contentWidth, line.width);
  if (line.fragments.length === 0) {
    writer.drawText(pageIndex, {
      x: lineX,
      y,
      text: " ",
      fontSize: DEFAULT_FONT_SIZE_PT,
      color: "#111827",
    });
    return;
  }

  for (const fragment of line.fragments) {
    drawLineFragment(writer, pageIndex, fragment, lineX, y);
  }
}

function orderedListValueToText(value: number, format: EditorParagraphListStyle["format"]): string {
  if (format === "lowerLetter" || format === "upperLetter") {
    const letter = String.fromCharCode(97 + ((value - 1) % 26));
    return format === "upperLetter" ? letter.toUpperCase() : letter;
  }
  return String(value);
}

function orderedListCounterKey(list: NonNullable<EditorParagraphNode["list"]>): string {
  return `${list.level ?? 0}:${list.format ?? "decimal"}`;
}

function resolveListPrefix(paragraph: EditorParagraphNode, listState: PdfListState): string | null {
  if (!paragraph.list) {
    listState.orderedCounters.clear();
    return null;
  }

  const level = Math.max(0, paragraph.list.level ?? 0);
  for (const key of Array.from(listState.orderedCounters.keys())) {
    const keyLevel = Number.parseInt(key.split(":", 1)[0] ?? "0", 10);
    if (keyLevel > level) {
      listState.orderedCounters.delete(key);
    }
  }

  if (paragraph.list.kind === "bullet") {
    return "•";
  }

  const counterKey = orderedListCounterKey(paragraph.list);
  const previous = listState.orderedCounters.get(counterKey);
  const next = previous === undefined ? (paragraph.list.startAt ?? 1) : previous + 1;
  listState.orderedCounters.set(counterKey, next);
  return `${orderedListValueToText(next, paragraph.list.format)}.`;
}

function drawListPrefix(
  writer: OasisPdfWriter,
  pageIndex: number,
  prefix: string | null,
  paragraphX: number,
  y: number,
  context: PdfParagraphTextContext,
): void {
  if (!prefix) {
    return;
  }

  writer.drawText(pageIndex, {
    x: Math.max(0, paragraphX - LIST_PREFIX_GAP_PT - measurePlainTextWidthPt(prefix, DEFAULT_FONT_SIZE_PT, context)),
    y,
    text: prefix,
    fontSize: DEFAULT_FONT_SIZE_PT,
    color: "#111827",
  });
}

function drawBlockParagraphs(
  writer: OasisPdfWriter,
  pageIndex: number,
  blocks: EditorBlockNode[] | undefined,
  x: number,
  y: number,
  contentWidth: number,
  context: PdfParagraphTextContext,
): void {
  if (!blocks || blocks.length === 0) {
    return;
  }

  let cursorY = y;
  for (const block of blocks) {
    if (block.type !== "paragraph") {
      continue;
    }
    cursorY += styleLengthToPt(block.style?.spacingBefore);
    const horizontal = resolveParagraphHorizontalMetrics(block, x, contentWidth);
    const layout = layoutPdfParagraph({
      paragraph: block,
      maxWidth: horizontal.width,
      context,
      defaultFontSize: DEFAULT_FONT_SIZE_PT,
      defaultLineHeight: DEFAULT_LINE_HEIGHT_PT,
      pxToPt,
    });
    for (const line of layout.lines) {
      drawParagraphLine(writer, pageIndex, block, line, horizontal.left, horizontal.width, cursorY);
      cursorY += line.height;
    }
    cursorY += styleLengthToPt(block.style?.spacingAfter);
  }
}

function drawPageBackground(writer: OasisPdfWriter, pageIndex: number, width: number, height: number): void {
  writer.drawRect(pageIndex, {
    x: 0,
    y: 0,
    width,
    height,
    fill: "#ffffff",
  });
}

function drawSectionHeaderFooter(
  writer: OasisPdfWriter,
  page: PdfHeaderFooterPage,
  totalPages: number,
  measurer: PdfTextMeasurer,
): void {
  const marginLeft = pxToPt(page.margins.left + page.margins.gutter);
  const marginRight = pxToPt(page.margins.right);
  const contentWidth = Math.max(1, page.width - marginLeft - marginRight);
  const headerY = Math.max(56, pxToPt(page.margins.header));
  const footerY = Math.min(Math.max(headerY + DEFAULT_LINE_HEIGHT_PT, page.height - pxToPt(page.margins.footer)), page.height - 18);
  const context: PdfParagraphTextContext = {
    pageNumber: page.pageIndex + 1,
    totalPages,
    measurer,
  };

  drawBlockParagraphs(writer, page.pageIndex, page.header, marginLeft, headerY, contentWidth, context);
  drawBlockParagraphs(writer, page.pageIndex, page.footer, marginLeft, footerY, contentWidth, context);
}

function addSectionPage(writer: OasisPdfWriter, width: number, height: number): number {
  const pageIndex = writer.addPage({ width, height });
  drawPageBackground(writer, pageIndex, width, height);
  return pageIndex;
}

export async function exportEditorDocumentToPdf(document: EditorDocument): Promise<ArrayBuffer> {
  const writer = new OasisPdfWriter();
  const measurer = new PdfTextMeasurer();
  const sections = getDocumentSections(document);
  const headerFooterPages: PdfHeaderFooterPage[] = [];

  for (const section of sections) {
    const width = Math.max(1, pxToPt(section.pageSettings.width));
    const height = Math.max(1, pxToPt(section.pageSettings.height));
    const marginLeft = pxToPt(section.pageSettings.margins.left + section.pageSettings.margins.gutter);
    const marginRight = pxToPt(section.pageSettings.margins.right);
    const marginTop = pxToPt(section.pageSettings.margins.top);
    const marginBottom = pxToPt(section.pageSettings.margins.bottom);
    const contentWidth = Math.max(1, width - marginLeft - marginRight);
    const contentBottom = Math.max(marginTop + DEFAULT_LINE_HEIGHT_PT, height - marginBottom);
    let pageIndex = addSectionPage(writer, width, height);
    headerFooterPages.push({
      pageIndex,
      width,
      height,
      margins: section.pageSettings.margins,
      header: section.header,
      footer: section.footer,
    });
    const listState: PdfListState = { orderedCounters: new Map() };

    let cursorY = Math.max(64, marginTop);
    for (const block of section.blocks) {
      if (block.type !== "paragraph") {
        continue;
      }

      const context = { pageNumber: pageIndex + 1, totalPages: 0, measurer };
      const horizontal = resolveParagraphHorizontalMetrics(block, marginLeft, contentWidth);
      const layout = layoutPdfParagraph({
        paragraph: block,
        maxWidth: horizontal.width,
        context,
        defaultFontSize: DEFAULT_FONT_SIZE_PT,
        defaultLineHeight: DEFAULT_LINE_HEIGHT_PT,
        pxToPt,
      });
      const prefix = resolveListPrefix(block, listState);

      cursorY += styleLengthToPt(block.style?.spacingBefore);
      for (const [lineIndex, line] of layout.lines.entries()) {
        if (cursorY + line.height > contentBottom) {
          pageIndex = addSectionPage(writer, width, height);
          headerFooterPages.push({
            pageIndex,
            width,
            height,
            margins: section.pageSettings.margins,
            header: section.header,
            footer: section.footer,
          });
          cursorY = Math.max(64, marginTop);
        }

        const lineContext = { pageNumber: pageIndex + 1, totalPages: 0, measurer };
        const lineX = resolveParagraphX(block, horizontal.left, horizontal.width, line.width);
        if (lineIndex === 0) {
          drawListPrefix(writer, pageIndex, prefix, lineX, cursorY, lineContext);
        }
        drawParagraphLine(writer, pageIndex, block, line, horizontal.left, horizontal.width, cursorY);
        cursorY += line.height;
      }
      cursorY += styleLengthToPt(block.style?.spacingAfter);
    }
  }

  if (writer.getPageCount() === 0) {
    const pageIndex = writer.addPage({ width: 612, height: 792 });
    drawPageBackground(writer, pageIndex, 612, 792);
  }

  const totalPages = writer.getPageCount();
  for (const page of headerFooterPages) {
    drawSectionHeaderFooter(writer, page, totalPages, measurer);
  }

  return writer.toArrayBuffer();
}

export async function exportEditorDocumentToPdfBlob(document: EditorDocument): Promise<Blob> {
  const buffer = await exportEditorDocumentToPdf(document);
  return new Blob([buffer], { type: "application/pdf" });
}
