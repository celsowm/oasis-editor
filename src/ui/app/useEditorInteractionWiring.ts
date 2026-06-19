import { getParagraphById, type EditorState } from "@/core/model.js";
import type { EditorLogger } from "@/utils/logger.js";
import { createEditorClipboardController } from "@/app/controllers/useEditorClipboard.js";
import { createEditorTableResize } from "@/app/controllers/useEditorTableResize.js";
import { createEditorTableDrag } from "@/app/controllers/useEditorTableDrag.js";
import { createEditorSurfaceEvents } from "@/app/controllers/useEditorSurfaceEvents.js";
import { createEditorTextInput } from "@/app/controllers/useEditorTextInput.js";
import { createEditorTextDrag } from "@/app/controllers/useEditorTextDrag.js";
import { createEditorNavigation } from "@/app/controllers/useEditorNavigation.js";
import { createEditorRevisionController } from "@/app/controllers/useEditorRevision.js";
import type { createEditorTableOperations } from "@/app/controllers/useEditorTableOperations.js";
import type { createEditorImageOperations } from "@/app/controllers/useEditorImageOperations.js";
import type { createEditorStyleController } from "@/app/controllers/useEditorStyle.js";

type TableDragParams = Parameters<typeof createEditorTableDrag>[0];
type TextDragParams = Parameters<typeof createEditorTextDrag>[0];
type NavigationParams = Parameters<typeof createEditorNavigation>[0];
type ClipboardParams = Parameters<typeof createEditorClipboardController>[0];

/**
 * Shared kernel + heavy operation controllers consumed by the interaction
 * (gesture / input / clipboard / navigation) cluster. The heavy controllers
 * (`tableOps`, `imageOps`, `styleController`) and the surface resolvers are
 * cross-cutting and stay owned by the composition root; this hook only wires
 * the pointer/keyboard interaction controllers on top of them.
 */
export interface EditorInteractionWiringContext {
  state: EditorState;
  applyState: NavigationParams["applyState"];
  applyTransactionalState: TextDragParams["applyTransactionalState"];
  isReadOnly: TextDragParams["isReadOnly"];
  logger: EditorLogger;
  focusInput: TableDragParams["focusInput"];
  focusInputAfterPointerSelection: TextDragParams["focusInputAfterPointerSelection"];
  clearPreferredColumn: TextDragParams["clearPreferredColumn"];
  resetTransactionGrouping: TextDragParams["resetTransactionGrouping"];
  surfaceRef: () => HTMLDivElement | undefined;
  viewportRef: () => HTMLDivElement | undefined;
  caretBox: NavigationParams["caretBox"];
  preferredColumnX: NavigationParams["preferredColumnX"];
  setPreferredColumnX: NavigationParams["setPreferredColumnX"];
  zoomFactor: NavigationParams["zoomFactor"];
  resolveSurfaceHitAtPoint: TextDragParams["resolveSurfaceHitAtPoint"];
  resolvePositionAtSurfacePoint: TableDragParams["resolvePositionAtSurfacePoint"];
  tableOps: ReturnType<typeof createEditorTableOperations>;
  imageOps: ReturnType<typeof createEditorImageOperations>;
  styleController: ReturnType<typeof createEditorStyleController>;
  getForcePlainTextPaste: () => boolean;
  setForcePlainTextPaste: (value: boolean) => void;
  insertImageFromFile: ClipboardParams["insertImageFromFile"];
}

export interface EditorInteractionWiring {
  tableResize: ReturnType<typeof createEditorTableResize>;
  tableDrag: ReturnType<typeof createEditorTableDrag>;
  revisionController: ReturnType<typeof createEditorRevisionController>;
  textDrag: ReturnType<typeof createEditorTextDrag>;
  surfaceEvents: ReturnType<typeof createEditorSurfaceEvents>;
  textInput: ReturnType<typeof createEditorTextInput>;
  navigation: ReturnType<typeof createEditorNavigation>;
  handleCopy: ReturnType<typeof createEditorClipboardController>["handleCopy"];
  handleCut: ReturnType<typeof createEditorClipboardController>["handleCut"];
  handlePaste: ReturnType<
    typeof createEditorClipboardController
  >["handlePaste"];
  handleDrop: ReturnType<typeof createEditorClipboardController>["handleDrop"];
}

export function useEditorInteractionWiring(
  ctx: EditorInteractionWiringContext,
): EditorInteractionWiring {
  const state = () => ctx.state;

  const tableResize = createEditorTableResize({
    state,
    applyTransactionalState: ctx.applyTransactionalState,
    surfaceRef: ctx.surfaceRef,
    viewportRef: ctx.viewportRef,
    zoomFactor: ctx.zoomFactor,
  });

  const tableDrag = createEditorTableDrag({
    state,
    applyTransactionalState: ctx.applyTransactionalState,
    resolvePositionAtSurfacePoint: ctx.resolvePositionAtSurfacePoint,
    focusInput: ctx.focusInput,
  });

  const revisionController = createEditorRevisionController({
    state,
    surfaceRef: () => ctx.surfaceRef() ?? null,
    zoomFactor: ctx.zoomFactor,
  });

  const textDrag = createEditorTextDrag({
    state,
    isReadOnly: ctx.isReadOnly,
    resolveSurfaceHitAtPoint: ctx.resolveSurfaceHitAtPoint,
    applyTransactionalState: ctx.applyTransactionalState,
    applyTableAwareParagraphEdit: ctx.tableOps.applyTableAwareParagraphEdit,
    clearPreferredColumn: ctx.clearPreferredColumn,
    resetTransactionGrouping: ctx.resetTransactionGrouping,
    focusInputAfterPointerSelection: ctx.focusInputAfterPointerSelection,
    logger: ctx.logger,
  });

  const surfaceEvents = createEditorSurfaceEvents({
    state,
    applyState: ctx.applyState,
    tableResize,
    imageOps: ctx.imageOps,
    clearPendingCaretTextStyle: ctx.styleController.clearPendingCaretTextStyle,
    clearPreferredColumn: ctx.clearPreferredColumn,
    resetTransactionGrouping: ctx.resetTransactionGrouping,
    focusInputAfterPointerSelection: ctx.focusInputAfterPointerSelection,
    resolveSurfaceHitAtPoint: ctx.resolveSurfaceHitAtPoint,
    getParagraphById,
    textDrag: {
      tryStartTextDrag: textDrag.tryStartTextDrag,
    },
    logger: ctx.logger,
  });

  const textInput = createEditorTextInput({
    state,
    isReadOnly: ctx.isReadOnly,
    logger: ctx.logger,
    clearPreferredColumn: ctx.clearPreferredColumn,
    pendingCaretTextStyle: ctx.styleController.pendingCaretTextStyle,
    applyTransactionalState: ctx.applyTransactionalState,
    applyTableAwareParagraphEdit: ctx.tableOps.applyTableAwareParagraphEdit,
    focusInput: ctx.focusInput,
  });

  const navigation = createEditorNavigation({
    state,
    applyState: ctx.applyState,
    applyTransactionalState: ctx.applyTransactionalState,
    surfaceRef: () => ctx.surfaceRef() ?? null,
    caretBox: ctx.caretBox,
    preferredColumnX: ctx.preferredColumnX,
    setPreferredColumnX: ctx.setPreferredColumnX,
    clearPreferredColumn: ctx.clearPreferredColumn,
    resetTransactionGrouping: ctx.resetTransactionGrouping,
    focusInput: ctx.focusInput,
    zoomFactor: ctx.zoomFactor,
  });

  const { handleCopy, handleCut, handlePaste, handleDrop } =
    createEditorClipboardController({
      state,
      isReadOnly: ctx.isReadOnly,
      forcePlainTextPaste: ctx.getForcePlainTextPaste,
      setForcePlainTextPaste: ctx.setForcePlainTextPaste,
      clearPreferredColumn: ctx.clearPreferredColumn,
      resetTransactionGrouping: ctx.resetTransactionGrouping,
      applyTransactionalState: ctx.applyTransactionalState,
      applyTableAwareParagraphEdit: ctx.tableOps.applyTableAwareParagraphEdit,
      focusInput: ctx.focusInput,
      insertImageFromFile: ctx.insertImageFromFile,
      resolvePositionAtSurfacePoint: ctx.resolvePositionAtSurfacePoint,
    });

  return {
    tableResize,
    tableDrag,
    revisionController,
    textDrag,
    surfaceEvents,
    textInput,
    navigation,
    handleCopy,
    handleCut,
    handlePaste,
    handleDrop,
  };
}
