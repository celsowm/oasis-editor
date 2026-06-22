import type { EditorDocument } from "./types/document.js";
import type { EditorBlockNode, EditorParagraphNode } from "./types/nodes.js";
import type { EditorParagraphListStyle } from "./types/primitives.js";
import { getDocumentParagraphs } from "./documentIndex.js";
import { assertNever } from "../assertNever.js";

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

const PUA_BULLET_MAP: Record<number, string> = {
  0xf0b7: "•",
  0xf06c: "·",
  0xf0a7: "▪",
  0xf0d8: "➢",
  0xf077: "✓",
  0xf0fc: "✓",
  0xf0e7: "⚡",
  0xf020: " ",
};

function toAlpha(value: number): string {
  if (value <= 0) return String(value);
  let remaining = value;
  let output = "";
  while (remaining > 0) {
    output = String.fromCharCode(65 + ((remaining - 1) % 26)) + output;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return output;
}

function toRoman(value: number): string {
  if (value <= 0 || value >= 4000) return String(value);
  const numerals: Array<[number, string]> = [
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
  for (const [amount, text] of numerals) {
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
    default:
      return String(value);
  }
}

function normalizeBulletGlyph(glyph: string): string {
  const code = glyph.codePointAt(0);
  return code !== undefined && code >= 0xe000 && code <= 0xf8ff
    ? (PUA_BULLET_MAP[code] ?? "•")
    : glyph;
}

interface ListCounterState {
  counters: number[];
  formats: Array<EditorParagraphListStyle["format"]>;
}

function collectNumberingParagraphs(
  document: EditorDocument,
): EditorParagraphNode[] {
  const result: EditorParagraphNode[] = [];
  const collectTextBoxes = (paragraph: EditorParagraphNode): void => {
    for (const run of paragraph.runs) {
      if (run.kind === "textBox") collectBlocks(run.textBox.blocks);
    }
  };
  const collectBlocks = (blocks: EditorBlockNode[]): void => {
    for (const block of blocks) {
      switch (block.type) {
        case "paragraph":
          result.push(block);
          collectTextBoxes(block);
          break;
        case "table":
          for (const row of block.rows) {
            for (const cell of row.cells) collectBlocks(cell.blocks);
          }
          break;
        default:
          assertNever(block, "block");
      }
    }
  };
  for (const paragraph of getDocumentParagraphs(document)) {
    result.push(paragraph);
    collectTextBoxes(paragraph);
  }
  return result;
}

export function buildListLabels(document: EditorDocument): Map<string, string> {
  const labels = new Map<string, string>();
  const states = new Map<string, ListCounterState>();

  for (const paragraph of collectNumberingParagraphs(document)) {
    const list = paragraph.list;
    if (!list) continue;
    const level = Math.max(0, list.level ?? 0);
    if (list.kind === "bullet") {
      labels.set(
        paragraph.id,
        list.bulletGlyph
          ? normalizeBulletGlyph(list.bulletGlyph)
          : BULLET_GLYPHS[level % BULLET_GLYPHS.length]!,
      );
      continue;
    }

    // Lists created by the editor retain the historical document-wide counters.
    const key = list.instanceId ? `instance:${list.instanceId}` : "legacy";
    const state = states.get(key) ?? { counters: [], formats: [] };
    states.set(key, state);
    while (state.counters.length <= level) state.counters.push(0);
    state.counters.length = level + 1;
    if (list.levelFormats) {
      list.levelFormats.forEach((format, index) => {
        state.formats[index] = format;
      });
    }
    state.formats[level] =
      list.format ??
      ORDERED_DEFAULT_FORMATS[level % ORDERED_DEFAULT_FORMATS.length];
    state.counters[level] =
      typeof list.startAt === "number"
        ? list.startAt
        : state.counters[level] === 0
          ? 1
          : state.counters[level]! + 1;

    const pattern = list.levelText ?? `%${level + 1}.`;
    labels.set(
      paragraph.id,
      pattern.replace(/%([1-9])/g, (token, rawLevel: string) => {
        const referencedLevel = Number(rawLevel) - 1;
        const value = state.counters[referencedLevel];
        if (value === undefined) return token;
        const format = list.legal
          ? "decimal"
          : (state.formats[referencedLevel] ?? "decimal");
        return formatOrdinal(value, format);
      }),
    );
  }
  return labels;
}

export function resolveListLabel(
  paragraph: EditorParagraphNode,
  labels: Map<string, string>,
): string {
  return labels.get(paragraph.id) ?? "";
}
