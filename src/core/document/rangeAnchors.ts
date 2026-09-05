import type { EditorParagraphNode } from "@/core/model.js";
import { getParagraphText } from "@/core/model.js";

interface TextRangeAnchor {
  paragraphId: string;
  offset: number;
  seq?: number;
}

interface TextRangeItem {
  start?: TextRangeAnchor;
  end?: TextRangeAnchor;
}

interface TextRangeRegistry {
  items: Record<string, TextRangeItem>;
  order: string[];
}

interface ParaSpan {
  id: string;
  base: number;
  length: number;
}

interface Stream {
  text: string;
  spans: ParaSpan[];
  baseById: Map<string, number>;
}

function buildStream(paragraphs: EditorParagraphNode[]): Stream {
  const spans: ParaSpan[] = [];
  const baseById = new Map<string, number>();
  const parts: string[] = [];
  let cursor = 0;
  for (const paragraph of paragraphs) {
    const text = getParagraphText(paragraph);
    spans.push({ id: paragraph.id, base: cursor, length: text.length });
    if (!baseById.has(paragraph.id)) {
      baseById.set(paragraph.id, cursor);
    }
    parts.push(text);
    cursor += text.length + 1;
  }
  return { text: parts.join("\n"), spans, baseById };
}

function commonPrefixLength(a: string, b: string, max: number): number {
  let index = 0;
  while (index < max && a.charCodeAt(index) === b.charCodeAt(index)) {
    index += 1;
  }
  return index;
}

function commonSuffixLength(a: string, b: string, max: number): number {
  let index = 0;
  while (
    index < max &&
    a.charCodeAt(a.length - 1 - index) === b.charCodeAt(b.length - 1 - index)
  ) {
    index += 1;
  }
  return index;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function mapGlobalOffset(
  offset: number,
  oldLength: number,
  newLength: number,
  prefix: number,
  suffix: number,
): number {
  if (offset <= prefix) {
    return offset;
  }
  if (offset >= oldLength - suffix) {
    return offset + (newLength - oldLength);
  }
  return prefix;
}

function locate(
  globalOffset: number,
  spans: ParaSpan[],
): { paragraphId: string; offset: number } {
  for (const span of spans) {
    if (globalOffset <= span.base + span.length) {
      return {
        paragraphId: span.id,
        offset: Math.max(0, globalOffset - span.base),
      };
    }
  }
  const last = spans[spans.length - 1]!;
  return { paragraphId: last.id, offset: last.length };
}

/**
 * Remap document-level text ranges across one paragraph edit. The edited zone
 * is linearized with paragraph-break sentinels, so typing, deletion and
 * split/merge operations share one exact mapping path. Registries/items that do
 * not change retain identity for structural sharing.
 */
export function transformTextRangeRegistryAcrossParagraphEdit<
  Registry extends TextRangeRegistry,
>(
  registry: Registry,
  oldParagraphs: EditorParagraphNode[],
  newParagraphs: EditorParagraphNode[],
): Registry {
  const old = buildStream(oldParagraphs);

  let relevant = false;
  for (const id of registry.order) {
    const item = registry.items[id];
    if (!item) continue;
    if (
      (item.start && old.baseById.has(item.start.paragraphId)) ||
      (item.end && old.baseById.has(item.end.paragraphId))
    ) {
      relevant = true;
      break;
    }
  }
  if (!relevant) {
    return registry;
  }

  const next = buildStream(newParagraphs);
  if (old.text === next.text) {
    return registry;
  }

  const oldLength = old.text.length;
  const newLength = next.text.length;
  const limit = Math.min(oldLength, newLength);
  const suffix = commonSuffixLength(old.text, next.text, limit);
  const prefix = commonPrefixLength(old.text, next.text, limit - suffix);

  const remap = <Anchor extends TextRangeAnchor>(anchor: Anchor): Anchor => {
    const base = old.baseById.get(anchor.paragraphId);
    if (base === undefined) {
      return anchor;
    }
    const globalOffset = base + clamp(anchor.offset, 0, oldLength - base);
    const mapped = clamp(
      mapGlobalOffset(globalOffset, oldLength, newLength, prefix, suffix),
      0,
      newLength,
    );
    const located = locate(mapped, next.spans);
    if (
      located.paragraphId === anchor.paragraphId &&
      located.offset === anchor.offset
    ) {
      return anchor;
    }
    return {
      ...anchor,
      paragraphId: located.paragraphId,
      offset: located.offset,
    };
  };

  let changed = false;
  const items = { ...registry.items };
  for (const id of registry.order) {
    const item = registry.items[id];
    if (!item) continue;
    let updated = item;
    if (item.start && old.baseById.has(item.start.paragraphId)) {
      const start = remap(item.start);
      if (start !== item.start) updated = { ...updated, start };
    }
    if (item.end && old.baseById.has(item.end.paragraphId)) {
      const end = remap(item.end);
      if (end !== item.end) updated = { ...updated, end };
    }
    if (updated !== item) {
      items[id] = updated;
      changed = true;
    }
  }

  return (changed ? { ...registry, items } : registry) as Registry;
}
