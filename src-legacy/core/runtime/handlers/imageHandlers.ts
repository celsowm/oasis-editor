import { registerHandler } from "../OperationHandlers.js";
import { OperationType, InsertImageOp, ResizeImageOp, SelectImageOp, UpdateImageOp } from "../../operations/OperationTypes.js";
import { createImage } from "../../document/DocumentFactory.js";
import { updateDocumentSections } from "./sharedHelpers.js";
import { isTextBlock, TextRun } from "../../document/BlockTypes.js";

export function registerImageHandlers(): void {
  registerHandler(OperationType.INSERT_IMAGE, (state, op: InsertImageOp) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId, inlineId, offset } = selection.anchor;
    const {
      src,
      naturalWidth,
      naturalHeight,
      displayWidth,
      align,
      alt,
      newBlockId,
    } = op.payload;
    const imageNode = createImage(
      src,
      naturalWidth,
      naturalHeight,
      displayWidth,
      align,
      alt || "",
    );
    if (newBlockId) imageNode.id = newBlockId;

    const nextState = updateDocumentSections(state, blockId, (block) => {
      if (!isTextBlock(block)) return [block, imageNode];

      const beforeChildren: TextRun[] = [];
      const afterChildren: TextRun[] = [];
      let found = false;

      for (const run of block.children) {
        if (run.id === inlineId) {
          const beforeText = run.text.substring(0, offset);
          const afterText = run.text.substring(offset);
          
          if (beforeText || !found) {
            beforeChildren.push({ ...run, text: beforeText });
          }
          
          afterChildren.push({ ...run, id: run.id + "_after", text: afterText });
          found = true;
        } else if (!found) {
          beforeChildren.push(run);
        } else {
          afterChildren.push(run);
        }
      }

      const pBefore = { ...block, children: beforeChildren };
      const pAfter = { ...block, id: block.id + "_after", children: afterChildren };

      const result: any[] = [];
      // Always include pBefore if it has content, or if we're at the very start of a block
      if (beforeChildren.length > 0 || offset === 0) {
          result.push(pBefore);
      }
      
      result.push(imageNode);
      
      // Only include pAfter if it has remaining content
      if (afterChildren.length > 0 && afterChildren.some(r => r.text.length > 0)) {
          result.push(pAfter);
      }
      
      return result;
    });

    return {
      ...nextState,
      selectedImageId: imageNode.id,
      selection: null,
    };
  });

  registerHandler(OperationType.RESIZE_IMAGE, (state, op: ResizeImageOp) => {
    const { blockId, width, height } = op.payload;
    return {
      ...updateDocumentSections(state, blockId, (block) =>
        block.kind === "image" ? { ...block, width, height } : block,
      ),
      selectedImageId: blockId,
      selection: null,
    };
  });

  registerHandler(OperationType.SELECT_IMAGE, (state, op: SelectImageOp) => ({
    ...state,
    selectedImageId: op.payload.blockId,
    selection: null,
  }));

  registerHandler(OperationType.UPDATE_IMAGE, (state, op: UpdateImageOp) => {
    const { blockId, alt, width, height } = op.payload;
    return {
      ...updateDocumentSections(state, blockId, (block) => {
        if (block.kind !== "image") return block;
        const updated: typeof block = { ...block };
        if (alt !== undefined) updated.alt = alt;
        if (width !== undefined) updated.width = width;
        if (height !== undefined) updated.height = height;
        return updated;
      }),
      selectedImageId: blockId,
      selection: null,
    };
  });
}
