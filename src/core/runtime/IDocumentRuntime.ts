import { EditorState } from "./EditorState.js";
import { EditorOperation } from "../operations/OperationTypes.js";
import { LayoutState } from "../layout/LayoutTypes.js";

export interface IDocumentRuntime {
  getState(): EditorState;
  dispatch(operation: EditorOperation): void;
  subscribe(listener: (state: EditorState) => void): () => void;
  undo(): void;
  redo(): void;
  setLayout(layout: LayoutState): void;
  getLayout(): LayoutState | null;
}
