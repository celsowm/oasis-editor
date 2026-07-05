import type { MergeKey } from "@/core/transactionMergeKeys.js";
import type { EditorState } from "@/core/model.js";
import type { SelectedImageRun } from "@/core/commands/image.js";
import type { createEditorCommandsController } from "@/app/controllers/EditorCommandsController.js";
import type { createEditorHistoryActions } from "@/app/controllers/useEditorHistoryActions.js";
import type { createEditorStyleController } from "@/app/controllers/useEditorStyle.js";
import type { createEditorTableOperations } from "@/app/controllers/useEditorTableOperations.js";

export interface CreateEditorEssentialsPluginOptions {
  state: () => EditorState;
  isReadOnly: () => boolean;
  forcePlainTextPaste: {
    get: () => boolean;
    set: (value: boolean) => void;
  };
  undoStack: () => EditorState[];
  redoStack: () => EditorState[];
  commandsController: ReturnType<typeof createEditorCommandsController>;
  keyboardCommandsController: ReturnType<
    typeof createEditorCommandsController
  > & {
    applyBooleanStyleCommand: ReturnType<
      typeof createEditorStyleController
    >["applyToolbarBooleanStyleCommand"];
  };
  historyActions: ReturnType<typeof createEditorHistoryActions>;
  styleController: ReturnType<typeof createEditorStyleController>;
  tableOps: ReturnType<typeof createEditorTableOperations>;
  docIO: {
    handleExportDocx: () => Promise<void>;
    handleExportPdf: () => Promise<void>;
  };
  importInputRef: () => HTMLInputElement | undefined;
  imageInputRef: () => HTMLInputElement | undefined;
  selectedImageRun: () => SelectedImageRun | null;
  selectionBoxes: () => Array<unknown>;
  focusInput: () => void;
  applyState: (nextState: EditorState) => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  findReplace: {
    setIsOpen: (open: boolean) => void;
  };
}
