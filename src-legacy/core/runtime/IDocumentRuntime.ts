import { EditorState } from "./EditorState.js";
import { EditorOperation } from "../operations/OperationTypes.js";
import { LayoutState } from "../layout/LayoutTypes.js";

export interface IDocumentRuntime {
  getState(): EditorState;
  setState(state: EditorState): void; // Added for controllers that need to set raw state
  setLayout(layout: LayoutState): void;
  getLayout(): LayoutState | null;
  subscribe(listener: (state: EditorState) => void): () => void;
  dispatch(operation: EditorOperation): void;
  undo(): void;
  redo(): void;
}
