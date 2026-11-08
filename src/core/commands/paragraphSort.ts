/**
 * Paragraph sort command.
 *
 * Mirrors WordCraft's `para.sort` (Word's "Sort" in Home > Paragraph): the
 * contiguous run of paragraph blocks the selection touches is reordered by its
 * text, ascending or descending. Faithful to WordCraft, the sort is *natural*:
 * a paragraph that starts with a number is keyed by that number first (numerically),
 * so "Item 2" sorts before "Item 10"; the rest follow in collation order; a total
 * order is always produced. The selection is preserved (remapped by paragraph id).
 *
 * Faithful to WordCraft and Word, the operation is refused when:
 * - the selection cannot be reduced to one clean run of sibling paragraph blocks
 *   (a table is in the way, or it spans a table),
 * - the active zone is a footnote (note bodies are not reorderable here),
 * - the container has no editable block stream.
 *
 * A run of fewer than two paragraphs is a no-op (returns the same state).
 */
import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorPosition,
  EditorSelection,
  EditorState,
} from "@/core/model.js";
import {
  getActiveZone,
  getBlockParagraphs,
  getEditableBlocksForZone,
  getParagraphLength,
  getParagraphText,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { withZoneBlocks } from "./zoneBlocks.js";

/**
 * Sort the contiguous run of selected paragraphs by their text.
 * A no-op (returns the same state) when the sort is refused, or when the run
 * has fewer than two paragraphs (nothing to reorder).
 */
export function sortSelectedParagraphs(
  state: EditorState,
  descending: boolean,
): EditorState {
  const run = resolveRun(state);
  if (!run) return state;
  if (run.hi - run.lo < 1) return state;

  const { lo, hi, blocks } = run;
  const slice = blocks.slice(lo, hi + 1);

  // Every block in the run is a paragraph (resolveRun guarantees this).
  const paragraphs = slice as EditorParagraphNode[];

  // Stable sort by the natural key, reversing the order for descending.
  const keyed = paragraphs.map((block, index) => ({
    block,
    index,
    key: naturalSortKey(getParagraphText(block)),
  }));
  keyed.sort((a, b) => {
    const primary = compareNaturalKeys(a.key, b.key);
    if (primary !== 0) {
      return descending ? -primary : primary;
    }
    // Preserve original relative order for equal keys (stable).
    return a.index - b.index;
  });

  const nextBlocks = [
    ...blocks.slice(0, lo),
    ...keyed.map((k) => k.block),
    ...blocks.slice(hi + 1),
  ];

  const nextState = withZoneBlocks(state, nextBlocks);
  const nextParagraphs = nextBlocks.flatMap(getBlockParagraphs);
  return {
    ...nextState,
    selection: remapSelection(state.selection, nextParagraphs),
  };
}

/** The resolved paragraph run to sort, or null when refused. */
interface SortRun {
  blocks: EditorBlockNode[];
  lo: number;
  hi: number;
}

function resolveRun(state: EditorState): SortRun | null {
  const zone = getActiveZone(state);
  if (zone === "footnote") return null;

  const blocks = getEditableBlocksForZone(state, zone);
  if (blocks.length === 0) return null;

  const normalized = normalizeSelection(state);
  const selected = new Set<number>();
  for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
    // Map each selected paragraph to its owning block index.
    let flat = 0;
    let blockIndex = -1;
    for (let bi = 0; bi < blocks.length; bi += 1) {
      const count = getBlockParagraphs(blocks[bi]!).length;
      if (i < flat + count) {
        blockIndex = bi;
        break;
      }
      flat += count;
    }
    if (blockIndex < 0) return null;
    selected.add(blockIndex);
  }
  if (selected.size === 0) return null;

  const lo = Math.min(...selected);
  const hi = Math.max(...selected);
  // Every block in between must be a sibling paragraph (no table in the run).
  for (let bi = lo; bi <= hi; bi += 1) {
    if (blocks[bi]!.type !== "paragraph") return null;
  }
  return { blocks, lo, hi };
}

/** A paragraph's natural sort key: an optional leading number, then its text. */
interface NaturalKey {
  num?: number;
  text: string;
}

function naturalSortKey(text: string): NaturalKey {
  const trimmed = text.trim();
  const leading = /^(\d+(?:\.\d+)?)/.exec(trimmed)?.[1];
  return {
    num: leading === undefined ? undefined : Number(leading),
    text,
  };
}

/** Compare two natural keys: number first (numerically), then text. */
function compareNaturalKeys(a: NaturalKey, b: NaturalKey): number {
  const numCompare = compareOptionalNumbers(a.num, b.num);
  if (numCompare !== 0) return numCompare;
  return a.text.localeCompare(b.text, undefined, { sensitivity: "base" });
}

function compareOptionalNumbers(
  a: number | undefined,
  b: number | undefined,
): number {
  if (a !== undefined && b !== undefined) {
    return a === b ? 0 : a < b ? -1 : 1;
  }
  if (a !== undefined) return -1;
  if (b !== undefined) return 1;
  return 0;
}

/** Rebuild a selection over a (possibly reordered) paragraph stream by id. */
function remapSelection(
  selection: EditorSelection,
  paragraphs: EditorParagraphNode[],
): EditorSelection {
  const byId = new Map(paragraphs.map((p, i) => [p.id, i] as const));
  const remapPosition = (pos: EditorPosition): EditorPosition => {
    const index = byId.get(pos.paragraphId);
    if (index === undefined) return pos;
    const paragraph = paragraphs[index]!;
    return paragraphOffsetToPosition(
      paragraph,
      Math.min(pos.offset, getParagraphLength(paragraph)),
    );
  };
  return {
    anchor: remapPosition(selection.anchor),
    focus: remapPosition(selection.focus),
  };
}
