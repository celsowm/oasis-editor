import { getSelectedImageRun } from "@/core/commands/image.js";
import { getSelectedTextBoxRun } from "@/core/commands/textBox.js";
import { cloneEditorState } from "@/core/cloneState.js";
import type { EditorPosition, EditorState } from "@/core/model.js";
import type { EditorLogger } from "@/utils/logger.js";
import { createEditorTableOperations } from "@/app/controllers/useEditorTableOperations.js";
import { createEditorImageOperations } from "@/app/controllers/useEditorImageOperations.js";
import { createEditorTextBoxOperations } from "@/app/controllers/useEditorTextBoxOperations.js";
import { createEditorStyleController } from "@/app/controllers/useEditorStyle.js";
import { useEditorFindReplace } from "@/app/controllers/useEditorFindReplace.js";
import type { createEditorCommandsController } from "@/app/controllers/EditorCommandsController.js";
import { createCanvasSurfaceHitResolver } from "./useCanvasSurfaceHitResolver.js";
import { createEditorLayoutOptionsController } from "./createEditorLayoutOptionsController.js";
import { useEditorInteractionWiring } from "./useEditorInteractionWiring.js";
import type { createEditorDocumentRuntime } from "./createEditorDocumentRuntime.js";

type DocRuntime = ReturnType<typeof createEditorDocumentRuntime>;
type CommandsController = ReturnType<typeof createEditorCommandsController>;

export interface EditorInteractionRuntimeDeps {
  state: EditorState;
  logger: EditorLogger;
  isReadOnly: () => boolean;
  applyState: (next: EditorState) => void;
  cloneState: (state: EditorState) => EditorState;
  focusInput: () => void;
  focusInputAfterPointerSelection: () => void;
  surfaceRef: () => HTMLDivElement | undefined;
  viewportRef: () => HTMLDivElement | undefined;
  zoomFactor: () => number;
  insertImageFromFile: DocRuntime["docIO"]["insertImageFromFile"];
  getForcePlainTextPaste: () => boolean;
  setForcePlainTextPaste: (value: boolean) => void;
  /** Back-edge to the command runtime (phase C); read lazily at command time. */
  getCommandsController: () => CommandsController;
  applyTransactionalState: DocRuntime["applyTransactionalState"];
  clearPreferredColumn: DocRuntime["clearPreferredColumn"];
  resetTransactionGrouping: DocRuntime["resetTransactionGrouping"];
  updateHistoryState: DocRuntime["updateHistoryState"];
  caretBox: DocRuntime["caretBox"];
  preferredColumnX: DocRuntime["preferredColumnX"];
  setPreferredColumnX: DocRuntime["setPreferredColumnX"];
  measuredBlockHeights: DocRuntime["measuredBlockHeights"];
  measuredParagraphLayouts: DocRuntime["measuredParagraphLayouts"];
}

/**
 * Phase B of the editor runtime: selection queries, the hit resolver, find &
 * replace, the table/image/text-box operations, the style controller and the
 * interaction-wiring cluster (gesture / input / clipboard / navigation). Runs
 * synchronously after the document runtime, preserving the original creation
 * order. The only forward cross-phase edge — style controller -> commands — is
 * read lazily via getCommandsController. Extracted from `OasisEditorApp` (S1).
 */
export function createEditorInteractionRuntime(
  deps: EditorInteractionRuntimeDeps,
) {
  const {
    state,
    logger,
    isReadOnly,
    applyState,
    cloneState,
    focusInput,
    focusInputAfterPointerSelection,
    surfaceRef,
    viewportRef,
    zoomFactor,
    insertImageFromFile,
    getForcePlainTextPaste,
    setForcePlainTextPaste,
    getCommandsController,
    applyTransactionalState,
    clearPreferredColumn,
    resetTransactionGrouping,
    updateHistoryState,
    caretBox,
    preferredColumnX,
    setPreferredColumnX,
    measuredBlockHeights,
    measuredParagraphLayouts,
  } = deps;

  const selectedImageRun = () => getSelectedImageRun(state);
  const selectedTextBoxRun = () => getSelectedTextBoxRun(state);

  const layoutOptionsOverlay = createEditorLayoutOptionsController({
    state: () => state,
    resetTransactionGrouping,
    applyTransactionalState,
    focusInput,
  });

  const canvasHitResolver = createCanvasSurfaceHitResolver({
    state: () => state,
    surfaceRef: () => surfaceRef() ?? null,
    viewportRef: () => viewportRef() ?? null,
    measuredBlockHeights,
    measuredParagraphLayouts,
    zoomFactor,
  });
  const resolveSurfaceHitAtPoint = canvasHitResolver.resolveSurfaceHitAtPoint;

  const fr = useEditorFindReplace({
    state,
    applyState,
    applyTransactionalState,
    focusInput,
  });

  const tableOps = createEditorTableOperations({
    applyTransactionalState,
    applySelectionToStatePreservingStructure: (current, nextSelection) => ({
      ...current,
      document: cloneEditorState(current).document,
      selection: nextSelection,
    }),
    focusInput,
    logger,
  });

  const resolvePositionAtSurfacePoint = (
    clientX: number,
    clientY: number,
  ): EditorPosition | null => {
    return resolveSurfaceHitAtPoint(clientX, clientY)?.position ?? null;
  };

  const imageOps = createEditorImageOperations({
    state,
    surfaceRef,
    resolvePositionAtSurfacePoint,
    applyState,
    applyTransactionalState,
    updateHistoryState,
    focusInput,
    focusInputAfterPointerSelection,
    cloneState,
    logger,
    zoomFactor,
  });

  const textBoxOps = createEditorTextBoxOperations({
    state,
    surfaceRef,
    applyState,
    updateHistoryState,
    focusInput,
    cloneState,
    logger,
    zoomFactor,
  });

  const styleController = createEditorStyleController({
    state: () => state,
    commandsController: getCommandsController,
    clearPreferredColumn,
    resetTransactionGrouping,
    focusInput,
    logger,
  });

  const wiring = useEditorInteractionWiring({
    state,
    applyState,
    applyTransactionalState,
    isReadOnly,
    logger,
    focusInput,
    focusInputAfterPointerSelection,
    clearPreferredColumn,
    resetTransactionGrouping,
    surfaceRef,
    viewportRef,
    caretBox: () => caretBox(),
    preferredColumnX: () => preferredColumnX(),
    setPreferredColumnX,
    zoomFactor,
    resolveSurfaceHitAtPoint,
    resolvePositionAtSurfacePoint,
    tableOps,
    imageOps,
    styleController,
    getForcePlainTextPaste,
    setForcePlainTextPaste,
    insertImageFromFile,
  });

  const onEditorMouseDown = (event: MouseEvent) => {
    // Preserve the current selection on right-click so the user can copy/cut
    // from the selected text via the context menu.
    if (event.button !== 0) {
      return;
    }
    styleController.clearPendingCaretTextStyle();
    event.preventDefault();
    focusInput();
  };

  return {
    selectedImageRun,
    selectedTextBoxRun,
    layoutOptionsOverlay,
    fr,
    resolveSurfaceHitAtPoint,
    resolvePositionAtSurfacePoint,
    tableOps,
    imageOps,
    textBoxOps,
    styleController,
    onEditorMouseDown,
    tableResize: wiring.tableResize,
    tableDrag: wiring.tableDrag,
    revisionController: wiring.revisionController,
    textDrag: wiring.textDrag,
    surfaceEventsWithTextDrag: wiring.surfaceEvents,
    textInput: wiring.textInput,
    navigation: wiring.navigation,
    handleCopy: wiring.handleCopy,
    handleCut: wiring.handleCut,
    handlePaste: wiring.handlePaste,
    handleDrop: wiring.handleDrop,
  };
}
