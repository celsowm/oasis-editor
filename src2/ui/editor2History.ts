import type { Editor2State } from "../core/model.js";

export interface Editor2TransactionOptions {
  mergeKey?: string;
}

export interface Editor2TransactionMeta {
  mergeKey: string;
  timestamp: number;
}

export interface Editor2HistoryState {
  undoStack: Editor2State[];
  redoStack: Editor2State[];
  lastTransactionMeta: Editor2TransactionMeta | null;
}

export function createEmptyEditor2HistoryState(): Editor2HistoryState {
  return {
    undoStack: [],
    redoStack: [],
    lastTransactionMeta: null,
  };
}

export function applyEditor2HistoryTransaction(
  history: Editor2HistoryState,
  previous: Editor2State,
  next: Editor2State,
  options?: Editor2TransactionOptions,
  now = Date.now(),
): Editor2HistoryState {
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

export function resetEditor2HistoryGrouping(history: Editor2HistoryState): Editor2HistoryState {
  return {
    ...history,
    lastTransactionMeta: null,
  };
}

export function takeEditor2UndoStep(
  history: Editor2HistoryState,
  current: Editor2State,
): { history: Editor2HistoryState; nextState: Editor2State } | null {
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

export function takeEditor2RedoStep(
  history: Editor2HistoryState,
  current: Editor2State,
): { history: Editor2HistoryState; nextState: Editor2State } | null {
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
