import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import type { EditorState } from "@/core/model.js";
import type { createEditorTableOperations } from "@/app/controllers/useEditorTableOperations.js";
import type { EditorTableContextMenuActions } from "./useEditorContextMenuClipboard.js";

type EditorTableOperations = ReturnType<typeof createEditorTableOperations>;

export interface EditorTableContextMenuActionsDeps {
  state: () => EditorState;
  tableOps: EditorTableOperations;
  isInsideTable: () => boolean;
  openTablePropertiesDialog: (tab: "table" | "cell") => void;
  applyTableContextCommand: (
    producer: (current: EditorState) => EditorState,
    mergeKey: MergeKey,
  ) => void;
}

/**
 * Adapts the table operations + properties dialog into the flat action surface
 * the context menu consumes. Pure callback wiring extracted from
 * `OasisEditorApp` so the composition root stays free of per-feature operation
 * mapping (S1).
 */
export function createEditorTableContextMenuActions(
  deps: EditorTableContextMenuActionsDeps,
): EditorTableContextMenuActions {
  const { state, tableOps, applyTableContextCommand } = deps;
  return {
    isInsideTable: deps.isInsideTable,
    canMerge: () => tableOps.canMergeSelectedTable(state()),
    canSplit: () => tableOps.canSplitSelectedTable(state()),
    canEditColumn: () => tableOps.canEditSelectedTableColumn(state()),
    canEditRow: () => tableOps.canEditSelectedTableRow(state()),
    openProperties: () => deps.openTablePropertiesDialog("table"),
    openBordersAndShading: () => deps.openTablePropertiesDialog("cell"),
    merge: () =>
      applyTableContextCommand(
        (current) => tableOps.mergeSelectedTable(current),
        MERGE_KEYS.mergeTable,
      ),
    split: () =>
      applyTableContextCommand(
        (current) => tableOps.splitSelectedTable(current),
        MERGE_KEYS.splitTable,
      ),
    insertColumnBefore: () =>
      applyTableContextCommand(
        (current) => tableOps.insertSelectedTableColumn(current, -1),
        MERGE_KEYS.insertTableColumn,
      ),
    insertColumnAfter: () =>
      applyTableContextCommand(
        (current) => tableOps.insertSelectedTableColumn(current, 1),
        MERGE_KEYS.insertTableColumn,
      ),
    deleteColumn: () =>
      applyTableContextCommand(
        (current) => tableOps.deleteSelectedTableColumn(current),
        MERGE_KEYS.deleteTableColumn,
      ),
    insertRowBefore: () =>
      applyTableContextCommand(
        (current) => tableOps.insertSelectedTableRow(current, -1),
        MERGE_KEYS.insertTableRow,
      ),
    insertRowAfter: () =>
      applyTableContextCommand(
        (current) => tableOps.insertSelectedTableRow(current, 1),
        MERGE_KEYS.insertTableRow,
      ),
    deleteRow: () =>
      applyTableContextCommand(
        (current) => tableOps.deleteSelectedTableRow(current),
        MERGE_KEYS.deleteTableRow,
      ),
  };
}
