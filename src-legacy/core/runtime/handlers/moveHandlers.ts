import { EditorState } from "../EditorState.js";
import { registerHandler } from "../OperationHandlers.js";
import { OperationType, MoveBlockOp } from "../../operations/OperationTypes.js";
import { BlockNode, TextBlockNode, TextRun } from "../../document/BlockTypes.js";
import { areMarksEqual } from "../../document/MarkUtils.js";
import { LogicalPosition } from "../../selection/SelectionTypes.js";

function stripBlock(
  blocks: BlockNode[],
  blockId: string,
): { nextBlocks: BlockNode[]; stripped: BlockNode | null } {
  let stripped: BlockNode | null = null;
  const nextBlocks: BlockNode[] = [];

  for (const block of blocks) {
    if (block.id === blockId) {
      stripped = block;
      continue;
    }

    if (block.kind === "table") {
      const nextRows = block.rows.map((row) => {
        const nextCells = row.cells.map((cell) => {
          const res = stripBlock(cell.children, blockId);
          if (res.stripped) stripped = res.stripped;
          return { ...cell, children: res.nextBlocks };
        });
        return { ...row, cells: nextCells };
      });
      nextBlocks.push({ ...block, rows: nextRows });
    } else {
      nextBlocks.push(block);
    }
  }

  return { nextBlocks, stripped };
}

function insertBlock(
  blocks: BlockNode[],
  targetId: string,
  blockToInsert: BlockNode,
  isBefore: boolean,
): { nextBlocks: BlockNode[]; inserted: boolean } {
  let inserted = false;
  const nextBlocks: BlockNode[] = [];

  for (const block of blocks) {
    if (block.id === targetId) {
      if (isBefore) {
        nextBlocks.push(blockToInsert);
        nextBlocks.push(block);
      } else {
        nextBlocks.push(block);
        nextBlocks.push(blockToInsert);
      }
      inserted = true;
      continue;
    }

    if (block.kind === "table") {
      const nextRows = block.rows.map((row) => {
        const nextCells = row.cells.map((cell) => {
          if (inserted) return cell;
          const res = insertBlock(cell.children, targetId, blockToInsert, isBefore);
          if (res.inserted) inserted = true;
          return { ...cell, children: res.nextBlocks };
        });
        return { ...row, cells: nextCells };
      });
      nextBlocks.push({ ...block, rows: nextRows });
    } else {
      nextBlocks.push(block);
    }
  }

  return { nextBlocks, inserted };
}

export function registerMoveHandlers(): void {
  registerHandler(OperationType.MOVE_BLOCK, (state, op: MoveBlockOp) => {
    const { blockId, targetReferenceBlockId, isBefore } = op.payload;
    if (blockId === targetReferenceBlockId) return state;

    let stripped: BlockNode | null = null;
    const sectionsAfterStrip = state.document.sections.map((section) => {
      const res = stripBlock(section.children, blockId);
      if (res.stripped) stripped = res.stripped;
      return { ...section, children: res.nextBlocks };
    });

    if (!stripped) return state;

    let inserted = false;
    const sectionsAfterInsert = sectionsAfterStrip.map((section) => {
      if (inserted) return section;
      const res = insertBlock(
        section.children,
        targetReferenceBlockId,
        stripped!,
        isBefore ?? false,
      );
      if (res.inserted) inserted = true;
      return { ...section, children: res.nextBlocks };
    });

    return {
      ...state,
      document: {
        ...state.document,
        revision: state.document.revision + 1,
        sections: sectionsAfterInsert,
      },
    };
  });
}
