import { EditorState } from "../../core/runtime/EditorState.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { EditorOperation } from "../../core/operations/OperationTypes.js";

export interface CompositionAdapter {
  getEditorState(): EditorState;
  getLayoutState(): LayoutState;
  applyOperation(operation: EditorOperation): void;
}

export class RustCompositionAdapter implements CompositionAdapter {
  getEditorState(): EditorState {
    throw new Error("Rust composition adapter not implemented yet");
  }

  getLayoutState(): LayoutState {
    throw new Error("Rust composition adapter not implemented yet");
  }

  applyOperation(): void {
    throw new Error("Rust composition adapter not implemented yet");
  }
}
