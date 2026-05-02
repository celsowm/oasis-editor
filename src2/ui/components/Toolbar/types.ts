import type {
  Editor2ParagraphListStyle,
  Editor2ParagraphStyle,
  Editor2Section,
  Editor2State,
} from "../../../core/model.js";
import type {
  BooleanStyleKey,
  ParagraphStyleKey,
  ToolbarStyleState,
} from "../../toolbarStyleState.js";

export type ValueStyleKey = "fontFamily" | "fontSize" | "color" | "highlight" | "link";

export interface EditorToolbarCtx {
  state: Editor2State;
  undoStack: () => unknown[];
  redoStack: () => unknown[];
  importInputRef: () => HTMLInputElement | undefined;
  imageInputRef: () => HTMLInputElement | undefined;

  toolbarStyleState: () => ToolbarStyleState;
  selectionCollapsed: () => boolean;
  selectedImageRun: () => unknown;
  tableSelectionLabel: () => string | null;
  tableActionRestrictionLabel: () => string | null;
  isInsideTable: () => boolean;

  handleExportDocx: () => void;
  performUndo: () => void;
  performRedo: () => void;
  focusInput: () => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    transform: (state: Editor2State) => Editor2State,
    options?: { mergeKey?: string },
  ) => void;
  applyTableAwareParagraphEdit: (
    state: Editor2State,
    edit: (state: Editor2State) => Editor2State,
  ) => Editor2State;

  promptForImageAlt: () => void;
  promptForLink: () => void;
  removeLinkCommand: () => void;

  applyBooleanStyleCommand: (key: BooleanStyleKey) => void;
  applyValueStyleCommand: <K extends ValueStyleKey>(
    key: K,
    value: K extends "fontSize" ? number | null : string | null,
  ) => void;
  applyParagraphStyleCommand: <K extends ParagraphStyleKey>(
    key: K,
    value: Editor2ParagraphStyle[K] | null,
  ) => void;
  applyParagraphListCommand: (kind: NonNullable<Editor2ParagraphListStyle["kind"]>) => void;
  applyInsertSectionBreakCommand: (breakType: "nextPage" | "continuous") => void;
  applyToggleTrackChangesCommand: () => void;
  applyAcceptRevisionsCommand: () => void;
  applyRejectRevisionsCommand: () => void;
  applyUpdateSectionSettingsCommand: (
    sectionIndex: number,
    settings: Partial<Editor2Section>,
  ) => void;
  toggleParagraphFlagCommand: (key: "pageBreakBefore" | "keepWithNext") => void;
  handleListFormatChange: (format: Editor2ParagraphListStyle["format"]) => void;
  handleListStartAtChange: (startAt: number | null) => void;
  handleStyleChange: (styleId: string) => void;

  canMergeSelectedTable: (state: Editor2State) => boolean;
  canMergeSelectedTableCells: (state: Editor2State) => boolean;
  canMergeSelectedTableRows: (state: Editor2State) => boolean;
  canSplitSelectedTable: (state: Editor2State) => boolean;
  canSplitSelectedTableCell: (state: Editor2State) => boolean;
  canSplitSelectedTableCellVertically: (state: Editor2State) => boolean;
  canEditSelectedTableColumn: (state: Editor2State) => boolean;
  canEditSelectedTableRow: (state: Editor2State) => boolean;
  mergeSelectedTable: (state: Editor2State) => Editor2State;
  mergeSelectedTableCells: (state: Editor2State) => Editor2State;
  mergeSelectedTableRows: (state: Editor2State) => Editor2State;
  splitSelectedTable: (state: Editor2State) => Editor2State;
  splitSelectedTableCell: (state: Editor2State) => Editor2State;
  splitSelectedTableCellVertically: (state: Editor2State) => Editor2State;
  insertSelectedTableColumn: (state: Editor2State, direction: -1 | 1) => Editor2State;
  insertSelectedTableRow: (state: Editor2State, direction: -1 | 1) => Editor2State;
  deleteSelectedTableColumn: (state: Editor2State) => Editor2State;
  deleteSelectedTableRow: (state: Editor2State) => Editor2State;
  insertTableCommand: (rows: number, cols: number) => void;
}
