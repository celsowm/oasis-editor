import type {
  EditorBlockNode,
  EditorDocument,
  EditorNamedStyle,
  EditorPageMargins,
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTextRun,
} from "../../core/model.js";
import { getDocumentSections, resolveEffectiveParagraphStyle } from "../../core/model.js";
import { PdfFontRegistry } from "./fonts/PdfFontRegistry.js";
import {
  layoutPdfParagraph,
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

interface PdfExportContext extends PdfParagraphTextContext {
  fontRegistry: PdfFontRegistry;
}

interface PdfVerticalMetrics {
  headerTop: number;
  bodyTop: number;
  bodyBottom: number;
  footerTop: number;
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
  effectiveStyle: Required<EditorParagraphStyle>,
  contentLeft: number,
  contentWidth: number,
  lineWidth: number,
): number {
  if (lineWidth <= 0) {
    return contentLeft;
  }

  switch (effectiveStyle.align) {
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
  effectiveStyle: Required<EditorParagraphStyle>,
  marginLeft: number,
  contentWidth: number,
): { left: number; width: number } {
  const indentLeft = styleLengthToPt(effectiveStyle.indentLeft);
  const indentRight = styleLengthToPt(effectiveStyle.indentRight);
  const firstLineOffset =
    styleLengthToPt(effectiveStyle.indentFirstLine) - styleLengthToPt(effectiveStyle.indentHanging);
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
  context: PdfExportContext,
): void {
  const run = fragment.run;
  const x = lineX + fragment.x;
  const color = run.styles?.color ?? "#111827";
  const fontFace = context.fontRegistry.resolveFontFace({
    fontFamily: run.styles?.fontFamily,
    bold: run.styles?.bold,
    italic: run.styles?.italic,
  });
  drawTextHighlight(writer, pageIndex, x, y, fragment.width, fragment.fontSize, run);
  writer.drawText(pageIndex, {
    x,
    y,
    text: fragment.text,
    fontSize: fragment.fontSize,
    color,
    bold: run.styles?.bold,
    italic: run.styles?.italic,
    fontResourceName: fontFace.writerResourceName,
  });
  drawTextDecorations(writer, pageIndex, x, y, fragment.width, fragment.fontSize, color, run);
}

function drawParagraphLine(
  writer: OasisPdfWriter,
  pageIndex: number,
  effectiveStyle: Required<EditorParagraphStyle>,
  line: PdfParagraphLine,
  contentLeft: number,
  contentWidth: number,
  y: number,
  context: PdfExportContext,
  isLastLine: boolean,
): void {
  const lineX = resolveParagraphX(effectiveStyle, contentLeft, contentWidth, line.width);
  if (line.fragments.length === 0) {
    writer.drawText(pageIndex, {
      x: lineX,
      y,
      text: " ",
      fontSize: DEFAULT_FONT_SIZE_PT,
      color: "#111827",
      fontResourceName: context.fontRegistry.resolveFontFace({}).writerResourceName,
    });
    return;
  }

  const shouldJustify =
    effectiveStyle.align === "justify" &&
    !isLastLine &&
    line.fragments.length > 1 &&
    line.width < contentWidth;
  const gapShift = shouldJustify
    ? (contentWidth - line.width) / (line.fragments.length - 1)
    : 0;

  for (const [index, fragment] of line.fragments.entries()) {
    const extra = gapShift * index;
    drawLineFragment(
      writer,
      pageIndex,
      { ...fragment, x: fragment.x + extra },
      lineX,
      y,
      context,
    );
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
  context: PdfExportContext,
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
    fontResourceName: context.fontRegistry.resolveFontFace({}).writerResourceName,
  });
}

function drawBlockParagraphs(
  writer: OasisPdfWriter,
  pageIndex: number,
  blocks: EditorBlockNode[] | undefined,
  x: number,
  y: number,
  contentWidth: number,
  context: PdfExportContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): void {
  if (!blocks || blocks.length === 0) {
    return;
  }

  let cursorY = y;
  for (const block of blocks) {
    if (block.type !== "paragraph") {
      continue;
    }
    const effectiveStyle = resolveEffectiveParagraphStyle(block.style, styles);
    cursorY += styleLengthToPt(effectiveStyle.spacingBefore);
    const horizontal = resolveParagraphHorizontalMetrics(block, effectiveStyle, x, contentWidth);
    const layout = layoutPdfParagraph({
      paragraph: block,
      maxWidth: horizontal.width,
      context,
      defaultFontSize: DEFAULT_FONT_SIZE_PT,
      defaultLineHeight: DEFAULT_LINE_HEIGHT_PT,
      pxToPt,
    });
    for (const [lineIndex, line] of layout.lines.entries()) {
      const isLastLine = lineIndex === layout.lines.length - 1;
      drawParagraphLine(
        writer,
        pageIndex,
        effectiveStyle,
        line,
        horizontal.left,
        horizontal.width,
        cursorY,
        context,
        isLastLine,
      );
      cursorY += line.height;
    }
    cursorY += styleLengthToPt(effectiveStyle.spacingAfter);
  }
}

function measureBlockParagraphsHeight(
  blocks: EditorBlockNode[] | undefined,
  contentWidth: number,
  context: PdfExportContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): number {
  if (!blocks || blocks.length === 0) {
    return 0;
  }

  let height = 0;
  for (const block of blocks) {
    if (block.type !== "paragraph") {
      continue;
    }
    const effectiveStyle = resolveEffectiveParagraphStyle(block.style, styles);
    const horizontal = resolveParagraphHorizontalMetrics(block, effectiveStyle, 0, contentWidth);
    const layout = layoutPdfParagraph({
      paragraph: block,
      maxWidth: horizontal.width,
      context,
      defaultFontSize: DEFAULT_FONT_SIZE_PT,
      defaultLineHeight: DEFAULT_LINE_HEIGHT_PT,
      pxToPt,
    });
    height += styleLengthToPt(effectiveStyle.spacingBefore);
    height += layout.lines.reduce((sum, line) => sum + line.height, 0);
    height += styleLengthToPt(effectiveStyle.spacingAfter);
  }
  return height;
}

function clampPageOffsetPt(value: number, pageHeight: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(0, value), pageHeight);
}

function resolvePdfVerticalMetrics(
  page: Pick<PdfHeaderFooterPage, "height" | "margins" | "header" | "footer">,
  contentWidth: number,
  context: PdfExportContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): PdfVerticalMetrics {
  const headerTop = clampPageOffsetPt(pxToPt(page.margins.header), page.height);
  const staticBodyTop = Math.max(
    clampPageOffsetPt(pxToPt(page.margins.top), page.height),
    headerTop,
  );
  const staticBodyBottom = Math.min(
    page.height,
    Math.max(
      staticBodyTop,
      Math.min(
        page.height - clampPageOffsetPt(pxToPt(page.margins.bottom), page.height),
        page.height - clampPageOffsetPt(pxToPt(page.margins.footer), page.height),
      ),
    ),
  );
  const headerHeight = measureBlockParagraphsHeight(page.header, contentWidth, context, styles);
  const footerHeight = measureBlockParagraphsHeight(page.footer, contentWidth, context, styles);
  const footerTop = page.footer && page.footer.length > 0
    ? Math.max(0, page.height - pxToPt(page.margins.footer) - footerHeight)
    : page.height;
  const bodyTop = Math.max(staticBodyTop, headerHeight > 0 ? Math.min(page.height, headerTop + headerHeight) : 0);
  const bodyBottom = Math.max(bodyTop, Math.min(staticBodyBottom, footerHeight > 0 ? footerTop : page.height));

  return {
    headerTop,
    bodyTop,
    bodyBottom,
    footerTop,
  };
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
  fontRegistry: PdfFontRegistry,
  styles: Record<string, EditorNamedStyle> | undefined,
): void {
  const marginLeft = pxToPt(page.margins.left + page.margins.gutter);
  const marginRight = pxToPt(page.margins.right);
  const contentWidth = Math.max(1, page.width - marginLeft - marginRight);
  const context: PdfExportContext = {
    pageNumber: page.pageIndex + 1,
    totalPages,
    measurer,
    fontRegistry,
  };
  const metrics = resolvePdfVerticalMetrics(page, contentWidth, context, styles);

  drawBlockParagraphs(writer, page.pageIndex, page.header, marginLeft, metrics.headerTop, contentWidth, context, styles);
  drawBlockParagraphs(writer, page.pageIndex, page.footer, marginLeft, metrics.footerTop, contentWidth, context, styles);
}

function addSectionPage(writer: OasisPdfWriter, width: number, height: number): number {
  const pageIndex = writer.addPage({ width, height });
  drawPageBackground(writer, pageIndex, width, height);
  return pageIndex;
}

export async function exportEditorDocumentToPdf(document: EditorDocument): Promise<ArrayBuffer> {
  const fontRegistry = new PdfFontRegistry();
  const writer = new OasisPdfWriter(fontRegistry.getPdfFontResources());
  const measurer = new PdfTextMeasurer();
  const sections = getDocumentSections(document);
  const headerFooterPages: PdfHeaderFooterPage[] = [];

  for (const section of sections) {
    const width = Math.max(1, pxToPt(section.pageSettings.width));
    const height = Math.max(1, pxToPt(section.pageSettings.height));
    const marginLeft = pxToPt(section.pageSettings.margins.left + section.pageSettings.margins.gutter);
    const marginRight = pxToPt(section.pageSettings.margins.right);
    const contentWidth = Math.max(1, width - marginLeft - marginRight);
    const initialContext: PdfExportContext = { pageNumber: 1, totalPages: 0, measurer, fontRegistry };
    const initialMetrics = resolvePdfVerticalMetrics(
      {
        height,
        margins: section.pageSettings.margins,
        header: section.header,
        footer: section.footer,
      },
      contentWidth,
      initialContext,
      document.styles,
    );
    const contentBottom = initialMetrics.bodyBottom;
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

    let cursorY = initialMetrics.bodyTop;
    for (const block of section.blocks) {
      if (block.type !== "paragraph") {
        continue;
      }

      const effectiveStyle = resolveEffectiveParagraphStyle(block.style, document.styles);
      const context: PdfExportContext = { pageNumber: pageIndex + 1, totalPages: 0, measurer, fontRegistry };
      const horizontal = resolveParagraphHorizontalMetrics(block, effectiveStyle, marginLeft, contentWidth);
      const layout = layoutPdfParagraph({
        paragraph: block,
        maxWidth: horizontal.width,
        context,
        defaultFontSize: DEFAULT_FONT_SIZE_PT,
        defaultLineHeight: DEFAULT_LINE_HEIGHT_PT,
        pxToPt,
      });
      const prefix = resolveListPrefix(block, listState);

      cursorY += styleLengthToPt(effectiveStyle.spacingBefore);
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
          cursorY = initialMetrics.bodyTop;
        }

        const lineContext: PdfExportContext = { pageNumber: pageIndex + 1, totalPages: 0, measurer, fontRegistry };
        const lineX = resolveParagraphX(effectiveStyle, horizontal.left, horizontal.width, line.width);
        if (lineIndex === 0) {
          drawListPrefix(writer, pageIndex, prefix, lineX, cursorY, lineContext);
        }
        const isLastLine = lineIndex === layout.lines.length - 1;
        drawParagraphLine(
          writer,
          pageIndex,
          effectiveStyle,
          line,
          horizontal.left,
          horizontal.width,
          cursorY,
          lineContext,
          isLastLine,
        );
        cursorY += line.height;
      }
      cursorY += styleLengthToPt(effectiveStyle.spacingAfter);
    }
  }

  if (writer.getPageCount() === 0) {
    const pageIndex = writer.addPage({ width: 612, height: 792 });
    drawPageBackground(writer, pageIndex, 612, 792);
  }

  const totalPages = writer.getPageCount();
  for (const page of headerFooterPages) {
    drawSectionHeaderFooter(writer, page, totalPages, measurer, fontRegistry, document.styles);
  }

  return writer.toArrayBuffer();
}

export async function exportEditorDocumentToPdfBlob(document: EditorDocument): Promise<Blob> {
  const buffer = await exportEditorDocumentToPdf(document);
  return new Blob([buffer], { type: "application/pdf" });
}
