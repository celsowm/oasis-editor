import { EditorState } from "../EditorState.js";
import { registerHandler } from "../OperationHandlers.js";
import { OperationType } from "../../operations/OperationTypes.js";
import { BlockNode, TextBlockNode, TextRun } from "../../document/BlockTypes.js";
import { areMarksEqual } from "../../document/MarkUtils.js";
import { LogicalPosition } from "../../selection/SelectionTypes.js";

function stripBlock(
  blocks: BlockNode[],
  blockId: string,
): { nextBlocks: BlockNode[]; stripped: BlockNode | null } {
  const idx = blocks.findIndex((b) => b.id === blockId);
  if (idx !== -1) {
    const stripped = blocks[idx];
    const nextBlocks = [...blocks];
    nextBlocks.splice(idx, 1);
    return { nextBlocks, stripped };
  }

  let stripped: BlockNode | null = null;
  const nextBlocks = blocks.map((block) => {
    const res = transformContainerDeepForStrip(block, blockId);
    if (res.stripped) stripped = res.stripped;
    return res.block;
  });

  return { nextBlocks, stripped };
}

function transformContainerDeepForStrip(
  container: any,
  blockId: string,
): { block: any; stripped: BlockNode | null } {
  if (!container || typeof container !== "object")
    return { block: container, stripped: null };

  let stripped: BlockNode | null = null;
  const result = { ...container };
  let hasChanges = false;

  for (const key in result) {
    const value = result[key];
    if (Array.isArray(value)) {
      if (value.length > 0 && "kind" in value[0] && "id" in value[0]) {
        const res = stripBlock(value, blockId);
        if (res.stripped) stripped = res.stripped;
        result[key] = res.nextBlocks;
        hasChanges = true;
      } else {
        result[key] = value.map((item) => {
          const res = transformContainerDeepForStrip(item, blockId);
          if (res.stripped) stripped = res.stripped;
          return res.block;
        });
        hasChanges = true;
      }
    }
  }
  return { block: hasChanges ? result : container, stripped };
}

function insertBlock(
  blocks: BlockNode[],
  targetId: string,
  blockToInsert: BlockNode,
  isBefore: boolean,
): { nextBlocks: BlockNode[]; inserted: boolean } {
  const idx = blocks.findIndex((b) => b.id === targetId);
  if (idx !== -1) {
    const nextBlocks = [...blocks];
    nextBlocks.splice(isBefore ? idx : idx + 1, 0, blockToInsert);
    return { nextBlocks, inserted: true };
  }

  let inserted = false;
  const nextBlocks = blocks.map((block) => {
    const res = transformContainerDeepForInsert(
      block,
      targetId,
      blockToInsert,
      isBefore,
    );
    if (res.inserted) inserted = true;
    return res.block;
  });

  return { nextBlocks, inserted };
}

function transformContainerDeepForInsert(
  container: any,
  targetId: string,
  blockToInsert: BlockNode,
  isBefore: boolean,
): { block: any; inserted: boolean } {
  if (!container || typeof container !== "object")
    return { block: container, inserted: false };

  let inserted = false;
  const result = { ...container };
  let hasChanges = false;

  for (const key in result) {
    const value = result[key];
    if (Array.isArray(value)) {
      if (value.length > 0 && "kind" in value[0] && "id" in value[0]) {
        const res = insertBlock(value, targetId, blockToInsert, isBefore);
        if (res.inserted) inserted = true;
        result[key] = res.nextBlocks;
        hasChanges = true;
      } else {
        result[key] = value.map((item) => {
          const res = transformContainerDeepForInsert(
            item,
            targetId,
            blockToInsert,
            isBefore,
          );
          if (res.inserted) inserted = true;
          return res.block;
        });
        hasChanges = true;
      }
    }
  }
  return { block: hasChanges ? result : container, inserted };
}

export function registerMoveHandlers(): void {
  registerHandler(OperationType.MOVE_BLOCK, (state, op) => {
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
