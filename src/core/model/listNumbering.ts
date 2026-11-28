import type { EditorNamedStyle } from "./types/styles.js";
import type { EditorDocument } from "./types/document.js";
import type { EditorBlockNode, EditorParagraphNode } from "./types/nodes.js";
import type { EditorParagraphListStyle } from "./types/primitives.js";
import { getDocumentParagraphs } from "./documentIndex.js";
import { assertNever } from "../assertNever.js";
import { formatNumberValue } from "@/core/format/numberFormat.js";
import { resolveNumberingLocale } from "@/core/format/resolveNumberingLocale.js";
import { getEditorListOoxmlNumberingMetadata } from "@/ooxml/word/numberingMetadata.js";

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

function normalizeBulletGlyph(glyph: string): string {
  const code = glyph.codePointAt(0);
  return code !== undefined && code >= 0xe000 && code <= 0xf8ff
    ? (PUA_BULLET_MAP[code] ?? "•")
    : glyph;
}

interface ListCounterState {
  counters: number[];
  /** Levels already counted in this instance; distinguishes "first" from 0. */
  initialized: Set<number>;
  /** First `startAt` seen per level, reused on restart. */
  startValues: Map<number, number>;
  formats: Array<EditorParagraphListStyle["format"]>;
  /** `w:lvlRestart/@w:val` per level; zero means never restart. */
  restartAfter: Map<number, number>;
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

function resolveStyleList(
  styleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
  seen: Set<string> = new Set(),
): EditorParagraphListStyle | undefined {
  if (!styleId || !styles || seen.has(styleId)) return undefined;
  seen.add(styleId);
  const style =
    styles[styleId] ??
    Object.values(styles).find((candidate) => candidate.id === styleId);
  if (!style) return undefined;
  return (
    style.paragraphStyle?.list ?? resolveStyleList(style.basedOn, styles, seen)
  );
}

/** Direct `w:numPr` wins; a paragraph style may supply the list instead. */
export function resolveParagraphList(
  paragraph: EditorParagraphNode,
  styles?: Record<string, EditorNamedStyle>,
): EditorParagraphListStyle | undefined {
  return paragraph.list ?? resolveStyleList(paragraph.style?.styleId, styles);
}

export function buildListLabels(
  document: EditorDocument,
  locale?: string,
): Map<string, string> {
  const labels = new Map<string, string>();
  const states = new Map<string, ListCounterState>();
  const effectiveLocale = locale ?? resolveNumberingLocale(document);

  for (const paragraph of collectNumberingParagraphs(document)) {
    const list = resolveParagraphList(paragraph, document.styles);
    if (!list) continue;
    const level = Math.max(0, list.level ?? 0);
    if (list.kind === "bullet") {
      // A picture bullet is drawn as an image, not as a text glyph.
      labels.set(
        paragraph.id,
        list.bulletPicture
          ? ""
          : list.bulletGlyph
            ? normalizeBulletGlyph(list.bulletGlyph)
            : BULLET_GLYPHS[level % BULLET_GLYPHS.length]!,
      );
      continue;
    }

    // Lists created by the editor retain the historical document-wide counters.
    const key = list.instanceId ? `instance:${list.instanceId}` : "legacy";
    const state = states.get(key) ?? {
      counters: [],
      initialized: new Set<number>(),
      startValues: new Map<number, number>(),
      formats: [],
      restartAfter: new Map<number, number>(),
    };
    states.set(key, state);
    const metadata = getEditorListOoxmlNumberingMetadata(list);
    if (metadata?.restartAfterLevel !== undefined) {
      state.restartAfter.set(level, metadata.restartAfterLevel);
    }
    // Unseen parent levels start at 1, matching Word when a list begins at a
    // deeper level; they are not "zero" counters waiting to be incremented.
    while (state.counters.length <= level) state.counters.push(1);

    // Deeper counters are deliberately kept alive (not truncated) so a
    // restart can reset them when their trigger level is encountered again.

    // A level configured to restart after this one resets its counter (and all
    // deeper counters) before this paragraph is counted. `w:val="0"` means
    // never restart.
    for (const [configuredLevel, afterLevel] of state.restartAfter) {
      if (
        afterLevel > 0 &&
        afterLevel === level + 1 &&
        configuredLevel > level
      ) {
        for (
          let index = configuredLevel;
          index < state.counters.length;
          index += 1
        ) {
          state.counters[index] = state.startValues.get(index) ?? 1;
          state.initialized.delete(index);
        }
      }
    }

    if (list.levelFormats) {
      list.levelFormats.forEach((format, index): void => {
        state.formats[index] = format;
      });
    }
    // An explicit edit of this level's format wins; an imported format for a
    // referenced level is otherwise preserved instead of being replaced by a
    // default when the paragraph itself has no `format`.
    state.formats[level] =
      list.format ??
      state.formats[level] ??
      ORDERED_DEFAULT_FORMATS[level % ORDERED_DEFAULT_FORMATS.length];
    state.counters[level] =
      typeof list.startAt === "number"
        ? list.startAt
        : state.initialized.has(level)
          ? state.counters[level]! + 1
          : 1;
    state.initialized.add(level);
    if (typeof list.startAt === "number")
      state.startValues.set(level, list.startAt);

    const pattern = list.levelText ?? `%${level + 1}.`;
    labels.set(
      paragraph.id,
      pattern.replace(/%([1-9])/g, (token, rawLevel: string): string => {
        const referencedLevel = Number(rawLevel) - 1;
        const value = state.counters[referencedLevel];
        if (value === undefined) return token;
        const format = list.legal
          ? "decimal"
          : (state.formats[referencedLevel] ?? "decimal");
        return formatNumberValue(value, format, effectiveLocale);
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
