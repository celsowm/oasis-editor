import type {
  EditorDocument,
  EditorLayoutBlock,
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorTextStyle,
} from "../../core/model.js";
import {
  EFFECTIVE_TEXT_STYLE_DEFAULTS,
  getDocumentParagraphs,
  getPageBodyTop,
  getPageHeaderZoneTop,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../../core/model.js";
import { projectDocumentLayout } from "../../ui/layoutProjection.js";
import { PdfFontRegistry } from "./fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "./OasisPdfWriter.js";

const PX_TO_PT = 72 / 96;
const DEFAULT_FONT_SIZE_PX = 15;
const LIST_PREFIX_OFFSET_PX = 24;

const BULLET_GLYPHS = ["•", "○", "▪", "•", "○", "▪"];
const ORDERED_DEFAULT_FORMATS: NonNullable<EditorParagraphListStyle["format"]>[] = [
  "decimal",
  "lowerLetter",
  "lowerRoman",
  "decimal",
  "lowerLetter",
  "lowerRoman",
];

function pxToPt(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value * PX_TO_PT;
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

function textStyleToFontSizePt(style: Required<EditorTextStyle>): number {
  return pxToPt(style.fontSize ?? DEFAULT_FONT_SIZE_PX);
}

function resolveFragmentSlots(
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
): Array<{ char: string; left: number; offset: number }> {
  const slotByOffset = new Map(line.slots.map((slot) => [slot.offset, slot] as const));
  const result: Array<{ char: string; left: number; offset: number }> = [];
  for (const char of fragment.chars) {
    if (char.char === "\n" || char.char === "\t") {
      continue;
    }
    const slot = slotByOffset.get(char.paragraphOffset);
    if (!slot) {
      continue;
    }
    result.push({
      char: char.char,
      left: slot.left,
      offset: char.paragraphOffset,
    });
  }
  return result;
}

function resolveFragmentBounds(
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  fontSizePx: number,
): { left: number; right: number } | null {
  const slots = resolveFragmentSlots(line, fragment);
  if (slots.length === 0) {
    return null;
  }

  const slotByOffset = new Map(line.slots.map((slot) => [slot.offset, slot] as const));
  const first = slots[0]!;
  const last = slots[slots.length - 1]!;
  const nextSlot = slotByOffset.get(last.offset + 1);
  return {
    left: first.left,
    right: nextSlot?.left ?? last.left + fontSizePx * 0.55,
  };
}

function drawFragmentHighlight(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
): void {
  if (!styles.highlight) {
    return;
  }
  const bounds = resolveFragmentBounds(line, fragment, styles.fontSize ?? DEFAULT_FONT_SIZE_PX);
  if (!bounds) {
    return;
  }
  writer.drawRect(pageIndex, {
    x: pxToPt(originX + bounds.left),
    y: pxToPt(originY + line.top + 2),
    width: pxToPt(Math.max(0, bounds.right - bounds.left)),
    height: pxToPt(Math.max(2, line.height - 4)),
    fill: styles.highlight,
  });
}

function drawFragmentDecoration(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
  kind: "underline" | "strike",
): void {
  const bounds = resolveFragmentBounds(line, fragment, styles.fontSize ?? DEFAULT_FONT_SIZE_PX);
  if (!bounds) {
    return;
  }
  const y = kind === "underline"
    ? originY + line.top + line.height - 2
    : originY + line.top + line.height * 0.52;
  writer.drawLine(pageIndex, {
    x1: pxToPt(originX + bounds.left),
    y1: pxToPt(y),
    x2: pxToPt(originX + bounds.right),
    y2: pxToPt(y),
    stroke: styles.color ?? "#000000",
    lineWidth: pxToPt(1),
  });
}

function drawFragmentText(
  writer: OasisPdfWriter,
  pageIndex: number,
  paragraph: EditorParagraphNode,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  document: EditorDocument,
  originX: number,
  originY: number,
  fontRegistry: PdfFontRegistry,
): void {
  if (fragment.image) {
    return;
  }

  const styles = resolveEffectiveTextStyleForParagraph(
    fragment.styles,
    paragraph.style?.styleId,
    document.styles,
  );
  const fontFace = fontRegistry.resolveFontFace({
    fontFamily: styles.fontFamily,
    bold: styles.bold,
    italic: styles.italic,
  });
  const fontSizePt = textStyleToFontSizePt(styles);
  const baselineY = originY + line.top + line.height * 0.8;
  const chars = resolveFragmentSlots(line, fragment);
  const text = chars.map((char) => char.char).join("");
  const firstChar = chars[0];
  if (!firstChar || text.length === 0) {
    return;
  }

  drawFragmentHighlight(writer, pageIndex, line, fragment, originX, originY, styles);
  writer.drawText(pageIndex, {
    x: pxToPt(originX + firstChar.left),
    y: pxToPt(baselineY),
    text,
    fontSize: fontSizePt,
    color: styles.color ?? "#000000",
    bold: styles.bold,
    italic: styles.italic,
    fontResourceName: fontFace.writerResourceName,
  });
  if (styles.underline) {
    drawFragmentDecoration(writer, pageIndex, line, fragment, originX, originY, styles, "underline");
  }
  if (styles.strike) {
    drawFragmentDecoration(writer, pageIndex, line, fragment, originX, originY, styles, "strike");
  }
}

function toAlpha(value: number): string {
  if (value <= 0) {
    return String(value);
  }
  let remaining = value;
  let output = "";
  while (remaining > 0) {
    const rem = (remaining - 1) % 26;
    output = String.fromCharCode(65 + rem) + output;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return output;
}

function toRoman(value: number): string {
  if (value <= 0 || value >= 4000) {
    return String(value);
  }
  const map: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let remaining = value;
  let output = "";
  for (const [amount, text] of map) {
    while (remaining >= amount) {
      output += text;
      remaining -= amount;
    }
  }
  return output;
}

function formatOrdinal(value: number, format: EditorParagraphListStyle["format"]): string {
  switch (format) {
    case "lowerLetter":
      return toAlpha(value).toLowerCase();
    case "upperLetter":
      return toAlpha(value).toUpperCase();
    case "lowerRoman":
      return toRoman(value).toLowerCase();
    case "upperRoman":
      return toRoman(value).toUpperCase();
    case "decimal":
    default:
      return String(value);
  }
}

function getListOrdinals(document: EditorDocument): Map<string, number> {
  const result = new Map<string, number>();
  const paragraphs = getDocumentParagraphs(document);
  let counters: number[] = [];
  let previousWasOrdered = false;

  for (const paragraph of paragraphs) {
    const list = paragraph.list;
    if (!list || list.kind !== "ordered") {
      counters = [];
      previousWasOrdered = false;
      continue;
    }

    const level = list.level ?? 0;
    if (!previousWasOrdered) {
      counters = [];
    }
    if (counters.length > level + 1) {
      counters.length = level + 1;
    }
    while (counters.length <= level) {
      counters.push(0);
    }
    counters[level] = counters[level] === 0 && typeof list.startAt === "number"
      ? list.startAt
      : counters[level]! + 1;
    result.set(paragraph.id, counters[level]!);
    previousWasOrdered = true;
  }

  return result;
}

function collectPdfFontFamilies(document: EditorDocument): Set<string | null | undefined> {
  const families = new Set<string | null | undefined>([EFFECTIVE_TEXT_STYLE_DEFAULTS.fontFamily]);
  for (const paragraph of getDocumentParagraphs(document)) {
    families.add(resolveEffectiveTextStyleForParagraph(undefined, paragraph.style?.styleId, document.styles).fontFamily);
    for (const run of paragraph.runs) {
      families.add(run.styles?.fontFamily);
    }
  }
  return families;
}

function resolveListPrefix(
  paragraph: EditorParagraphNode,
  listOrdinals: Map<string, number>,
): string {
  if (!paragraph.list) {
    return "";
  }
  const level = Math.max(0, paragraph.list.level ?? 0);
  if (paragraph.list.kind === "bullet") {
    return BULLET_GLYPHS[level % BULLET_GLYPHS.length]!;
  }
  const value = listOrdinals.get(paragraph.id) ?? paragraph.list.startAt ?? 1;
  const format =
    paragraph.list.format && paragraph.list.format !== "bullet"
      ? paragraph.list.format
      : ORDERED_DEFAULT_FORMATS[level % ORDERED_DEFAULT_FORMATS.length];
  return `${formatOrdinal(value, format)}.`;
}

function drawListPrefix(
  writer: OasisPdfWriter,
  pageIndex: number,
  paragraph: EditorParagraphNode,
  line: EditorLayoutLine,
  document: EditorDocument,
  originX: number,
  originY: number,
  fontRegistry: PdfFontRegistry,
  listOrdinals: Map<string, number>,
): void {
  if (line.index !== 0) {
    return;
  }
  const prefix = resolveListPrefix(paragraph, listOrdinals);
  if (!prefix) {
    return;
  }
  const firstSlot = line.slots[0];
  if (!firstSlot) {
    return;
  }
  const styles = resolveEffectiveTextStyleForParagraph(undefined, paragraph.style?.styleId, document.styles);
  const fontFace = fontRegistry.resolveFontFace({
    fontFamily: styles.fontFamily,
    bold: styles.bold,
    italic: styles.italic,
  });
  writer.drawText(pageIndex, {
    x: pxToPt(originX + Math.max(0, firstSlot.left - LIST_PREFIX_OFFSET_PX)),
    y: pxToPt(originY + line.top + line.height * 0.8),
    text: prefix,
    fontSize: textStyleToFontSizePt(styles),
    color: styles.color ?? "#000000",
    bold: styles.bold,
    italic: styles.italic,
    fontResourceName: fontFace.writerResourceName,
  });
}

function drawParagraph(
  writer: OasisPdfWriter,
  pageIndex: number,
  paragraph: EditorParagraphNode,
  lines: EditorLayoutLine[],
  document: EditorDocument,
  originX: number,
  originY: number,
  fontRegistry: PdfFontRegistry,
  listOrdinals: Map<string, number>,
): void {
  for (const line of lines) {
    drawListPrefix(writer, pageIndex, paragraph, line, document, originX, originY, fontRegistry, listOrdinals);
    for (const fragment of line.fragments) {
      drawFragmentText(writer, pageIndex, paragraph, line, fragment, document, originX, originY, fontRegistry);
    }
  }
}

function drawBlockList(
  writer: OasisPdfWriter,
  pageIndex: number,
  blocks: EditorLayoutBlock[] | undefined,
  document: EditorDocument,
  originX: number,
  originY: number,
  fontRegistry: PdfFontRegistry,
  listOrdinals: Map<string, number>,
): void {
  if (!blocks || blocks.length === 0) {
    return;
  }

  let cursorY = originY;
  for (const block of blocks) {
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      const paragraphStyle = resolveEffectiveParagraphStyle(block.sourceBlock.style, document.styles);
      const spacingBefore =
        block.layout.startOffset === 0 && cursorY > originY ? paragraphStyle.spacingBefore ?? 0 : 0;
      drawParagraph(
        writer,
        pageIndex,
        block.sourceBlock,
        block.layout.lines,
        document,
        originX,
        cursorY + spacingBefore,
        fontRegistry,
        listOrdinals,
      );
    }
    cursorY += Math.max(0, block.estimatedHeight);
  }
}

export async function exportEditorDocumentToPdf(document: EditorDocument): Promise<ArrayBuffer> {
  const fontRegistry = new PdfFontRegistry();
  await fontRegistry.loadBundledUnicodeFaces({ families: collectPdfFontFamilies(document) });
  const writer = new OasisPdfWriter(fontRegistry.getPdfFontResources());
  const layout = projectDocumentLayout(document, undefined, undefined, undefined, { layoutMode: "wordParity" });
  const listOrdinals = getListOrdinals(document);

  for (const page of layout.pages) {
    const width = Math.max(1, pxToPt(page.pageSettings.width));
    const height = Math.max(1, pxToPt(page.pageSettings.height));
    const pageIndex = writer.addPage({ width, height });
    drawPageBackground(writer, pageIndex, width, height);

    const originX = page.pageSettings.margins.left + page.pageSettings.margins.gutter;
    drawBlockList(
      writer,
      pageIndex,
      page.headerBlocks,
      document,
      originX,
      page.headerTop ?? getPageHeaderZoneTop(page.pageSettings),
      fontRegistry,
      listOrdinals,
    );
    drawBlockList(
      writer,
      pageIndex,
      page.blocks,
      document,
      originX,
      page.bodyTop ?? getPageBodyTop(page.pageSettings),
      fontRegistry,
      listOrdinals,
    );
    drawBlockList(
      writer,
      pageIndex,
      page.footerBlocks,
      document,
      originX,
      page.footerTop ?? page.bodyBottom ?? page.pageSettings.height,
      fontRegistry,
      listOrdinals,
    );
  }

  if (writer.getPageCount() === 0) {
    const pageIndex = writer.addPage({ width: 612, height: 792 });
    drawPageBackground(writer, pageIndex, 612, 792);
  }

  return writer.toArrayBuffer();
}

export async function exportEditorDocumentToPdfBlob(document: EditorDocument): Promise<Blob> {
  const buffer = await exportEditorDocumentToPdf(document);
  return new Blob([buffer], { type: "application/pdf" });
}
