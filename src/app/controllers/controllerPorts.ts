import type { EditorState } from "@/core/model.js";
import type { EditorTransactionOptions } from "@/ui/editorHistory.js";
import type { SelectedImageRun } from "@/core/commands/image.js";

/**
 * Capability ports shared by the editor controllers (I1). The controller
 * dependency bags used to redeclare these same members independently; grouping
 * them into small, named ports removes that duplication and lets a controller
 * (or a test fabricating deps) depend on just the capabilities it actually
 * uses, rather than a 20+-member catch-all interface.
 */

/**
 * Applies document changes through the editor's transaction/history machinery.
 * Covers the plain apply, the transactional producer (optionally grouped), the
 * table-aware paragraph edit, the selection-aware paragraph command, and the
 * transaction-grouping bookkeeping.
 */
export interface EditorTransactionPort {
  applyState: (next: EditorState) => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: EditorTransactionOptions,
  ) => void;
  applyTableAwareParagraphEdit: (
    current: EditorState,
    edit: (tempState: EditorState) => EditorState,
  ) => EditorState;
  applySelectionAwareParagraphCommand: (
    command: (current: EditorState) => EditorState,
  ) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
}

/** Returns keyboard focus to the hidden editing input. */
export interface FocusInputPort {
  focusInput: () => void;
}

/** Reads the currently selected inline image run, when one is selected. */
export interface SelectedImageQueryPort {
  selectedImageRun: () => SelectedImageRun | null;
}
