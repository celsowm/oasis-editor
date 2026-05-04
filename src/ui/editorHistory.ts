import type { EditorState } from "../core/model.js";

export interface EditorTransactionOptions {
  mergeKey?: string;
}

export interface EditorTransactionMeta {
  mergeKey: string;
  timestamp: number;
}

export interface EditorHistoryState {
  undoStack: EditorState[];
  redoStack: EditorState[];
  lastTransactionMeta: EditorTransactionMeta | null;
}

export function createEmptyEditorHistoryState(): EditorHistoryState {
  return {
    undoStack: [],
    redoStack: [],
    lastTransactionMeta: null,
  };
}

export function applyEditorHistoryTransaction(
  history: EditorHistoryState,
  previous: EditorState,
  next: EditorState,
  options?: EditorTransactionOptions,
  now = Date.now(),
): EditorHistoryState {
  const canMerge =
    options?.mergeKey !== undefined &&
    history.lastTransactionMeta?.mergeKey === options.mergeKey &&
    now - history.lastTransactionMeta.timestamp < 1000;

  return {
    undoStack: canMerge ? history.undoStack : [...history.undoStack, previous],
    redoStack: [],
    lastTransactionMeta: options?.mergeKey ? { mergeKey: options.mergeKey, timestamp: now } : null,
  };
}

export function resetEditorHistoryGrouping(history: EditorHistoryState): EditorHistoryState {
  return {
    ...history,
    lastTransactionMeta: null,
  };
}

export function takeEditorUndoStep(
  history: EditorHistoryState,
  current: EditorState,
): { history: EditorHistoryState; nextState: EditorState } | null {
  if (history.undoStack.length === 0) {
    return null;
  }

  return {
    history: {
      undoStack: history.undoStack.slice(0, -1),
      redoStack: [...history.redoStack, current],
      lastTransactionMeta: null,
    },
    nextState: history.undoStack[history.undoStack.length - 1]!,
  };
}

export function takeEditorRedoStep(
  history: EditorHistoryState,
  current: EditorState,
): { history: EditorHistoryState; nextState: EditorState } | null {
  if (history.redoStack.length === 0) {
    return null;
  }

  return {
    history: {
      undoStack: [...history.undoStack, current],
      redoStack: history.redoStack.slice(0, -1),
      lastTransactionMeta: null,
    },
    nextState: history.redoStack[history.redoStack.length - 1]!,
  };
}
