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
  // The exporter emits one numbering definition per `kind:level:glyph` shared
  // across the whole document, so Word counts each level continuously regardless
  // of intervening non-list paragraphs. Match that here by keeping per-level
  // counters that persist across gaps instead of resetting.
  //
  // `startAt` is only set on the first paragraph of each numId+ilvl group
  // (enforced by the importer's seenInstances tracking), so it acts as a
  // one-shot seed without resetting subsequent paragraphs' counters.
  const counters = new Map<number, number>();

  for (const paragraph of paragraphs) {
    const list = paragraph.list;
    if (!list || list.kind !== "ordered") {
      continue;
    }

    const level = list.level ?? 0;
    const prev = counters.get(level);
    const next = prev !== undefined ? prev + 1 : (list.startAt ?? 1);
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

// Common Symbol/Wingdings Private-Use-Area code points → nearest Unicode char.
// Word stores bullet glyphs in the range 0xF000–0xF0FF when using legacy
// symbol fonts; these are not standard Unicode and need mapping for display.
const PUA_BULLET_MAP: Record<number, string> = {
  0xf0b7: "•", // Symbol: filled circle bullet
  0xf06c: "·", // Wingdings: medium bullet
  0xf0a7: "▪", // Wingdings 2: black small square
  0xf0d8: "➢", // Wingdings: arrowhead
  0xf077: "✓", // Wingdings: check mark
  0xf0fc: "✓", // Wingdings: check mark (alt)
  0xf0e7: "⚡", // Wingdings: lightning
  0xf020: " ", // Symbol/Wingdings: space
};

function normalizeBulletGlyph(glyph: string): string {
  const code = glyph.codePointAt(0);
  if (code !== undefined && code >= 0xe000 && code <= 0xf8ff) {
    return PUA_BULLET_MAP[code] ?? "•";
  }
  return glyph;
}

const BULLET_GLYPHS = ["•", "○", "▪", "•", "○", "▪"];
const ORDERED_DEFAULT_FORMATS: NonNullable<EditorParagraphListStyle["format"]>[] = [
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
    const raw = paragraph.list.bulletGlyph;
    if (raw) return normalizeBulletGlyph(raw);
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
