import type {
  EditorDocument,
  EditorPosition,
  EditorState,
  EditorTextStyle,
} from "@/core/model.js";
import type { TableTabTarget } from "./tableOpsSelectionNavigation.js";
import type { BooleanStyleKey } from "@/ui/toolbarStyleState.js";
import type {
  EditorTransactionPort,
  FocusInputPort,
  SelectedImageQueryPort,
} from "./controllerPorts.js";

/**
 * The capability surface the keyboard controller and key bindings operate on.
 * Extracted to its own leaf module so `EditorCommandRegistry` (which references
 * it from key-binding signatures) and `useEditorKeyboard` (which implements the
 * controller) can both depend on it without forming an import cycle.
 *
 * Shared transaction/focus/image-selection members come from the capability
 * ports in `controllerPorts.ts`; only keyboard-specific members live here (I1).
 */
export interface EditorKeyboardDeps
  extends EditorTransactionPort, FocusInputPort, SelectedImageQueryPort {
  state: () => EditorState;
  isReadOnly: () => boolean;
  pendingCaretTextStyle?: () => EditorTextStyle | undefined;
  autoTabIndentEnabled?: () => boolean;
  isMacPlatform?: () => boolean;
  isCaretAtWrappedLineStart?: () => boolean;
  commandsController: {
    promptForImageAlt: () => void;
    promptForLink: () => void;
    applyBooleanStyleCommand: (style: BooleanStyleKey) => void;
    applyParagraphListCommand: (style: "bullet" | "ordered") => void;
    applyInsertFootnoteCommand: () => void;
    handleListEnter: () => boolean;
    handleListBoundaryBackspace: (
      event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
    ) => boolean;
    handleListTab: (direction: "indent" | "outdent") => boolean;
  };
  setForcePlainTextPaste: (value: boolean) => void;
  moveSelectionByWord: (
    direction: "left" | "right",
    extend: boolean,
  ) => boolean;
  moveSelectionToDocumentBoundary: (
    boundary: "start" | "end",
    extend: boolean,
  ) => boolean;
  moveSelectionToParagraphBoundary: (
    boundary: "start" | "end",
    extend: boolean,
  ) => boolean;
  moveSelectedImageByParagraph: (direction: -1 | 1) => boolean;
  performUndo: () => void;
  performRedo: () => void;
  moveVerticalSelection: (direction: -1 | 1, extend: boolean) => boolean;
  moveVerticalByBlock: (direction: -1 | 1) => boolean;
  resolveAdjacentTableCellPosition: (
    document: EditorDocument,
    paragraphId: string,
    delta: -1 | 1,
  ) => EditorPosition | null;
  resolveTableTabTarget?: (document: EditorDocument, paragraphId: string, delta: -1 | 1) => TableTabTarget;
  appendTableRowForTab?: (current: EditorState) => EditorState;
  applySelectionPreservingStructure: (
    selection: EditorState["selection"],
  ) => void;
  toggleFindReplace: (open?: boolean) => void;
  toggleReplace: (open?: boolean) => void;
  toggleCommandSearch: (open?: boolean) => void;
  executeCommand?: (commandName: string, payload?: unknown) => unknown;
  canExecuteCommand?: (commandName: string, payload?: unknown) => boolean;
}
