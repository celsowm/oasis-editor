import type { Editor2Block, Editor2Position, Editor2Selection, Editor2State } from "./model.js";

export interface NormalizedEditor2Selection {
  start: Editor2Position;
  end: Editor2Position;
  startIndex: number;
  endIndex: number;
  isCollapsed: boolean;
}

export function findBlockIndex(blocks: Editor2Block[], blockId: string): number {
  const index = blocks.findIndex((block) => block.id === blockId);
  return index === -1 ? 0 : index;
}

export function clampOffset(offset: number, text: string): number {
  return Math.max(0, Math.min(offset, text.length));
}

export function clampPosition(state: Editor2State, position: Editor2Position): Editor2Position {
  const index = findBlockIndex(state.blocks, position.blockId);
  const block = state.blocks[index];
  return {
    blockId: block.id,
    offset: clampOffset(position.offset, block.text),
  };
}

export function comparePositions(
  blocks: Editor2Block[],
  left: Editor2Position,
  right: Editor2Position,
): number {
  const leftIndex = findBlockIndex(blocks, left.blockId);
  const rightIndex = findBlockIndex(blocks, right.blockId);

  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  return left.offset - right.offset;
}

export function createCollapsedSelection(position: Editor2Position): Editor2Selection {
  return {
    anchor: position,
    focus: position,
  };
}

export function isSelectionCollapsed(selection: Editor2Selection): boolean {
  return (
    selection.anchor.blockId === selection.focus.blockId &&
    selection.anchor.offset === selection.focus.offset
  );
}

export function normalizeSelection(state: Editor2State): NormalizedEditor2Selection {
  const anchor = clampPosition(state, state.selection.anchor);
  const focus = clampPosition(state, state.selection.focus);
  const anchorIndex = findBlockIndex(state.blocks, anchor.blockId);
  const focusIndex = findBlockIndex(state.blocks, focus.blockId);
  const comparison = comparePositions(state.blocks, anchor, focus);
  const start = comparison <= 0 ? anchor : focus;
  const end = comparison <= 0 ? focus : anchor;

  return {
    start,
    end,
    startIndex: comparison <= 0 ? anchorIndex : focusIndex,
    endIndex: comparison <= 0 ? focusIndex : anchorIndex,
    isCollapsed: comparison === 0,
  };
}
