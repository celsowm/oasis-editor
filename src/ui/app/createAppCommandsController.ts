import { isSelectionCollapsed } from "@/core/selection.js";
import type { EditorState } from "@/core/model.js";
import type { SelectedImageRun } from "@/core/commands/image.js";
import type {
  BooleanStyleKey,
  ToolbarStyleState,
} from "@/ui/toolbarStyleState.js";
import type { EditorLogger } from "@/utils/logger.js";
import type { EditorTransactionPort } from "@/app/controllers/controllerPorts.js";
import { createEditorCommandsController } from "@/app/controllers/EditorCommandsController.js";
import type { createEditorTableOperations } from "@/app/controllers/useEditorTableOperations.js";

type EditorTableOperations = ReturnType<typeof createEditorTableOperations>;

export interface AppCommandsControllerDeps {
  state: EditorState;
  logger: EditorLogger;
  applyState: EditorTransactionPort["applyState"];
  applyTransactionalState: EditorTransactionPort["applyTransactionalState"];
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  focusInput: () => void;
  selectedImageRun: () => SelectedImageRun | null;
  tableOps: Pick<
    EditorTableOperations,
    | "applySelectionAwareTextCommand"
    | "applySelectionAwareParagraphCommand"
    | "applyTableAwareParagraphEdit"
  >;
  toolbarStyleState: () => ToolbarStyleState;
  applyBooleanStyleCommand: (style: BooleanStyleKey) => void;
  locale: () => string;
  setLinkDialog: (state: { isOpen: boolean; initialHref: string }) => void;
  setImageAltDialog: (state: { isOpen: boolean; initialAlt: string }) => void;
  setImageCaptionDialog: (state: {
    isOpen: boolean;
    initialCaption: string;
  }) => void;
}

/**
 * Builds the command controller (and its keyboard-flavoured variant that adds
 * `applyBooleanStyleCommand`) from the editor's collaborators, owning the inline
 * dialog-opener closures and the locale-derived caption label. Extracted from
 * `OasisEditorApp` so the composition root no longer maps these payload/dialog
 * callbacks by hand (S1).
 */
export function createAppCommandsController(
  deps: AppCommandsControllerDeps,
): ReturnType<typeof createAppCommandsControllerImpl> {
  return createAppCommandsControllerImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createAppCommandsControllerImpl(deps: AppCommandsControllerDeps) {
  const commandsController = createEditorCommandsController({
    state: deps.state,
    logger: deps.logger,
    applyState: deps.applyState,
    applyTransactionalState: deps.applyTransactionalState,
    applySelectionAwareTextCommand:
      deps.tableOps.applySelectionAwareTextCommand,
    applySelectionAwareParagraphCommand:
      deps.tableOps.applySelectionAwareParagraphCommand,
    applyTableAwareParagraphEdit: deps.tableOps.applyTableAwareParagraphEdit,
    focusInput: deps.focusInput,
    clearPreferredColumn: deps.clearPreferredColumn,
    resetTransactionGrouping: deps.resetTransactionGrouping,
    toolbarStyleState: deps.toolbarStyleState,
    selectionCollapsed: (): boolean =>
      isSelectionCollapsed(deps.state.selection),
    selectedImageRun: deps.selectedImageRun,
    openLinkDialog: (initialHref): void =>
      deps.setLinkDialog({ isOpen: true, initialHref }),
    openImageAltDialog: (initialAlt): void =>
      deps.setImageAltDialog({ isOpen: true, initialAlt }),
    openImageCaptionDialog: (initialCaption): void =>
      deps.setImageCaptionDialog({ isOpen: true, initialCaption }),
    imageCaptionLabel: (): "Figure" | "Figura" =>
      deps.locale().startsWith("en") ? "Figure" : "Figura",
  });

  const keyboardCommandsController = {
    ...commandsController,
    applyBooleanStyleCommand: (style: BooleanStyleKey): void =>
      deps.applyBooleanStyleCommand(style),
  };

  return { commandsController, keyboardCommandsController };
}
