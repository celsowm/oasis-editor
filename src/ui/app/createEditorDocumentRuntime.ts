import type { EditorState } from "@/core/model.js";
import type { EditorLogger } from "@/utils/logger.js";
import type { OasisEditorClientController } from "@/app/client/OasisEditorClient.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { createEditorDocumentIO } from "@/app/controllers/useEditorDocumentIO.js";
import { useEditorLayout } from "@/app/controllers/useEditorLayout.js";
import { useEditorPersistence } from "@/app/controllers/useEditorPersistence.js";
import { createEditorHistoryActions } from "@/app/controllers/useEditorHistoryActions.js";
import type { createEditorImageOperations } from "@/app/controllers/useEditorImageOperations.js";
import { createIndexedDbPersistence } from "@/app/services/indexedDbPersistence.js";
import { bumpLayoutMetricsEpoch } from "@/layoutProjection/index.js";
import { useEditorTransactions } from "./useEditorTransactions.js";
import { createEditorChangeBroadcast } from "./createEditorChangeBroadcast.js";
import type { OasisEditorAppDocumentProps } from "../OasisEditorAppProps.js";

type EditorImageOperations = ReturnType<typeof createEditorImageOperations>;

export interface EditorDocumentRuntimeDeps {
  documentOptions: () => OasisEditorAppDocumentProps;
  logger: EditorLogger;
  runtimeClient: OasisEditorClientController;
  /**
   * Document state, created by the app before this runtime so its store signal
   * keeps its original creation position (no signal reordering).
   */
  state: EditorState;
  commitState: (next: EditorState) => void;
  getStateSnapshot: () => EditorState;
  applyState: (next: EditorState) => void;
  cloneState: (state: EditorState) => EditorState;
  isReadOnly: () => boolean;
  focusInput: () => void;
  surfaceRef: () => HTMLDivElement | undefined;
  viewportRef: () => HTMLDivElement | undefined;
  zoomFactor: () => number;
  /**
   * Back-edge to the interaction runtime: history's image-move actions read the
   * image operations, which are created after this runtime. Read lazily so the
   * synchronous creation order is preserved (the getter is only invoked at
   * command time). [[i1-controller-ports]]
   */
  getImageOps: () => EditorImageOperations;
}

/**
 * Phase A of the editor runtime: document state, IO, layout measurement,
 * persistence, the transaction/history machinery and the change-broadcast
 * effect. Runs synchronously within the component owner, in the original
 * creation order, so every signal/effect stays bound exactly as before.
 * Extracted from `OasisEditorApp` (S1).
 */
export function createEditorDocumentRuntime(
  deps: EditorDocumentRuntimeDeps,
): ReturnType<typeof createEditorDocumentRuntimeImpl> {
  return createEditorDocumentRuntimeImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEditorDocumentRuntimeImpl(deps: EditorDocumentRuntimeDeps) {
  const {
    documentOptions,
    logger,
    runtimeClient,
    state,
    commitState,
    getStateSnapshot,
    applyState,
    cloneState,
    isReadOnly,
    focusInput,
    surfaceRef,
    viewportRef,
    zoomFactor,
    getImageOps,
  } = deps;

  const docIO = createEditorDocumentIO({
    state: (): EditorState => state,
    applyState,
    applyTransactionalState: (producer, options): void =>
      applyTransactionalState(producer, options),
    isReadOnly,
    surfaceRef: (): HTMLDivElement | null => surfaceRef() ?? null,
    stabilizeLayoutAfterImport: async (): Promise<void> => {
      await stabilizeLayoutAfterImport();
    },
    resetEditorChromeState: (): void => resetEditorChromeState(),
    focusInput,
    logger,
  });
  const isImportInProgress = (): boolean =>
    docIO.importProgress()?.phase !== "done" &&
    docIO.importProgress()?.phase !== "error" &&
    docIO.importProgress() !== null;

  const {
    measuredBlockHeights,
    measuredParagraphLayouts,
    documentLayout,
    canvasSnapshotProvider,
    inputBox,
    selectionBoxes,
    commentHighlights,
    selectedImageBox,
    selectedTextBoxBox,
    caretBox,
    preferredColumnX,
    setPreferredColumnX,
    clearPreferredColumn,
    stabilizeLayoutAfterImport,
    setMeasuredBlockHeights,
    setMeasuredParagraphLayouts,
    applyInvalidation: applyLayoutInvalidation,
    onCleanupHook,
  } = useEditorLayout({
    state,
    surfaceRef,
    viewportRef,
    isImporting: isImportInProgress,
    zoomFactor,
  });

  // Default persistence is created once per editor instance, keyed so two
  // editors on the same page never share IndexedDB storage. The connection
  // stays lazy until the first save/load.
  const fallbackPersistence = createIndexedDbPersistence({
    key: documentOptions().persistenceKey,
  });

  const { status: persistenceStatus } = useEditorPersistence(
    state,
    (loadedDoc): void => {
      logger.info("persistence:loaded", { docId: loadedDoc.id });
      const nextState = createEditorStateFromDocument(loadedDoc);
      commitState(nextState);
      resetEditorChromeState();
    },
    {
      enabled: documentOptions().persistenceEnabled ?? false,
      persistence: documentOptions().persistence ?? fallbackPersistence,
      logger,
    },
  );

  const transactions = useEditorTransactions({
    stateSnapshot: getStateSnapshot,
    commitState,
    cloneState,
    applyLayoutInvalidation,
  });
  const {
    undoStack,
    redoStack,
    applyTransactionalState,
    applyHistoryState,
    resetTransactionGrouping,
    updateHistoryState,
    getHistoryState,
    clearHistory,
  } = transactions;

  const historyActions = createEditorHistoryActions({
    state: (): EditorState => state,
    stateSnapshot: getStateSnapshot,
    applyHistoryState,
    applyTransactionalState,
    focusInput,
    clearPreferredColumn,
    imageOps: getImageOps,
    updateHistoryState,
    getHistoryState,
  });

  const resetEditorChromeState = (): void => {
    clearPreferredColumn();
    setMeasuredBlockHeights({});
    setMeasuredParagraphLayouts({});
    bumpLayoutMetricsEpoch();
    canvasSnapshotProvider.clear();
    clearHistory();
  };

  createEditorChangeBroadcast({
    state: state as EditorState,
    isImportInProgress,
    cloneState,
    getStateSnapshot,
    getOnStateChange: () => documentOptions().onStateChange,
    emit: runtimeClient.emit,
  });

  return {
    docIO,
    isImportInProgress,
    measuredBlockHeights,
    measuredParagraphLayouts,
    documentLayout,
    canvasSnapshotProvider,
    inputBox,
    selectionBoxes,
    commentHighlights,
    selectedImageBox,
    selectedTextBoxBox,
    caretBox,
    preferredColumnX,
    setPreferredColumnX,
    clearPreferredColumn,
    stabilizeLayoutAfterImport,
    setMeasuredBlockHeights,
    setMeasuredParagraphLayouts,
    applyLayoutInvalidation,
    onCleanupHook,
    fallbackPersistence,
    persistenceStatus,
    undoStack,
    redoStack,
    applyTransactionalState,
    applyHistoryState,
    resetTransactionGrouping,
    updateHistoryState,
    getHistoryState,
    clearHistory,
    historyActions,
    resetEditorChromeState,
  };
}
