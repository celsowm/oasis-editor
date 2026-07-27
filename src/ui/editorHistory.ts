import type { EditorState } from "@/core/model.js";
import type { MergeKey } from "@/core/transactionMergeKeys.js";

export interface EditorTransactionOptions {
  mergeKey?: MergeKey;
}

export interface EditorTransactionMeta {
  mergeKey: MergeKey;
  timestamp: number;
}

export interface EditorHistoryState {
  undoStack: EditorState[];
  redoStack: EditorState[];
  lastTransactionMeta: EditorTransactionMeta | null;
}

export const MAX_EDITOR_HISTORY_ENTRIES = 250;

export function appendEditorHistoryEntry(
  stack: EditorState[],
  state: EditorState,
): EditorState[] {
  const retained = Math.max(0, MAX_EDITOR_HISTORY_ENTRIES - 1);
  const start = Math.max(0, stack.length - retained);
  return [...stack.slice(start), state];
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
    undoStack: canMerge
      ? history.undoStack
      : appendEditorHistoryEntry(history.undoStack, previous),
    redoStack: [],
    lastTransactionMeta: options?.mergeKey
      ? { mergeKey: options.mergeKey, timestamp: now }
      : null,
  };
}

export function resetEditorHistoryGrouping(
  history: EditorHistoryState,
): EditorHistoryState {
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
      redoStack: appendEditorHistoryEntry(history.redoStack, current),
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
      undoStack: appendEditorHistoryEntry(history.undoStack, current),
      redoStack: history.redoStack.slice(0, -1),
      lastTransactionMeta: null,
    },
    nextState: history.redoStack[history.redoStack.length - 1]!,
  };
}
