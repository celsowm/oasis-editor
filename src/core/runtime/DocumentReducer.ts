import { EditorState } from "./EditorState.js";
import {
  EditorOperation,
} from "../operations/OperationTypes.js";
import { LayoutState } from "../layout/LayoutTypes.js";
import { getHandler } from "./OperationHandlers.js";

export interface ReducerState extends EditorState {
  _layout?: LayoutState;
}

export const reduceDocumentState = (
  state: EditorState,
  operation: EditorOperation,
  _layout?: LayoutState,
): EditorState => {
  const handler = getHandler(operation.type);
  if (handler) {
    return handler(state, operation);
  }
  
  console.warn(`No handler registered for operation type: ${operation.type}`);
  return state;
};
