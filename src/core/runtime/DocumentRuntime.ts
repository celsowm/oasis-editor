import { createDocument } from "../document/DocumentFactory.js";
import { EditorState } from "./EditorState.js";
import { EditorOperation } from "../operations/OperationTypes.js";
import { reduceDocumentState } from "./DocumentReducer.js";
import { LayoutState } from "../layout/LayoutTypes.js";

export class DocumentRuntime {
  private state: EditorState;
  private history: EditorState[];
  private future: EditorState[];
  private listeners: Set<(state: EditorState) => void>;
  private latestLayout: LayoutState | null;

  constructor() {
    const doc = createDocument();
    this.state = {
      document: doc,
      selection: {
        anchor: {
          sectionId: doc.sections[0].id,
          blockId: doc.sections[0].children[0].id,
          inlineId: doc.sections[0].children[0].children[0].id,
          offset: 0,
        },
        focus: {
          sectionId: doc.sections[0].id,
          blockId: doc.sections[0].children[0].id,
          inlineId: doc.sections[0].children[0].children[0].id,
          offset: 0,
        },
      },
    };
    this.history = [];
    this.future = [];
    this.listeners = new Set();
    this.latestLayout = null;
  }

  getState(): EditorState {
    return this.state;
  }

  setLayout(layout: LayoutState): void {
    this.latestLayout = layout;
  }

  getLayout(): LayoutState | null {
    return this.latestLayout;
  }

  subscribe(listener: (state: EditorState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  dispatch(operation: EditorOperation): void {
    console.log("RUNTIME: dispatch chamado com", operation.type);
    this.history.push(this.state);
    this.future = [];
    this.state = reduceDocumentState(
      this.state,
      operation,
      this.latestLayout ?? undefined,
    );
    console.log("RUNTIME: Estado atualizado, selection:", this.state.selection);
    this.emit();
  }

  undo(): void {
    const previous = this.history.pop();
    if (!previous) return;
    this.future.unshift(this.state);
    this.state = previous;
    this.emit();
  }

  redo(): void {
    const next = this.future.shift();
    if (!next) return;
    this.history.push(this.state);
    this.state = next;
    this.emit();
  }

  exportJson(): string {
    return JSON.stringify(
      {
        version: "5.1.0-solid-clean",
        engine: "document-runtime",
        document: this.state.document,
        selection: this.state.selection,
      },
      null,
      2,
    );
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
