import type {
  EditorDocument,
  EditorParagraphListStyle,
  EditorParagraphNode,
} from "../../core/model.js";
import { getDocumentParagraphs } from "../../core/model.js";

const listOrdinalsCache = new WeakMap<EditorDocument, Map<string, number>>();

function getListOrdinals(document: EditorDocument): Map<string, number> {
  const cached = listOrdinalsCache.get(document);
  if (cached) return cached;

  const result = new Map<string, number>();
  const paragraphs = getDocumentParagraphs(document);
  // The exporter emits one numbering definition per `kind:level` shared across
  // the whole document (with `w:start="1"`), so Word counts each level
  // continuously regardless of intervening non-list paragraphs. Match that here
  // by keeping per-level counters that persist across gaps instead of resetting.
  const counters = new Map<number, number>();

  for (const paragraph of paragraphs) {
    const list = paragraph.list;
    if (!list || list.kind !== "ordered") {
      continue;
    }

    const level = list.level ?? 0;
    const next = (counters.get(level) ?? 0) + 1;
    counters.set(level, next);
    result.set(paragraph.id, next);
  }

  listOrdinalsCache.set(document, result);
  return result;
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

function toAlpha(value: number): string {
  if (value <= 0) return String(value);
  let n = value;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function toRoman(value: number): string {
  if (value <= 0 || value >= 4000) return String(value);
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
  let n = value;
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

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

export function resolveListPrefix(
  paragraph: EditorParagraphNode,
  document: EditorDocument,
): string {
  if (!paragraph.list) return "";
  const level = paragraph.list.level ?? 0;
  if (paragraph.list.kind === "bullet") {
    return BULLET_GLYPHS[level % BULLET_GLYPHS.length] ?? "•";
  }

  const ordinal =
    getListOrdinals(document).get(paragraph.id) ?? paragraph.list.startAt ?? 1;
  const format =
    paragraph.list.format && paragraph.list.format !== "bullet"
      ? paragraph.list.format
      : (ORDERED_DEFAULT_FORMATS[level % ORDERED_DEFAULT_FORMATS.length] ??
        "decimal");
  return `${formatOrdinal(ordinal, format)}.`;
}
