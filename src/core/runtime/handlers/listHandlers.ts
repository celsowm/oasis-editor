import { EditorState } from "../EditorState.js";
import { registerHandler } from "../OperationHandlers.js";
import { OperationType, SetIndentationOp } from "../../operations/OperationTypes.js";
import { getAllBlocksInSection } from "../../document/BlockUtils.js";
import { isTextBlock, BlockNode, withBlockKind, withIndentation, getBlockIndentation, isListItemBlock } from "../../document/BlockTypes.js";
import {
  DEFAULT_LIST_INDENTATION,
  DEFAULT_ORDERED_LIST_INDENTATION,
} from "../../composition/ParagraphComposer.js";
import { updateDocumentSections, recalculateListSequences } from "./sharedHelpers.js";

export function registerListHandlers(): void {
  registerHandler(OperationType.TOGGLE_UNORDERED_LIST, (state) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId } = selection.anchor;

    return updateDocumentSections(state, blockId, (block) => {
      if (!isTextBlock(block)) return block;
      if (block.kind === "paragraph" || block.kind === "ordered-list-item") {
        return { ...withBlockKind(block, "list-item"), level: 0, listFormat: "bullet" as const };
      } else if (block.kind === "list-item") {
        return withBlockKind(block, "paragraph");
      }
      return block;
    });
  });

  registerHandler(OperationType.TOGGLE_ORDERED_LIST, (state) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId } = selection.anchor;

    return updateDocumentSections(state, blockId, (block) => {
      if (!isTextBlock(block)) return block;
      if (block.kind === "paragraph" || block.kind === "list-item") {
        return { ...withBlockKind(block, "ordered-list-item"), index: 1, level: 0, listFormat: "decimal" as const };
      } else if (block.kind === "ordered-list-item") {
        return withBlockKind(block, "paragraph");
      }
      return block;
    });
  });

  registerHandler(OperationType.DECREASE_INDENT, (state) => {
    const { selection, editingMode: zone } = state;
    if (!selection) return state;

    const { document: doc } = state;
    const allBlocks: BlockNode[] = [];
    for (const section of doc.sections) {
      let targetBlocks = section.children;
      if (zone === "header") targetBlocks = section.header || [];
      else if (zone === "footer") targetBlocks = section.footer || [];
      getAllBlocksInSection(targetBlocks).forEach((b) => allBlocks.push(b));
    }

    let startBlockIdx = allBlocks.findIndex(
      (b) => b.id === selection.anchor.blockId,
    );
    let endBlockIdx = allBlocks.findIndex(
      (b) => b.id === selection.focus.blockId,
    );

    if (startBlockIdx === -1 || endBlockIdx === -1) return state;

    let isReversed = false;
    if (startBlockIdx > endBlockIdx) {
      isReversed = true;
    } else if (startBlockIdx === endBlockIdx) {
      const block = allBlocks[startBlockIdx];
      if (isTextBlock(block)) {
        let startAbs = 0,
          endAbs = 0,
          acc = 0;
        for (const r of block.children) {
          if (r.id === selection.anchor.inlineId)
            startAbs = acc + selection.anchor.offset;
          if (r.id === selection.focus.inlineId)
            endAbs = acc + selection.focus.offset;
          acc += r.text.length;
        }
        if (startAbs > endAbs) {
          isReversed = true;
        }
      }
    }

    if (isReversed) {
      const temp = startBlockIdx;
      startBlockIdx = endBlockIdx;
      endBlockIdx = temp;
    }

    const firstBlockIdx = Math.min(startBlockIdx, endBlockIdx);
    const lastBlockIdx = Math.max(startBlockIdx, endBlockIdx);

    let nextState: EditorState = state;
    for (let i = firstBlockIdx; i <= lastBlockIdx; i++) {
      const targetBlock = allBlocks[i];
      if (!isTextBlock(targetBlock)) continue;

      nextState = updateDocumentSections(nextState, targetBlock.id, (block) => {
        if (!isTextBlock(block)) return block;

        // For list items, decrease level instead of generic indentation
        if (isListItemBlock(block)) {
          const currentLevel = block.level ?? 0;
          const newLevel = Math.max(0, currentLevel - 1);
          return { ...block, level: newLevel };
        }

        // Non-list text blocks use indentation
        const currentIndent = getBlockIndentation(block);
        const step = DEFAULT_LIST_INDENTATION;
        const newIndent = Math.max(0, currentIndent - step);
        return withIndentation(block, newIndent);
      });
    }

    return nextState;
  });

  registerHandler(OperationType.INCREASE_INDENT, (state) => {
    const { selection, editingMode: zone } = state;
    if (!selection) return state;

    const { document: doc } = state;
    const allBlocks: BlockNode[] = [];
    for (const section of doc.sections) {
      let targetBlocks = section.children;
      if (zone === "header") targetBlocks = section.header || [];
      else if (zone === "footer") targetBlocks = section.footer || [];
      getAllBlocksInSection(targetBlocks).forEach((b) => allBlocks.push(b));
    }

    let startBlockIdx = allBlocks.findIndex(
      (b) => b.id === selection.anchor.blockId,
    );
    let endBlockIdx = allBlocks.findIndex(
      (b) => b.id === selection.focus.blockId,
    );

    if (startBlockIdx === -1 || endBlockIdx === -1) return state;

    let isReversed = false;
    if (startBlockIdx > endBlockIdx) {
      isReversed = true;
    } else if (startBlockIdx === endBlockIdx) {
      const block = allBlocks[startBlockIdx];
      if (isTextBlock(block)) {
        let startAbs = 0,
          endAbs = 0,
          acc = 0;
        for (const r of block.children) {
          if (r.id === selection.anchor.inlineId)
            startAbs = acc + selection.anchor.offset;
          if (r.id === selection.focus.inlineId)
            endAbs = acc + selection.focus.offset;
          acc += r.text.length;
        }
        if (startAbs > endAbs) {
          isReversed = true;
        }
      }
    }

    if (isReversed) {
      const temp = startBlockIdx;
      startBlockIdx = endBlockIdx;
      endBlockIdx = temp;
    }

    const firstBlockIdx = Math.min(startBlockIdx, endBlockIdx);
    const lastBlockIdx = Math.max(startBlockIdx, endBlockIdx);

    let nextState: EditorState = state;
    for (let i = firstBlockIdx; i <= lastBlockIdx; i++) {
      const targetBlock = allBlocks[i];
      if (!isTextBlock(targetBlock)) continue;

      nextState = updateDocumentSections(nextState, targetBlock.id, (block) => {
        if (!isTextBlock(block)) return block;

        // For list items, increase level instead of generic indentation
        if (isListItemBlock(block)) {
          const currentLevel = block.level ?? 0;
          const newLevel = currentLevel + 1;
          return { ...block, level: newLevel };
        }

        // Non-list text blocks use indentation
        const currentIndent = getBlockIndentation(block);
        const step = DEFAULT_LIST_INDENTATION;
        const newIndent = currentIndent + step;
        return withIndentation(block, newIndent);
      });
    }

    return nextState;
  });

  registerHandler(OperationType.SET_INDENTATION, (state, op: SetIndentationOp) => {
    const { selection, editingMode: zone } = state;
    if (!selection) return state;

    const newIndent = op.payload.indentation;

    const { document: doc } = state;
    const allBlocks: BlockNode[] = [];
    for (const section of doc.sections) {
      let targetBlocks = section.children;
      if (zone === "header") targetBlocks = section.header || [];
      else if (zone === "footer") targetBlocks = section.footer || [];
      getAllBlocksInSection(targetBlocks).forEach((b) => allBlocks.push(b));
    }

    let startBlockIdx = allBlocks.findIndex(
      (b) => b.id === selection.anchor.blockId,
    );
    let endBlockIdx = allBlocks.findIndex(
      (b) => b.id === selection.focus.blockId,
    );

    if (startBlockIdx === -1 || endBlockIdx === -1) return state;

    if (startBlockIdx > endBlockIdx) {
      [startBlockIdx, endBlockIdx] = [endBlockIdx, startBlockIdx];
    }

    const targetBlockIds = new Set(
      allBlocks.slice(startBlockIdx, endBlockIdx + 1).map((b) => b.id),
    );

    const updateBlocks = (blocks: BlockNode[]): BlockNode[] => {
      return blocks.map((block) => {
        if (block.kind === "table") {
          return {
            ...block,
            rows: block.rows.map((row) => ({
              ...row,
              cells: row.cells.map((cell) => ({
                ...cell,
                children: updateBlocks(cell.children),
              })),
            })),
          };
        }

        if (targetBlockIds.has(block.id)) {
          if (!isTextBlock(block)) {
            return block;
          }
          return withIndentation(block, newIndent);
        }
        return block;
      });
    };

    return {
      ...state,
      document: {
        ...doc,
        sections: doc.sections.map((sec) => ({
          ...sec,
          children: updateBlocks(sec.children),
        })),
      },
    };
  });
}
