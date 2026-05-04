import type {
  EditorParagraphListStyle,
  EditorParagraphStyle,
  EditorSection,
  EditorState,
} from "../../../core/model.js";
import type {
  BooleanStyleKey,
  ParagraphStyleKey,
  ToolbarStyleState,
} from "../../toolbarStyleState.js";
import type { PersistenceStatus } from "../../../app/controllers/useEditorPersistence.js";

export type ValueStyleKey = "fontFamily" | "fontSize" | "color" | "highlight" | "link";

export interface EditorToolbarCtx {
  state: EditorState;
  undoStack: () => unknown[];
  redoStack: () => unknown[];
  persistenceStatus: () => PersistenceStatus;
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
    transform: (state: EditorState) => EditorState,
    options?: { mergeKey?: string },
  ) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState,
    edit: (state: EditorState) => EditorState,
  ) => EditorState;

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
    value: EditorParagraphStyle[K] | null,
  ) => void;
  applyParagraphListCommand: (kind: NonNullable<EditorParagraphListStyle["kind"]>) => void;
  applyInsertSectionBreakCommand: (breakType: "nextPage" | "continuous") => void;
  applyToggleTrackChangesCommand: () => void;
  applyAcceptRevisionsCommand: () => void;
  applyRejectRevisionsCommand: () => void;
  applyUpdateSectionSettingsCommand: (
    sectionIndex: number,
    settings: Partial<EditorSection>,
  ) => void;
  toggleParagraphFlagCommand: (key: "pageBreakBefore" | "keepWithNext") => void;
  handleListFormatChange: (format: EditorParagraphListStyle["format"]) => void;
  handleListStartAtChange: (startAt: number | null) => void;
  handleStyleChange: (styleId: string) => void;

  canMergeSelectedTable: (state: EditorState) => boolean;
  canMergeSelectedTableCells: (state: EditorState) => boolean;
  canMergeSelectedTableRows: (state: EditorState) => boolean;
  canSplitSelectedTable: (state: EditorState) => boolean;
  canSplitSelectedTableCell: (state: EditorState) => boolean;
  canSplitSelectedTableCellVertically: (state: EditorState) => boolean;
  canEditSelectedTableColumn: (state: EditorState) => boolean;
  canEditSelectedTableRow: (state: EditorState) => boolean;
  mergeSelectedTable: (state: EditorState) => EditorState;
  mergeSelectedTableCells: (state: EditorState) => EditorState;
  mergeSelectedTableRows: (state: EditorState) => EditorState;
  splitSelectedTable: (state: EditorState) => EditorState;
  splitSelectedTableCell: (state: EditorState) => EditorState;
  splitSelectedTableCellVertically: (state: EditorState) => EditorState;
  insertSelectedTableColumn: (state: EditorState, direction: -1 | 1) => EditorState;
  insertSelectedTableRow: (state: EditorState, direction: -1 | 1) => EditorState;
  deleteSelectedTableColumn: (state: EditorState) => EditorState;
  deleteSelectedTableRow: (state: EditorState) => EditorState;
  insertTableCommand: (rows: number, cols: number) => void;
}
