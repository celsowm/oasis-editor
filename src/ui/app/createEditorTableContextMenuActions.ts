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
    canMerge: (): boolean => tableOps.canMergeSelectedTable(state()),
    canSplit: (): boolean => tableOps.canSplitSelectedTable(state()),
    canEditColumn: (): boolean => tableOps.canEditSelectedTableColumn(state()),
    canEditRow: (): boolean => tableOps.canEditSelectedTableRow(state()),
    openProperties: (): void => deps.openTablePropertiesDialog("table"),
    openBordersAndShading: (): void => deps.openTablePropertiesDialog("cell"),
    merge: (): void =>
      applyTableContextCommand(
        (current): EditorState => tableOps.mergeSelectedTable(current),
        MERGE_KEYS.mergeTable,
      ),
    split: (): void =>
      applyTableContextCommand(
        (current): EditorState => tableOps.splitSelectedTable(current),
        MERGE_KEYS.splitTable,
      ),
    insertColumnBefore: (): void =>
      applyTableContextCommand(
        (current): EditorState => tableOps.insertSelectedTableColumn(current, -1),
        MERGE_KEYS.insertTableColumn,
      ),
    insertColumnAfter: (): void =>
      applyTableContextCommand(
        (current): EditorState => tableOps.insertSelectedTableColumn(current, 1),
        MERGE_KEYS.insertTableColumn,
      ),
    deleteColumn: (): void =>
      applyTableContextCommand(
        (current): EditorState => tableOps.deleteSelectedTableColumn(current),
        MERGE_KEYS.deleteTableColumn,
      ),
    insertRowBefore: (): void =>
      applyTableContextCommand(
        (current): EditorState => tableOps.insertSelectedTableRow(current, -1),
        MERGE_KEYS.insertTableRow,
      ),
    insertRowAfter: (): void =>
      applyTableContextCommand(
        (current): EditorState => tableOps.insertSelectedTableRow(current, 1),
        MERGE_KEYS.insertTableRow,
      ),
    deleteRow: (): void =>
      applyTableContextCommand(
        (current): EditorState => tableOps.deleteSelectedTableRow(current),
        MERGE_KEYS.deleteTableRow,
      ),
  };
}
