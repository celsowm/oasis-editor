import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import { type EditorState } from "@/core/model.js";
import { insertTableAtSelection } from "@/core/commands/table.js";
import type { EditorLogger } from "@/utils/logger.js";
import {
  findCellAtVisualColumn,
  findFirstNavigableParagraphInTable,
  getRowVisualWidth,
  getTableVisualWidth,
  resolveAdjacentTableCellPosition,
} from "./tableOpsSelectionNavigation.js";
import {
  applyTableAwareParagraphEdit as applyTableAwareParagraphEditInternal,
  getTableOperationTargetBlocks,
  updateBlocksInCurrentSection,
} from "./tableOpsMutationCommands.js";
import { createTableOpsGuards } from "./tableOpsGuards.js";
import { createTableSelectionResolvers } from "./tableOpsSelectionRanges.js";
import { createTableCellSpanOperations } from "./tableOpsCellSpanCommands.js";
import { createTableRowColumnOperations } from "./tableOpsRowColumnCommands.js";
import { createTableSelectionAwareCommands } from "./tableOpsSelectionAwareCommands.js";

export interface EditorTableOperationsDeps {
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  applySelectionToStatePreservingStructure: (
    current: EditorState,
    nextSelection: EditorState["selection"],
  ) => EditorState;
  focusInput: () => void;
  logger?: EditorLogger;
}

export function createEditorTableOperations(
  deps: EditorTableOperationsDeps,
): ReturnType<typeof createEditorTableOperationsImpl> {
  return createEditorTableOperationsImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEditorTableOperationsImpl(deps: EditorTableOperationsDeps) {
  const getTargetBlocks = getTableOperationTargetBlocks;

  const {
    resolveTableCellRangeSelection,
    resolveSelectedTableCells,
    resolveHorizontalTableCellRange,
    resolveVerticalTableCellRange,
  } = createTableSelectionResolvers({
    getTargetBlocks,
    logger: deps.logger,
  });

  const {
    canMergeSelectedTableCells,
    canSplitSelectedTableCell,
    canMergeSelectedTableRows,
    canMergeSelectedTable,
    canSplitSelectedTableCellVertically,
    canSplitSelectedTable,
    canEditSelectedTableRow,
    canEditSelectedTableColumn,
  } = createTableOpsGuards({
    getTargetBlocks,
    resolveHorizontalTableCellRange,
    resolveVerticalTableCellRange,
  });

  const {
    mergeSelectedTableCells,
    mergeSelectedTableRows,
    mergeSelectedTable,
    splitSelectedTableCellVertically,
    splitSelectedTableCell,
    splitSelectedTable,
  } = createTableCellSpanOperations({
    getTargetBlocks,
    resolveHorizontalTableCellRange,
    resolveVerticalTableCellRange,
    canMergeSelectedTableCells,
    canMergeSelectedTableRows,
    canSplitSelectedTableCell,
    canSplitSelectedTableCellVertically,
  });

  const {
    insertSelectedTableRow,
    deleteSelectedTableRow,
    insertSelectedTableColumn,
    deleteSelectedTableColumn,
  } = createTableRowColumnOperations({
    getTargetBlocks,
  });

  const applyTableAwareParagraphEdit = (
    current: EditorState,
    edit: (tempState: EditorState) => EditorState,
  ): EditorState =>
    applyTableAwareParagraphEditInternal(current, getTargetBlocks, edit);

  const {
    withExpandedTableCellSelection,
    applySelectionAwareTextCommand,
    applySelectionAwareParagraphCommand,
  } = createTableSelectionAwareCommands({
    applyTransactionalState: deps.applyTransactionalState,
    applySelectionToStatePreservingStructure:
      deps.applySelectionToStatePreservingStructure,
    getTargetBlocks,
    resolveTableCellRangeSelection,
    resolveSelectedTableCells,
    logger: deps.logger,
  });

  const insertTableCommand = (rows: number, cols: number): void => {
    deps.logger?.info(`insertTableCommand: ${rows}x${cols}`);
    deps.applyTransactionalState(
      (current): EditorState => insertTableAtSelection(current, rows, cols),
      {
        mergeKey: MERGE_KEYS.insertTable,
      },
    );
    deps.focusInput();
  };

  return {
    resolveTableCellRangeSelection,
    resolveHorizontalTableCellRange,
    resolveVerticalTableCellRange,
    canMergeSelectedTableCells,
    canSplitSelectedTableCell,
    canMergeSelectedTableRows,
    canMergeSelectedTable,
    canSplitSelectedTableCellVertically,
    canSplitSelectedTable,
    canEditSelectedTableRow,
    canEditSelectedTableColumn,
    mergeSelectedTableCells,
    mergeSelectedTableRows,
    mergeSelectedTable,
    splitSelectedTableCellVertically,
    splitSelectedTableCell,
    splitSelectedTable,
    insertSelectedTableRow,
    deleteSelectedTableRow,
    insertSelectedTableColumn,
    deleteSelectedTableColumn,
    getRowVisualWidth,
    getTableVisualWidth,
    findCellAtVisualColumn,
    findFirstNavigableParagraphInTable,
    updateBlocksInCurrentSection,
    resolveAdjacentTableCellPosition,
    applyTableAwareParagraphEdit,
    withExpandedTableCellSelection,
    applySelectionAwareTextCommand,
    applySelectionAwareParagraphCommand,
    insertTableCommand,
  };
}
