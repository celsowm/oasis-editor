import {
  acceptRevisionsInSelection,
  clearParagraphListAtSelection,
  getLinkAtSelection,
  indentParagraphList,
  insertPageBreakAtSelection,
  insertSectionBreakAtSelection,
  outdentParagraphList,
  rejectRevisionsInSelection,
  setLinkAtSelection,
  setParagraphNamedStyle,
  setParagraphStyle,
  setParagraphListFormat,
  setParagraphListStartAt,
  setSelectedImageAlt,
  setTextStyleValue,
  splitListItemAtSelection,
  toggleParagraphList,
  toggleTextStyle,
  toggleTrackChanges,
  updateSectionSettings,
} from "../../core/editorCommands.js";
import {
  getActiveSectionIndex,
  findParagraphTableLocation,
  getParagraphs,
  getParagraphText,
  positionToParagraphOffset,
  type EditorParagraphListStyle,
  type EditorParagraphStyle,
  type EditorSection,
  type EditorState,
  type EditorPosition,
  type EditorTextStyle,
} from "../../core/model.js";
import { normalizeSelection } from "../../core/selection.js";
import type { EditorTransactionOptions } from "../../ui/editorHistory.js";
import type {
  BooleanStyleKey,
  ParagraphStyleKey,
  ToolbarStyleState,
} from "../../ui/toolbarStyleState.js";
import type { EditorLogger } from "../../utils/logger.js";

export interface EditorCommandsControllerDeps {
  state: EditorState;
  logger: EditorLogger;
  applyState: (next: EditorState) => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: EditorTransactionOptions,
  ) => void;
  applySelectionAwareTextCommand: (command: (current: EditorState) => EditorState) => void;
  applySelectionAwareParagraphCommand: (command: (current: EditorState) => EditorState) => void;
  applyTableAwareParagraphEdit: (
    current: EditorState,
    edit: (tempState: EditorState) => EditorState,
  ) => EditorState;
  focusInput: () => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  toolbarStyleState: () => ToolbarStyleState;
  selectionCollapsed: () => boolean;
  selectedImageRun: () => any;
  openLinkDialog: (initialHref: string) => void;
  openImageAltDialog: (initialAlt: string) => void;
}

export function createEditorCommandsController(deps: EditorCommandsControllerDeps) {
  const {
    state,
    logger,
    applyState,
    applyTransactionalState,
    applySelectionAwareTextCommand,
    applySelectionAwareParagraphCommand,
    applyTableAwareParagraphEdit,
    focusInput,
    clearPreferredColumn,
    resetTransactionGrouping,
    toolbarStyleState,
    selectionCollapsed,
    selectedImageRun,
  } = deps;

  const getSelectedParagraphRange = () => {
    const normalized = normalizeSelection(state);
    return getParagraphs(state).slice(normalized.startIndex, normalized.endIndex + 1);
  };

  const selectionTouchesList = () =>
    getSelectedParagraphRange().some((paragraph) => Boolean(paragraph.list));

  const focusedParagraph = () => {
    const focusParagraphId = state.selection.focus.paragraphId;
    return getParagraphs(state).find((paragraph) => paragraph.id === focusParagraphId) ?? null;
  };

  const handleListTab = (direction: "indent" | "outdent") => {
    if (
      findParagraphTableLocation(
        state.document,
        state.selection.focus.paragraphId,
        getActiveSectionIndex(state),
      )
    ) {
      return false;
    }

    if (!selectionTouchesList()) {
      return false;
    }

    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) =>
      direction === "indent" ? indentParagraphList(current) : outdentParagraphList(current),
    );
    focusInput();
    return true;
  };

  const handleListEnter = () => {
    const paragraph = focusedParagraph();
    if (!paragraph?.list) {
      return false;
    }

    clearPreferredColumn();
    resetTransactionGrouping();
    if (selectionCollapsed() && getParagraphText(paragraph).length === 0) {
      applySelectionAwareParagraphCommand((current) => clearParagraphListAtSelection(current));
    } else {
      applyTransactionalState(
        (current) => applyTableAwareParagraphEdit(current, (temp) => splitListItemAtSelection(temp)),
        { mergeKey: "splitListItem" },
      );
    }
    focusInput();
    return true;
  };

  const handleListBoundaryBackspace = (
    event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => {
    const paragraph = focusedParagraph();
    if (!paragraph?.list || !selectionCollapsed()) {
      return false;
    }

    const paragraphOffset = positionToParagraphOffset(paragraph, state.selection.focus);
    if (paragraphOffset !== 0) {
      return false;
    }

    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) => outdentParagraphList(current));
    event.currentTarget.value = "";
    focusInput();
    return true;
  };

  const selectionTableLocation = () => {
    const sel = state.selection;
    const secIdx = getActiveSectionIndex(state);
    const anchorLoc = findParagraphTableLocation(state.document, sel.anchor.paragraphId, secIdx);
    const focusLoc = findParagraphTableLocation(state.document, sel.focus.paragraphId, secIdx);
    if (anchorLoc && focusLoc && anchorLoc.blockIndex === focusLoc.blockIndex) {
      return ` [table b${anchorLoc.blockIndex} r${anchorLoc.rowIndex}:c${anchorLoc.cellIndex}→r${focusLoc.rowIndex}:c${focusLoc.cellIndex}]`;
    }
    return "";
  };

  const applyBooleanStyleCommand = (key: BooleanStyleKey) => {
    if (selectionCollapsed()) {
      return;
    }
    const sel = state.selection;
    logger.info(`toggleStyle:${key} at ${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}..${sel.focus.offset}]${selectionTableLocation()}`);
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareTextCommand((current) => toggleTextStyle(current, key));
    focusInput();
  };

  const applyValueStyleCommand = <K extends "fontFamily" | "fontSize" | "color" | "highlight" | "link">(
    key: K,
    value: EditorTextStyle[K] | null,
  ) => {
    if (selectionCollapsed()) {
      return;
    }
    const sel = state.selection;
    logger.info(`setStyle:${key}=${JSON.stringify(value)} at ${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}..${sel.focus.offset}]${selectionTableLocation()}`);
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareTextCommand((current) => setTextStyleValue(current, key, value));
    focusInput();
  };

  const applyParagraphStyleCommand = <K extends ParagraphStyleKey>(
    key: K,
    value: EditorParagraphStyle[K] | null,
  ) => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) => setParagraphStyle(current, key, value));
    focusInput();
  };

  const toggleParagraphFlagCommand = (key: "pageBreakBefore" | "keepWithNext") => {
    const nextValue = !toolbarStyleState()[key];
    applyParagraphStyleCommand(key, nextValue ? true : null);
  };

  const applyParagraphListCommand = (kind: NonNullable<EditorParagraphListStyle["kind"]>) => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) => toggleParagraphList(current, kind));
    focusInput();
  };

  const handleListFormatChange = (format: EditorParagraphListStyle["format"]) => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) => setParagraphListFormat(current, format));
    focusInput();
  };

  const handleListStartAtChange = (startAt: number | null) => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) => setParagraphListStartAt(current, startAt));
    focusInput();
  };

  const applyInsertSectionBreakCommand = (breakType: "nextPage" | "continuous") => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applyState(insertSectionBreakAtSelection(state, breakType));
    focusInput();
  };

  const handleStyleChange = (styleId: string) => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) =>
      setParagraphNamedStyle(current, styleId || null),
    );
    focusInput();
  };

  const applyUpdateSectionSettingsCommand = (
    sectionIndex: number,
    settings: Partial<EditorSection>,
  ) => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applyState(updateSectionSettings(state, sectionIndex, settings));
    focusInput();
  };

  const applyToggleTrackChangesCommand = () => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applyState(toggleTrackChanges(state));
    focusInput();
  };

  const applyAcceptRevisionsCommand = () => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applyState(acceptRevisionsInSelection(state));
    focusInput();
  };

  const applyRejectRevisionsCommand = () => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applyState(rejectRevisionsInSelection(state));
    focusInput();
  };

  const applyLinkCommand = (href: string | null) => {
    const activeLink = getLinkAtSelection(state);
    if (selectionCollapsed() && !activeLink) {
      return;
    }
    clearPreferredColumn();
    resetTransactionGrouping();
    applyTransactionalState((current) => setLinkAtSelection(current, href), { mergeKey: "link" });
    focusInput();
  };

  const promptForLink = () => {
    const activeLink = getLinkAtSelection(state) ?? "";
    if (selectionCollapsed() && !activeLink) {
      return;
    }
    deps.openLinkDialog(activeLink);
  };

  const removeLinkCommand = () => {
    applyLinkCommand(null);
  };

  const applyImageAltCommand = (alt: string) => {
    const run = selectedImageRun();
    if (!run) {
      return;
    }
    clearPreferredColumn();
    resetTransactionGrouping();
    applyTransactionalState((current) => setSelectedImageAlt(current, alt), { mergeKey: "imageAlt" });
    focusInput();
  };

  const promptForImageAlt = () => {
    const run = selectedImageRun();
    if (!run) {
      return;
    }
    const currentAlt = run.run.image?.alt ?? "";
    deps.openImageAltDialog(currentAlt);
  };

  return {
    applyBooleanStyleCommand,
    applyValueStyleCommand,
    applyParagraphStyleCommand,
    toggleParagraphFlagCommand,
    applyParagraphListCommand,
    handleListFormatChange,
    handleListStartAtChange,
    applyInsertSectionBreakCommand,
    handleStyleChange,
    applyUpdateSectionSettingsCommand,
    applyToggleTrackChangesCommand,
    applyAcceptRevisionsCommand,
    applyRejectRevisionsCommand,
    applyLinkCommand,
    promptForLink,
    removeLinkCommand,
    applyImageAltCommand,
    promptForImageAlt,
    handleListTab,
    handleListEnter,
    handleListBoundaryBackspace,
  };
}
