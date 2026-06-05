import type {
  EditorDocument,
  EditorLayoutLine,
  EditorParagraphListStyle,
  EditorParagraphNode,
} from "../../../core/model.js";
import {
  getDocumentParagraphs,
  resolveEffectiveTextStyleForParagraph,
} from "../../../core/model.js";
import { PdfFontRegistry } from "../fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "../OasisPdfWriter.js";
import { pxToPt, textStyleToFontSizePt } from "../units.js";

const LIST_PREFIX_OFFSET_PX = 24;

const BULLET_GLYPHS = ["•", "○", "▪", "•", "○", "▪"];
const ORDERED_DEFAULT_FORMATS: NonNullable<
  EditorParagraphListStyle["format"]
>[] = [
  "decimal",
  "lowerLetter",
  "lowerRoman",
  "decimal",
  "lowerLetter",
  "lowerRoman",
];

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
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
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

function formatOrdinal(
  value: number,
  format: EditorParagraphListStyle["format"],
): string {
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

export function getListOrdinals(document: EditorDocument): Map<string, number> {
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
    counters[level] =
      counters[level] === 0 && typeof list.startAt === "number"
        ? list.startAt
        : counters[level]! + 1;
    result.set(paragraph.id, counters[level]!);
    previousWasOrdered = true;
  }

  return result;
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

export function drawListPrefix(
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
  const styles = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraph.style?.styleId,
    document.styles,
  );
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
