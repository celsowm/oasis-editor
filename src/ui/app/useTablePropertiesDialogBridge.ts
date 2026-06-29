import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import type { EditorState } from "@/core/model.js";
import {
  applyTableProperties,
  hasActiveTable,
  readTableProperties,
} from "@/app/services/tablePropertiesService.js";
import type {
  TablePropertiesDialogApplyValues,
  TablePropertiesDialogInitialValues,
} from "@/ui/components/Dialogs/TablePropertiesDialog.js";

interface TablePropertiesDialogState {
  isOpen: boolean;
  initial: TablePropertiesDialogInitialValues;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

export interface TablePropertiesDialogBridgeDeps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  setTablePropertiesDialog: (state: TablePropertiesDialogState) => void;
  setContextMenu: (state: ContextMenuState) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  focusInput: () => void;
}

/**
 * UI bridge for the table properties dialog: opens/closes it and returns focus.
 * All model knowledge (active-table resolution, value mapping, mutation) lives
 * in `@/app/services/tablePropertiesService` (F1).
 */
export function createTablePropertiesDialogBridge(
  deps: TablePropertiesDialogBridgeDeps,
) {
  const isInsideTable = (): boolean => hasActiveTable(deps.state());

  const openTablePropertiesDialog = (
    activeTab: TablePropertiesDialogInitialValues["activeTab"] = "table",
  ): void => {
    const initial = readTableProperties(deps.state(), activeTab);
    if (!initial) return;
    deps.setContextMenu({ isOpen: false, x: 0, y: 0 });
    deps.setTablePropertiesDialog({ isOpen: true, initial });
  };

  const applyTablePropertiesDialogValues = (
    values: TablePropertiesDialogApplyValues,
  ): void => {
    if (deps.isReadOnly()) return;
    if (!isInsideTable()) return;
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    deps.applyTransactionalState(
      (current): EditorState => applyTableProperties(current, values),
      { mergeKey: MERGE_KEYS.tableProperties },
    );
    deps.focusInput();
  };

  return {
    isInsideTable,
    openTablePropertiesDialog,
    applyTablePropertiesDialogValues,
  };
}
