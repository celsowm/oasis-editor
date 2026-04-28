import type { Editor2Block, Editor2Position, Editor2Selection, Editor2State } from "./model.js";
import { createEditor2Block } from "./editorState.js";
import {
  clampOffset,
  clampPosition,
  createCollapsedSelection,
  findBlockIndex,
  isSelectionCollapsed,
  normalizeSelection,
} from "./selection.js";

function cloneBlocks(blocks: Editor2Block[]): Editor2Block[] {
  return blocks.map((block) => ({ ...block }));
}

function withSelection(position: Editor2Position): Editor2Selection {
  return createCollapsedSelection(position);
}

function getFocusBlock(state: Editor2State): { block: Editor2Block; index: number; offset: number } {
  const focus = clampPosition(state, state.selection.focus);
  const index = findBlockIndex(state.blocks, focus.blockId);
  const block = state.blocks[index];
  return { block, index, offset: clampOffset(focus.offset, block.text) };
}

function collapseToBoundary(state: Editor2State, direction: "start" | "end"): Editor2State {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  return {
    blocks: cloneBlocks(state.blocks),
    selection: withSelection(direction === "start" ? normalized.start : normalized.end),
  };
}

function deleteSelectionRange(state: Editor2State): Editor2State {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const startBlock = state.blocks[normalized.startIndex];
  const endBlock = state.blocks[normalized.endIndex];
  const mergedBlock: Editor2Block = {
    ...startBlock,
    text: `${startBlock.text.slice(0, normalized.start.offset)}${endBlock.text.slice(normalized.end.offset)}`,
  };

  const nextBlocks = [
    ...state.blocks.slice(0, normalized.startIndex).map((block) => ({ ...block })),
    mergedBlock,
    ...state.blocks.slice(normalized.endIndex + 1).map((block) => ({ ...block })),
  ];

  return {
    blocks: nextBlocks,
    selection: withSelection({
      blockId: mergedBlock.id,
      offset: normalized.start.offset,
    }),
  };
}

export function getSelectedText(state: Editor2State): string {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return "";
  }

  if (normalized.startIndex === normalized.endIndex) {
    const block = state.blocks[normalized.startIndex];
    return block.text.slice(normalized.start.offset, normalized.end.offset);
  }

  const parts: string[] = [];
  const startBlock = state.blocks[normalized.startIndex];
  const endBlock = state.blocks[normalized.endIndex];

  parts.push(startBlock.text.slice(normalized.start.offset));
  for (let index = normalized.startIndex + 1; index < normalized.endIndex; index += 1) {
    parts.push(state.blocks[index].text);
  }
  parts.push(endBlock.text.slice(0, normalized.end.offset));

  return parts.join("\n");
}

export function setSelection(state: Editor2State, selection: Editor2Selection): Editor2State {
  return {
    blocks: cloneBlocks(state.blocks),
    selection: {
      anchor: clampPosition(state, selection.anchor),
      focus: clampPosition(state, selection.focus),
    },
  };
}

export function insertTextAtSelection(state: Editor2State, text: string): Editor2State {
  if (text.length === 0) {
    return state;
  }

  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { block, index, offset } = getFocusBlock(collapsedState);
  const nextBlocks = collapsedState.blocks.map((candidate, candidateIndex) =>
    candidateIndex === index
      ? { ...candidate, text: `${block.text.slice(0, offset)}${text}${block.text.slice(offset)}` }
      : { ...candidate },
  );

  return {
    blocks: nextBlocks,
    selection: withSelection({
      blockId: block.id,
      offset: offset + text.length,
    }),
  };
}

export function insertPlainTextAtSelection(state: Editor2State, text: string): Editor2State {
  if (text.length === 0) {
    return state;
  }

  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalizedText.includes("\n")) {
    return insertTextAtSelection(state, normalizedText);
  }

  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { block, index, offset } = getFocusBlock(collapsedState);
  const lines = normalizedText.split("\n");
  const before = block.text.slice(0, offset);
  const after = block.text.slice(offset);
  const firstBlock: Editor2Block = {
    ...block,
    text: `${before}${lines[0]}`,
  };

  const middleBlocks = lines.slice(1, -1).map((line) => createEditor2Block(line));
  const lastBlock = createEditor2Block(`${lines[lines.length - 1]}${after}`);
  const nextBlocks = [
    ...collapsedState.blocks.slice(0, index).map((candidate) => ({ ...candidate })),
    firstBlock,
    ...middleBlocks,
    lastBlock,
    ...collapsedState.blocks.slice(index + 1).map((candidate) => ({ ...candidate })),
  ];

  return {
    blocks: nextBlocks,
    selection: withSelection({
      blockId: lastBlock.id,
      offset: lines[lines.length - 1].length,
    }),
  };
}

export function splitBlockAtSelection(state: Editor2State): Editor2State {
  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { block, index, offset } = getFocusBlock(collapsedState);
  const nextBlock = createEditor2Block(block.text.slice(offset));
  const updatedBlock: Editor2Block = {
    ...block,
    text: block.text.slice(0, offset),
  };

  const nextBlocks = [
    ...collapsedState.blocks.slice(0, index).map((candidate) => ({ ...candidate })),
    updatedBlock,
    nextBlock,
    ...collapsedState.blocks.slice(index + 1).map((candidate) => ({ ...candidate })),
  ];

  return {
    blocks: nextBlocks,
    selection: withSelection({
      blockId: nextBlock.id,
      offset: 0,
    }),
  };
}

export function deleteBackward(state: Editor2State): Editor2State {
  if (!isSelectionCollapsed(state.selection)) {
    return deleteSelectionRange(state);
  }

  const { block, index, offset } = getFocusBlock(state);

  if (offset > 0) {
    const nextBlocks = state.blocks.map((candidate, candidateIndex) =>
      candidateIndex === index
        ? {
            ...candidate,
            text: `${block.text.slice(0, offset - 1)}${block.text.slice(offset)}`,
          }
        : { ...candidate },
    );

    return {
      blocks: nextBlocks,
      selection: withSelection({
        blockId: block.id,
        offset: offset - 1,
      }),
    };
  }

  if (index === 0) {
    return state;
  }

  const previousBlock = state.blocks[index - 1];
  const mergedText = `${previousBlock.text}${block.text}`;
  const nextBlocks = state.blocks
    .map((candidate, candidateIndex) => {
      if (candidateIndex === index - 1) {
        return { ...candidate, text: mergedText };
      }
      if (candidateIndex === index) {
        return null;
      }
      return { ...candidate };
    })
    .filter((candidate): candidate is Editor2Block => candidate !== null);

  return {
    blocks: nextBlocks,
    selection: withSelection({
      blockId: previousBlock.id,
      offset: previousBlock.text.length,
    }),
  };
}

export function deleteForward(state: Editor2State): Editor2State {
  if (!isSelectionCollapsed(state.selection)) {
    return deleteSelectionRange(state);
  }

  const { block, index, offset } = getFocusBlock(state);

  if (offset < block.text.length) {
    const nextBlocks = state.blocks.map((candidate, candidateIndex) =>
      candidateIndex === index
        ? {
            ...candidate,
            text: `${block.text.slice(0, offset)}${block.text.slice(offset + 1)}`,
          }
        : { ...candidate },
    );

    return {
      blocks: nextBlocks,
      selection: withSelection({
        blockId: block.id,
        offset,
      }),
    };
  }

  if (index >= state.blocks.length - 1) {
    return state;
  }

  const nextBlock = state.blocks[index + 1];
  const mergedText = `${block.text}${nextBlock.text}`;
  const nextBlocks = state.blocks
    .map((candidate, candidateIndex) => {
      if (candidateIndex === index) {
        return { ...candidate, text: mergedText };
      }
      if (candidateIndex === index + 1) {
        return null;
      }
      return { ...candidate };
    })
    .filter((candidate): candidate is Editor2Block => candidate !== null);

  return {
    blocks: nextBlocks,
    selection: withSelection({
      blockId: block.id,
      offset,
    }),
  };
}

export function moveSelectionLeft(state: Editor2State): Editor2State {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, "start");
  }

  const { block, index, offset } = getFocusBlock(state);
  if (offset > 0) {
    return {
      blocks: cloneBlocks(state.blocks),
      selection: withSelection({
        blockId: block.id,
        offset: offset - 1,
      }),
    };
  }

  if (index === 0) {
    return state;
  }

  const previousBlock = state.blocks[index - 1];
  return {
    blocks: cloneBlocks(state.blocks),
    selection: withSelection({
      blockId: previousBlock.id,
      offset: previousBlock.text.length,
    }),
  };
}

export function moveSelectionRight(state: Editor2State): Editor2State {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, "end");
  }

  const { block, index, offset } = getFocusBlock(state);
  if (offset < block.text.length) {
    return {
      blocks: cloneBlocks(state.blocks),
      selection: withSelection({
        blockId: block.id,
        offset: offset + 1,
      }),
    };
  }

  if (index >= state.blocks.length - 1) {
    return state;
  }

  const nextBlock = state.blocks[index + 1];
  return {
    blocks: cloneBlocks(state.blocks),
    selection: withSelection({
      blockId: nextBlock.id,
      offset: 0,
    }),
  };
}

function moveVertical(state: Editor2State, delta: -1 | 1): Editor2State {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, delta < 0 ? "start" : "end");
  }

  const { index, offset } = getFocusBlock(state);
  const nextIndex = index + delta;

  if (nextIndex < 0 || nextIndex >= state.blocks.length) {
    return state;
  }

  const nextBlock = state.blocks[nextIndex];
  return {
    blocks: cloneBlocks(state.blocks),
    selection: withSelection({
      blockId: nextBlock.id,
      offset: Math.min(offset, nextBlock.text.length),
    }),
  };
}

export function moveSelectionUp(state: Editor2State): Editor2State {
  return moveVertical(state, -1);
}

export function moveSelectionDown(state: Editor2State): Editor2State {
  return moveVertical(state, 1);
}

function moveFocusHorizontally(state: Editor2State, delta: -1 | 1): Editor2State {
  const focus = clampPosition(state, state.selection.focus);
  const index = findBlockIndex(state.blocks, focus.blockId);
  const block = state.blocks[index];

  if (delta < 0 && focus.offset > 0) {
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: {
        blockId: block.id,
        offset: focus.offset - 1,
      },
    });
  }

  if (delta > 0 && focus.offset < block.text.length) {
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: {
        blockId: block.id,
        offset: focus.offset + 1,
      },
    });
  }

  if (delta < 0 && index > 0) {
    const previousBlock = state.blocks[index - 1];
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: {
        blockId: previousBlock.id,
        offset: previousBlock.text.length,
      },
    });
  }

  if (delta > 0 && index < state.blocks.length - 1) {
    const nextBlock = state.blocks[index + 1];
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: {
        blockId: nextBlock.id,
        offset: 0,
      },
    });
  }

  return state;
}

function moveFocusVertical(state: Editor2State, delta: -1 | 1): Editor2State {
  const focus = clampPosition(state, state.selection.focus);
  const index = findBlockIndex(state.blocks, focus.blockId);
  const nextIndex = index + delta;

  if (nextIndex < 0 || nextIndex >= state.blocks.length) {
    return state;
  }

  const nextBlock = state.blocks[nextIndex];
  return setSelection(state, {
    anchor: state.selection.anchor,
    focus: {
      blockId: nextBlock.id,
      offset: Math.min(focus.offset, nextBlock.text.length),
    },
  });
}

export function extendSelectionLeft(state: Editor2State): Editor2State {
  return moveFocusHorizontally(state, -1);
}

export function extendSelectionRight(state: Editor2State): Editor2State {
  return moveFocusHorizontally(state, 1);
}

export function extendSelectionUp(state: Editor2State): Editor2State {
  return moveFocusVertical(state, -1);
}

export function extendSelectionDown(state: Editor2State): Editor2State {
  return moveFocusVertical(state, 1);
}
