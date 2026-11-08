/**
 * Paragraph move up/down commands.
 *
 * Mirrors WordCraft's `para.moveUp` / `para.moveDown` (Word's
 * Alt+Shift+Up/Down, ⌃⇧↑/↓): the contiguous run of paragraph blocks the
 * selection touches swaps places with the paragraph immediately above or below
 * it, in their own container (the active zone's block stream), keeping their
 * formatting and empty-paragraph structure. The selection follows the moved
 * paragraphs (remapped by paragraph id).
 *
 * Faithful to WordCraft and Word, the operation is refused when:
 * - the run is already at the top (moving up) or bottom (moving down) of the
 *   container,
 * - a table is in the way (the run or its neighbour is a table, or the
 *   selection spans a table),
 * - the active zone is a footnote (note bodies are not reorderable here),
 * - the container has no editable block stream.
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
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { withZoneBlocks } from "./zoneBlocks.js";

/** True when the selection can move paragraphs in the given direction. */
export function canMoveSelectedParagraphs(
  state: EditorState,
  direction: "up" | "down",
): boolean {
  return resolveMove(state, direction) !== null;
}

/**
 * Move the contiguous run of selected paragraphs one step up or down.
 * A no-op (returns the same state) when the move is refused.
 */
export function moveSelectedParagraphs(
  state: EditorState,
  direction: "up" | "down",
): EditorState {
  const move = resolveMove(state, direction);
  if (!move) return state;

  const { nextBlocks } = move;

  const nextState = withZoneBlocks(state, nextBlocks);
  const nextParagraphs = nextBlocks.flatMap(getBlockParagraphs);
  return {
    ...nextState,
    selection: remapSelection(state.selection, nextParagraphs),
  };
}

/** The resolved block layout for a legal move, or null when refused. */
interface ResolvedMove {
  nextBlocks: EditorBlockNode[];
}

function resolveMove(
  state: EditorState,
  direction: "up" | "down",
): ResolvedMove | null {
  const zone = getActiveZone(state);
  if (zone === "footnote") return null;

  const blocks = getEditableBlocksForZone(state, zone);
  if (blocks.length === 0) return null;

  const normalized = normalizeSelection(state);
  const paraToBlock = buildParagraphToBlockMap(blocks);
  const run = resolveRun(
    blocks,
    paraToBlock,
    normalized.startIndex,
    normalized.endIndex,
  );
  if (!run) return null;

  const { lo, hi } = run;
  const moved = blocks.slice(lo, hi + 1);

  let nextBlocks: EditorBlockNode[];
  if (direction === "up") {
    if (lo === 0) return null;
    const neighbour = blocks[lo - 1]!;
    if (neighbour.type !== "paragraph") return null;
    // Move the run above its upper neighbour:
    // [.. before ..] [run] [neighbour] [.. after ..]
    nextBlocks = [
      ...blocks.slice(0, lo - 1),
      ...moved,
      neighbour,
      ...blocks.slice(hi + 1),
    ];
  } else {
    if (hi === blocks.length - 1) return null;
    const neighbour = blocks[hi + 1]!;
    if (neighbour.type !== "paragraph") return null;
    // Move the run below its lower neighbour:
    // [.. before ..] [neighbour] [run] [.. after ..]
    nextBlocks = [
      ...blocks.slice(0, lo),
      neighbour,
      ...moved,
      ...blocks.slice(hi + 2),
    ];
  }

  return { nextBlocks };
}

/** Describes a resolvable contiguous paragraph-block run, or null when refused. */
interface ParagraphRun {
  lo: number;
  hi: number;
}

/**
 * Resolve the block indices [lo..hi] of the contiguous paragraph run the
 * selection covers, or null when the selection cannot be reduced to one clean
 * run of sibling paragraph blocks (a table is in the way, or it spans a table).
 */
function resolveRun(
  blocks: EditorBlockNode[],
  paraToBlock: number[],
  startIndex: number,
  endIndex: number,
): ParagraphRun | null {
  const selected = new Set<number>();
  for (let i = startIndex; i <= endIndex; i += 1) {
    const blockIndex = paraToBlock[i];
    if (blockIndex === undefined) return null;
    selected.add(blockIndex);
  }
  if (selected.size === 0) return null;

  const lo = Math.min(...selected);
  const hi = Math.max(...selected);
  // Every block in between must be a sibling paragraph (no table in the run).
  for (let bi = lo; bi <= hi; bi += 1) {
    if (blocks[bi]!.type !== "paragraph") return null;
  }
  return { lo, hi };
}

/** Map a flattened paragraph index to its owning block index in `blocks`. */
function buildParagraphToBlockMap(blocks: EditorBlockNode[]): number[] {
  const map: number[] = [];
  blocks.forEach((block, blockIndex) => {
    getBlockParagraphs(block).forEach(() => {
      map.push(blockIndex);
    });
  });
  return map;
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
