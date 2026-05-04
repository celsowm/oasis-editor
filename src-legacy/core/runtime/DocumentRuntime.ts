import { EditorState } from "./EditorState.js";
import { EditorOperation } from "../operations/OperationTypes.js";
import { reduceDocumentState } from "./DocumentReducer.js";
import { LayoutState } from "../layout/LayoutTypes.js";
import { Logger } from "../utils/Logger.js";
import { IDocumentRuntime } from "./IDocumentRuntime.js";
import { StateStore } from "./StateStore.js";
import { HistoryManager } from "./HistoryManager.js";
import { createDocument } from "../document/DocumentFactory.js";
import { isTextBlock } from "../document/BlockTypes.js";

import { IdGenerator } from "../utils/IdGenerator.js";

function createDefaultState(): EditorState {
  const gen = new IdGenerator();
  const doc = createDocument(gen);
  const firstSection = doc.sections[0];
  const firstBlock = firstSection.children[0];
  const firstInlineId = isTextBlock(firstBlock) ? firstBlock.children[0].id : "";

  return {
    document: doc,
    selection: {
      anchor: { sectionId: firstSection.id, blockId: firstBlock.id, inlineId: firstInlineId, offset: 0 },
      focus: { sectionId: firstSection.id, blockId: firstBlock.id, inlineId: firstInlineId, offset: 0 },
    },
    idGenerator: gen,
    editingMode: "main",
  };
}

export class DocumentRuntime implements IDocumentRuntime {
  private store: StateStore;
  private history: HistoryManager;
  private latestLayout: LayoutState | null = null;

  constructor(initialState?: EditorState) {
    this.store = new StateStore(initialState ?? createDefaultState());
    this.history = new HistoryManager();
  }

  getState(): EditorState {
    return this.store.getState();
  }

  setState(state: EditorState): void {
    this.store.setState(state);
  }

  setLayout(layout: LayoutState): void {
    this.latestLayout = layout;
  }

  getLayout(): LayoutState | null {
    return this.latestLayout;
  }

  subscribe(listener: (state: EditorState) => void): () => void {
    return this.store.subscribe(listener);
  }

  dispatch(operation: EditorOperation): void {
    const before = this.store.getState();
    Logger.debug("RUNTIME: dispatch:start", {
      type: operation.type,
      selection: before.selection,
      editingMode: before.editingMode,
      pendingMarks: before.pendingMarks ?? null,
      revision: before.document.revision,
    });
    const currentState = this.store.getState();
    
    // Save to history before mutation
    this.history.push(currentState);
    
    const nextState = reduceDocumentState(
      currentState,
      operation,
      this.latestLayout ?? undefined,
    );
    
    this.store.setState(nextState);

    Logger.debug("RUNTIME: dispatch:end", {
      type: operation.type,
      selection: nextState.selection,
      editingMode: nextState.editingMode,
      pendingMarks: nextState.pendingMarks ?? null,
      revision: nextState.document.revision,
      selectedImageId: nextState.selectedImageId ?? null,
    });
  }

  undo(): void {
    const nextState = this.history.undo(this.store.getState());
    if (nextState) this.store.setState(nextState);
  }

  redo(): void {
    const nextState = this.history.redo(this.store.getState());
    if (nextState) this.store.setState(nextState);
  }
}
