import type { Accessor } from "solid-js";
import type { 
  EditorState, 
} from "../../core/model.js";
import { 
  isSelectionCollapsed, 
  normalizeSelection 
} from "../../core/selection.js";
import { 
  findParagraphTableLocation, 
  getActiveSectionIndex 
} from "../../core/model.js";
import type { EditorToolbarCtx } from "../../ui/components/Toolbar/types.js";
import type { createEditorCommandsController } from "./EditorCommandsController.js";
import type { createEditorTableOperations } from "./useEditorTableOperations.js";
import type { createEditorStyleController } from "./useEditorStyle.js";
import type { createEditorDocumentIO } from "./useEditorDocumentIO.js";
import type { createEditorHistoryActions } from "./useEditorHistoryActions.js";

export interface UseEditorToolbarProps {
  state: () => EditorState;
  undoStack: Accessor<EditorState[]>;
  redoStack: Accessor<EditorState[]>;
  persistenceStatus: Accessor<string>;
  importInputRef: () => HTMLInputElement | undefined;
  imageInputRef: () => HTMLInputElement | undefined;
  styleController: ReturnType<typeof createEditorStyleController>;
  commandsController: ReturnType<typeof createEditorCommandsController>;
  tableOps: ReturnType<typeof createEditorTableOperations>;
  docIO: ReturnType<typeof createEditorDocumentIO>;
  historyActions: ReturnType<typeof createEditorHistoryActions>;
  selectionBoxes: Accessor<any[]>;
  selectedImageRun: () => any;
  toggleFindReplace: (open?: boolean) => void;
  focusInput: () => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (producer: (current: EditorState) => EditorState, options?: any) => void;
  logger: { info: (msg: string, payload?: any) => void };
}

export function createEditorToolbarController(deps: UseEditorToolbarProps) {
  const tableSelectionLabel = (): string | null => {
    const state = deps.state();
    const normalized = normalizeSelection(state);
    if (normalized.isCollapsed) {
      return null;
    }

    const anchorLocation = findParagraphTableLocation(
      state.document,
      state.selection.anchor.paragraphId,
      getActiveSectionIndex(state),
    );
    const focusLocation = findParagraphTableLocation(
      state.document,
      state.selection.focus.paragraphId,
      getActiveSectionIndex(state),
    );
    if (
      !anchorLocation ||
      !focusLocation ||
      anchorLocation.blockIndex !== focusLocation.blockIndex ||
      (anchorLocation.rowIndex === focusLocation.rowIndex &&
        anchorLocation.cellIndex === focusLocation.cellIndex)
    ) {
      return null;
    }

    const count = deps.selectionBoxes().length;
    if (count === 0) {
      return null;
    }

    return `Table selection: ${count} cell${count === 1 ? "" : "s"}`;
  };

  const isInsideTable = (): boolean => {
    return !!findParagraphTableLocation(
      deps.state().document,
      deps.state().selection.focus.paragraphId,
      getActiveSectionIndex(deps.state()),
    );
  };

  const toolbarCtx = {
    state: deps.state,
    undoStack: deps.undoStack,
    redoStack: deps.redoStack,
    persistenceStatus: deps.persistenceStatus,
    importInputRef: deps.importInputRef,
    imageInputRef: deps.imageInputRef,
    toolbarStyleState: deps.styleController.toolbarStyleState,
    selectionCollapsed: () => isSelectionCollapsed(deps.state().selection),
    selectedImageRun: deps.selectedImageRun,
    tableSelectionLabel,
    tableActionRestrictionLabel: deps.tableOps.tableActionRestrictionLabel,
    isInsideTable,
    handleExportDocx: deps.docIO.handleExportDocx,
    handleExportPdf: deps.docIO.handleExportPdf,
    toggleFindReplace: deps.toggleFindReplace,
    performUndo: deps.historyActions.performUndo,
    performRedo: deps.historyActions.performRedo,
    focusInput: deps.focusInput,
    debugToolbarEvent: (control: string, eventName: string, payload?: unknown) => {
      deps.logger.info(`toolbar:${control}:${eventName}`, payload);
    },
    clearPreferredColumn: deps.clearPreferredColumn,
    resetTransactionGrouping: deps.resetTransactionGrouping,
    applyTransactionalState: deps.applyTransactionalState,
    applyTableAwareParagraphEdit: deps.tableOps.applyTableAwareParagraphEdit,
    ...deps.commandsController,
    applyBooleanStyleCommand: deps.styleController.applyToolbarBooleanStyleCommand,
    applyValueStyleCommand: deps.styleController.applyToolbarValueStyleCommand,
    canMergeSelectedTable: deps.tableOps.canMergeSelectedTable,
    canMergeSelectedTableCells: deps.tableOps.canMergeSelectedTableCells,
    canMergeSelectedTableRows: deps.tableOps.canMergeSelectedTableRows,
    canSplitSelectedTable: deps.tableOps.canSplitSelectedTable,
    canSplitSelectedTableCell: deps.tableOps.canSplitSelectedTableCell,
    canSplitSelectedTableCellVertically:
      deps.tableOps.canSplitSelectedTableCellVertically,
    canEditSelectedTableColumn: deps.tableOps.canEditSelectedTableColumn,
    canEditSelectedTableRow: deps.tableOps.canEditSelectedTableRow,
    mergeSelectedTable: (current: EditorState) => {
      const result = deps.tableOps.mergeSelectedTable(current);
      if (result !== current) deps.logger.info("tableOp:mergeSelectedTable");
      return result;
    },
    mergeSelectedTableCells: (current: EditorState) => {
      const result = deps.tableOps.mergeSelectedTableCells(current);
      if (result !== current) deps.logger.info("tableOp:mergeSelectedTableCells");
      return result;
    },
    mergeSelectedTableRows: (current: EditorState) => {
      const result = deps.tableOps.mergeSelectedTableRows(current);
      if (result !== current) deps.logger.info("tableOp:mergeSelectedTableRows");
      return result;
    },
    splitSelectedTable: (current: EditorState) => {
      const result = deps.tableOps.splitSelectedTable(current);
      if (result !== current) deps.logger.info("tableOp:splitSelectedTable");
      return result;
    },
    splitSelectedTableCell: (current: EditorState) => {
      const result = deps.tableOps.splitSelectedTableCell(current);
      if (result !== current) deps.logger.info("tableOp:splitSelectedTableCell");
      return result;
    },
    splitSelectedTableCellVertically: (current: EditorState) => {
      const result = deps.tableOps.splitSelectedTableCellVertically(current);
      if (result !== current)
        deps.logger.info("tableOp:splitSelectedTableCellVertically");
      return result;
    },
    insertSelectedTableColumn: (current: EditorState, direction: -1 | 1) => {
      const result = deps.tableOps.insertSelectedTableColumn(current, direction);
      if (result !== current)
        deps.logger.info(`tableOp:insertSelectedTableColumn dir=${direction}`);
      return result;
    },
    insertSelectedTableRow: (current: EditorState, direction: -1 | 1) => {
      const result = deps.tableOps.insertSelectedTableRow(current, direction);
      if (result !== current)
        deps.logger.info(`tableOp:insertSelectedTableRow dir=${direction}`);
      return result;
    },
    deleteSelectedTableColumn: (current: EditorState) => {
      const result = deps.tableOps.deleteSelectedTableColumn(current);
      if (result !== current) deps.logger.info("tableOp:deleteSelectedTableColumn");
      return result;
    },
    deleteSelectedTableRow: (current: EditorState) => {
      const result = deps.tableOps.deleteSelectedTableRow(current);
      if (result !== current) deps.logger.info("tableOp:deleteSelectedTableRow");
      return result;
    },
    insertTableCommand: deps.tableOps.insertTableCommand,
  } as unknown as EditorToolbarCtx;

  return {
    toolbarCtx,
    tableSelectionLabel,
    isInsideTable,
  };
}
