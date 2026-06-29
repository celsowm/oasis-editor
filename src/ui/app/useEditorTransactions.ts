import { createSignal } from "solid-js";
import type { EditorState } from "@/core/model.js";
import {
  applyEditorHistoryTransaction,
  createEmptyEditorHistoryState,
  resetEditorHistoryGrouping,
  type EditorHistoryState,
  type EditorTransactionOptions,
} from "@/ui/editorHistory.js";
import { computeLayoutInvalidationFromTransaction } from "@/ui/layoutInvalidation.js";
import type { LayoutInvalidation } from "@/app/controllers/useEditorLayout.js";
import { perfTimer } from "@/utils/performanceMetrics.js";

export interface EditorTransactionsContext {
  stateSnapshot: () => EditorState;
  commitState: (state: EditorState) => void;
  cloneState: (state: EditorState) => EditorState;
  applyLayoutInvalidation: (invalidation: LayoutInvalidation) => void;
}

export function useEditorTransactions(ctx: EditorTransactionsContext) {
  const [undoStack, setUndoStack] = createSignal<EditorState[]>([]);
  const [redoStack, setRedoStack] = createSignal<EditorState[]>([]);
  let historyState = createEmptyEditorHistoryState();

  const syncHistorySignals = (): void => {
    setUndoStack(historyState.undoStack);
    setRedoStack(historyState.redoStack);
  };

  const updateHistoryState = (
    updater: (current: EditorHistoryState) => EditorHistoryState,
  ): void => {
    historyState = updater(historyState);
    syncHistorySignals();
  };

  const applyHistoryState = (nextState: EditorState): void => {
    ctx.commitState(ctx.cloneState(nextState));
  };

  const resetTransactionGrouping = (): void => {
    historyState = resetEditorHistoryGrouping(historyState);
  };

  const clearHistory = (): void => {
    historyState = createEmptyEditorHistoryState();
    syncHistorySignals();
  };

  const applyTransactionalState = (
    producer: (current: EditorState) => EditorState,
    options?: EditorTransactionOptions,
  ): void => {
    const prev = ctx.stateSnapshot();
    const next = perfTimer("txn:produce", (): EditorState => producer(prev), 0);
    if (next === prev) {
      return;
    }

    historyState = applyEditorHistoryTransaction(
      historyState,
      prev,
      next,
      options,
    );
    syncHistorySignals();

    const invalidation = perfTimer(
      "txn:invalidate",
      (): LayoutInvalidation => computeLayoutInvalidationFromTransaction(prev, next),
      0,
    );
    ctx.applyLayoutInvalidation(invalidation);

    perfTimer("txn:setState", (): void => ctx.commitState(next), 0);
  };

  return {
    undoStack,
    redoStack,
    applyTransactionalState,
    applyHistoryState,
    resetTransactionGrouping,
    updateHistoryState,
    getHistoryState: (): EditorHistoryState => historyState,
    clearHistory,
  };
}
