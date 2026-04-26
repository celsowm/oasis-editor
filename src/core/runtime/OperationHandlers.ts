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
// Delegation to focused handler modules
// ---------------------------------------------------------------------------

import { registerTextHandlers } from "./handlers/textHandlers.js";
import { registerMarkHandlers } from "./handlers/markHandlers.js";
import { registerTableHandlers } from "./handlers/tableHandlers.js";
import { registerListHandlers } from "./handlers/listHandlers.js";
import { registerMoveHandlers } from "./handlers/moveHandlers.js";
import { registerFormatHandlers } from "./handlers/formatHandlers.js";
import { registerImageHandlers } from "./handlers/imageHandlers.js";
import { registerMetaHandlers } from "./handlers/metaHandlers.js";
import { registerRevisionHandlers } from "./handlers/revisionHandlers.js";

registerTextHandlers();
registerMarkHandlers();
registerTableHandlers();
registerListHandlers();
registerMoveHandlers();
registerFormatHandlers();
registerImageHandlers();
registerMetaHandlers();
registerRevisionHandlers();
