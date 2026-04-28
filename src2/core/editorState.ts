import type { Editor2Block, Editor2State } from "./model.js";
import { createCollapsedSelection } from "./selection.js";

let nextBlockId = 1;

export function resetEditor2Ids(): void {
  nextBlockId = 1;
}

export function createEditor2Block(text = ""): Editor2Block {
  const block: Editor2Block = {
    id: `block:${nextBlockId}`,
    text,
  };
  nextBlockId += 1;
  return block;
}

export function createInitialEditor2State(): Editor2State {
  const block = createEditor2Block("");
  return {
    blocks: [block],
    selection: createCollapsedSelection({
      blockId: block.id,
      offset: 0,
    }),
  };
}

export function createEditor2StateFromTexts(
  texts: string[],
  selection?: {
    anchor?: { blockIndex: number; offset: number };
    focus?: { blockIndex: number; offset: number };
    blockIndex?: number;
    offset?: number;
  },
): Editor2State {
  const blocks = texts.length > 0 ? texts.map((text) => createEditor2Block(text)) : [createEditor2Block("")];
  const defaultIndex = selection?.blockIndex ?? selection?.anchor?.blockIndex ?? 0;
  const anchorIndex = Math.max(
    0,
    Math.min(selection?.anchor?.blockIndex ?? defaultIndex, blocks.length - 1),
  );
  const focusIndex = Math.max(
    0,
    Math.min(selection?.focus?.blockIndex ?? selection?.blockIndex ?? anchorIndex, blocks.length - 1),
  );
  const anchorBlock = blocks[anchorIndex];
  const focusBlock = blocks[focusIndex];
  const anchorOffset = selection?.anchor?.offset ?? selection?.offset ?? 0;
  const focusOffset = selection?.focus?.offset ?? selection?.offset ?? anchorOffset;

  return {
    blocks,
    selection: {
      anchor: {
        blockId: anchorBlock.id,
        offset: Math.max(0, Math.min(anchorOffset, anchorBlock.text.length)),
      },
      focus: {
        blockId: focusBlock.id,
        offset: Math.max(0, Math.min(focusOffset, focusBlock.text.length)),
      },
    },
  };
}
