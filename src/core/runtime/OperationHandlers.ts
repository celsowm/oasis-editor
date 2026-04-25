import { EditorState } from "./EditorState.js";
import {
  EditorOperation,
  OperationType,
} from "../operations/OperationTypes.js";

// ---------------------------------------------------------------------------
// Core registry (the only public API for adding handlers at runtime)
// ---------------------------------------------------------------------------

export type OperationHandler<T extends EditorOperation = any> = (
  state: EditorState,
  operation: T,
) => EditorState;

const registry: Partial<Record<OperationType, OperationHandler>> = {};

export function registerHandler(
  type: OperationType,
  handler: OperationHandler,
) {
  registry[type] = handler;
}

export function getHandler(type: OperationType): OperationHandler | undefined {
  return registry[type];
}

// ---------------------------------------------------------------------------
// Handlers que ainda nao foram extraidos para modulos focados
// ---------------------------------------------------------------------------

// SET_ALIGNMENT e INSERT_IMAGE / RESIZE_IMAGE / SELECT_IMAGE ainda ficam aqui
// pois sao poucos e nao justificam modulo proprio ainda.

import { isTextBlock, MarkSet } from "../document/BlockTypes.js";
import { createImage } from "../document/DocumentFactory.js";
import { updateDocumentSections } from "./handlers/sharedHelpers.js";

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

// Template e editing mode — handlers simples de metadados
registerHandler(OperationType.SET_SECTION_TEMPLATE, (state, op) => {
  const { sectionId, templateId } = op.payload;
  const nextSections = state.document.sections.map((s) =>
    s.id === sectionId ? { ...s, pageTemplateId: templateId } : s,
  );
  return {
    ...state,
    document: {
      ...state.document,
      revision: state.document.revision + 1,
      sections: nextSections,
    },
  };
});

registerHandler(OperationType.SET_EDITING_MODE, (state, op) => {
  return {
    ...state,
    editingMode: op.payload.mode,
  };
});

// ---------------------------------------------------------------------------
// Delegacao para modulos extraidos
// ---------------------------------------------------------------------------

import { registerTextHandlers } from "./handlers/textHandlers.js";
import { registerMarkHandlers } from "./handlers/markHandlers.js";
import { registerTableHandlers } from "./handlers/tableHandlers.js";
import { registerListHandlers } from "./handlers/listHandlers.js";
import { registerMoveHandlers } from "./handlers/moveHandlers.js";

registerTextHandlers();
registerMarkHandlers();
registerTableHandlers();
registerListHandlers();
registerMoveHandlers();
