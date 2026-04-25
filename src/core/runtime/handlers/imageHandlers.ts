import { registerHandler } from "../OperationHandlers.js";
import { OperationType } from "../../operations/OperationTypes.js";
import { createImage } from "../../document/DocumentFactory.js";
import { updateDocumentSections } from "./sharedHelpers.js";

export function registerImageHandlers(): void {
  registerHandler(OperationType.INSERT_IMAGE, (state, op) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId } = selection.anchor;
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

    const nextState = updateDocumentSections(state, blockId, (block) => [
      block,
      imageNode,
    ]);
    return {
      ...nextState,
      selectedImageId: imageNode.id,
      selection: null,
    };
  });

  registerHandler(OperationType.RESIZE_IMAGE, (state, op) => {
    const { blockId, width, height } = op.payload;
    return {
      ...updateDocumentSections(state, blockId, (block) =>
        block.kind === "image" ? { ...block, width, height } : block,
      ),
      selectedImageId: blockId,
      selection: null,
    };
  });

  registerHandler(OperationType.SELECT_IMAGE, (state, op) => ({
    ...state,
    selectedImageId: op.payload.blockId,
    selection: null,
  }));

  registerHandler(OperationType.UPDATE_IMAGE, (state, op) => {
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
