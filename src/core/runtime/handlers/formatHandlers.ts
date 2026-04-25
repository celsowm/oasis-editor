import { registerHandler } from "../OperationHandlers.js";
import { OperationType } from "../../operations/OperationTypes.js";
import { isTextBlock } from "../../document/BlockTypes.js";
import { updateDocumentSections } from "./sharedHelpers.js";

export function registerFormatHandlers(): void {
  registerHandler(OperationType.SET_ALIGNMENT, (state, op) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId } = selection.anchor;
    const { align } = op.payload;
    return updateDocumentSections(state, blockId, (block) => {
      if (!isTextBlock(block)) return block;
      if (block.kind === "heading" && align === "justify")
        return { ...block, align: "left" };
      return { ...block, align };
    });
  });
}
