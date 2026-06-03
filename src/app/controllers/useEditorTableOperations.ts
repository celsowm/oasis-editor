import {
  getActiveSectionIndex,
  getDocumentSectionsCanonical,
  type EditorBlockNode,
  type EditorDocument,
  type EditorLayoutParagraph,
  type EditorParagraphListStyle,
  type EditorParagraphStyle,
  type EditorPosition,
  type EditorState,
  type EditorEditingZone,
} from "../../core/model.js";
import { normalizeSelection } from "../../core/selection.js";
import { insertTableAtSelection } from "../../core/editorCommands.js";
import type { EditorLogger } from "../../utils/logger.js";
import {
  findCellAtVisualColumn,
  findFirstNavigableParagraphInTable,
  getRowVisualWidth,
  getTableVisualWidth,
  resolveAdjacentTableCellPosition,
} from "./tableOpsSelectionNavigation.js";
import {
  applyTableAwareParagraphEdit as applyTableAwareParagraphEditInternal,
  updateBlocksInCurrentSection,
} from "./tableOpsMutationCommands.js";
import {
  createTableOpsGuards,
} from "./tableOpsGuards.js";
import { createTableSelectionResolvers } from "./tableOpsSelectionRanges.js";
import { createTableCellSpanOperations } from "./tableOpsCellSpanCommands.js";
import { createTableRowColumnOperations } from "./tableOpsRowColumnCommands.js";
import { createTableSelectionAwareCommands } from "./tableOpsSelectionAwareCommands.js";

export interface EditorTableOperationsDeps {
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: string },
  ) => void;
  applySelectionToStatePreservingStructure: (
    current: EditorState,
    nextSelection: EditorState["selection"],
  ) => EditorState;
  focusInput: () => void;
  logger?: EditorLogger;
}

export function createEditorTableOperations(deps: EditorTableOperationsDeps) {
  const getTargetBlocks = (state: EditorState, zone: EditorEditingZone): EditorBlockNode[] => {
    const sections = getDocumentSectionsCanonical(state.document);
    const activeSectionIndex = getActiveSectionIndex(state);
    const section = sections[Math.max(0, Math.min(activeSectionIndex, sections.length - 1))];
    if (!section) {
      return [];
    }
    if (zone === "header") return section.header || [];
    if (zone === "footer") return section.footer || [];
    return section.blocks;
  };

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
  ): EditorState => applyTableAwareParagraphEditInternal(current, getTargetBlocks, edit);

  const {
    withExpandedTableCellSelection,
    applySelectionAwareTextCommand,
    applySelectionAwareParagraphCommand,
  } = createTableSelectionAwareCommands({
    applyTransactionalState: deps.applyTransactionalState,
    applySelectionToStatePreservingStructure: deps.applySelectionToStatePreservingStructure,
    getTargetBlocks,
    resolveTableCellRangeSelection,
    resolveSelectedTableCells,
    logger: deps.logger,
  });

  const insertTableCommand = (rows: number, cols: number) => {
    deps.logger?.info(`insertTableCommand: ${rows}x${cols}`);
    deps.applyTransactionalState((current) => insertTableAtSelection(current, rows, cols), {
      mergeKey: "insertTable",
    });
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
