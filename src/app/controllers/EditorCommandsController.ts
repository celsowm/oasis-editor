import { MERGE_KEYS } from "@/core/transactionMergeKeys.js";
import {
  insertPageBreakAtSelection,
  insertSectionBreakAtSelection,
  setParagraphNamedStyle,
  setParagraphStyle,
  updateSectionSettings,
} from "@/core/commands/block.js";
import { insertFootnote } from "@/core/commands/footnotes.js";
import {
  acceptRevisionsInSelection,
  rejectRevisionsInSelection,
  toggleTrackChanges,
} from "@/core/commands/history.js";
import {
  getSelectedImageCaption,
  setSelectedImageCaption,
  setSelectedImageAlt,
} from "@/core/commands/image.js";
import {
  getLinkAtSelection,
  setLinkAtSelection,
} from "@/core/commands/link.js";
import {
  clearParagraphListAtSelection,
  indentParagraphList,
  outdentParagraphList,
  setParagraphListFormat,
  setParagraphListStartAt,
  splitListItemAtSelection,
  toggleParagraphList,
} from "@/core/commands/list.js";
import {
  changeSelectedTextCase,
  clearSelectedTextFormatting,
  setTextStyleValue,
  toggleTextStyle,
} from "@/core/commands/text.js";
import {
  getActiveSectionIndex,
  findParagraphTableLocation,
  getParagraphs,
  getParagraphText,
  getRunImage,
  positionToParagraphOffset,
  type EditorParagraphListStyle,
  type EditorParagraphStyle,
  type EditorSection,
  type EditorState,
  type EditorTextStyle,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import type { TextCaseMode } from "@/core/commands/text.js";
import type {
  BooleanStyleKey,
  ParagraphStyleKey,
  ToolbarStyleState,
} from "@/ui/toolbarStyleState.js";
import type { EditorLogger } from "@/utils/logger.js";
import type {
  EditorTransactionPort,
  FocusInputPort,
  SelectedImageQueryPort,
} from "./controllerPorts.js";

export interface EditorCommandsControllerDeps
  extends EditorTransactionPort, FocusInputPort, SelectedImageQueryPort {
  state: EditorState;
  logger: EditorLogger;
  applySelectionAwareTextCommand: (
    command: (current: EditorState) => EditorState,
  ) => void;
  toolbarStyleState: () => ToolbarStyleState;
  selectionCollapsed: () => boolean;
  openLinkDialog: (initialHref: string) => void;
  openImageAltDialog: (initialAlt: string) => void;
  openImageCaptionDialog: (initialCaption: string) => void;
  imageCaptionLabel: () => string;
}

export function createEditorCommandsController(
  deps: EditorCommandsControllerDeps,
) {
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

  // Ceremony wrappers: each owns the clearPreferredColumn → resetTransactionGrouping
  // → apply → focusInput sequence so call sites only supply the domain logic.

  const execState = (next: EditorState): void => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applyState(next);
    focusInput();
  };

  const execText = (producer: (current: EditorState) => EditorState): void => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareTextCommand(producer);
    focusInput();
  };

  const execParagraph = (
    producer: (current: EditorState) => EditorState,
  ): void => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand(producer);
    focusInput();
  };

  const execTransactional = (
    producer: (current: EditorState) => EditorState,
    options?: Parameters<typeof applyTransactionalState>[1],
  ): void => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applyTransactionalState(producer, options);
    focusInput();
  };

  const getSelectedParagraphRange = () => {
    const normalized = normalizeSelection(state);
    return getParagraphs(state).slice(
      normalized.startIndex,
      normalized.endIndex + 1,
    );
  };

  const selectionTouchesList = () =>
    getSelectedParagraphRange().some((paragraph) => Boolean(paragraph.list));

  const focusedParagraph = () => {
    const focusParagraphId = state.selection.focus.paragraphId;
    return (
      getParagraphs(state).find(
        (paragraph) => paragraph.id === focusParagraphId,
      ) ?? null
    );
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

    execParagraph((current) =>
      direction === "indent"
        ? indentParagraphList(current)
        : outdentParagraphList(current),
    );
    return true;
  };

  const handleListEnter = () => {
    const paragraph = focusedParagraph();
    if (!paragraph?.list) {
      return false;
    }

    // Branching apply: ceremony wraps both branches manually.
    clearPreferredColumn();
    resetTransactionGrouping();
    if (selectionCollapsed() && getParagraphText(paragraph).length === 0) {
      applySelectionAwareParagraphCommand((current) =>
        clearParagraphListAtSelection(current),
      );
    } else {
      applyTransactionalState(
        (current) =>
          applyTableAwareParagraphEdit(current, (temp) =>
            splitListItemAtSelection(temp),
          ),
        { mergeKey: MERGE_KEYS.splitListItem },
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

    const paragraphOffset = positionToParagraphOffset(
      paragraph,
      state.selection.focus,
    );
    if (paragraphOffset !== 0) {
      return false;
    }

    // Extra step between apply and focusInput: ceremony is manual here.
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) =>
      outdentParagraphList(current),
    );
    event.currentTarget.value = "";
    focusInput();
    return true;
  };

  const selectionTableLocation = () => {
    const sel = state.selection;
    const secIdx = getActiveSectionIndex(state);
    const anchorLoc = findParagraphTableLocation(
      state.document,
      sel.anchor.paragraphId,
      secIdx,
    );
    const focusLoc = findParagraphTableLocation(
      state.document,
      sel.focus.paragraphId,
      secIdx,
    );
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
    logger.info(
      `toggleStyle:${key} at ${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}..${sel.focus.offset}]${selectionTableLocation()}`,
    );
    execText((current) => toggleTextStyle(current, key));
  };

  const applyValueStyleCommand = <
    K extends
      | "styleId"
      | "fontFamily"
      | "fontSize"
      | "color"
      | "highlight"
      | "shading"
      | "language"
      | "textEffect"
      | "link"
      | "underlineStyle",
  >(
    key: K,
    value: EditorTextStyle[K] | null,
  ) => {
    if (selectionCollapsed()) {
      return;
    }
    const sel = state.selection;
    logger.info(
      `setStyle:${key}=${JSON.stringify(value)} at ${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}..${sel.focus.offset}]${selectionTableLocation()}`,
    );
    execText((current) => setTextStyleValue(current, key, value));
  };

  const applyChangeTextCaseCommand = (mode: TextCaseMode) => {
    if (selectionCollapsed()) {
      return;
    }
    execText((current) => changeSelectedTextCase(current, mode));
  };

  const applyClearFormattingCommand = () => {
    if (selectionCollapsed()) {
      return;
    }
    execText((current) => clearSelectedTextFormatting(current));
  };

  const applyParagraphStyleCommand = <K extends ParagraphStyleKey>(
    key: K,
    value: EditorParagraphStyle[K] | null,
  ) => {
    execParagraph((current) => setParagraphStyle(current, key, value));
  };

  const toggleParagraphFlagCommand = (
    key: "pageBreakBefore" | "keepWithNext",
  ) => {
    const nextValue = !toolbarStyleState()[key];
    applyParagraphStyleCommand(key, nextValue ? true : null);
  };

  const applyParagraphListCommand = (
    kind: NonNullable<EditorParagraphListStyle["kind"]>,
  ) => {
    execParagraph((current) => toggleParagraphList(current, kind));
  };

  const handleListFormatChange = (
    format: EditorParagraphListStyle["format"],
  ) => {
    execParagraph((current) => setParagraphListFormat(current, format));
  };

  const handleListStartAtChange = (startAt: number | null) => {
    execParagraph((current) => setParagraphListStartAt(current, startAt));
  };

  const applyInsertSectionBreakCommand = (
    breakType: "nextPage" | "continuous",
  ) => {
    execState(insertSectionBreakAtSelection(state, breakType));
  };

  const applyInsertPageBreakCommand = () => {
    execTransactional((current) =>
      applyTableAwareParagraphEdit(current, (temp) =>
        insertPageBreakAtSelection(temp),
      ),
    );
  };

  const canInsertFootnoteCommand = () =>
    (state.activeZone ?? "main") === "main";

  const applyInsertFootnoteCommand = () => {
    if (!canInsertFootnoteCommand()) {
      return;
    }
    execTransactional((current) => insertFootnote(current));
  };

  const handleStyleChange = (styleId: string) => {
    execParagraph((current) =>
      setParagraphNamedStyle(current, styleId || null),
    );
  };

  const applyUpdateSectionSettingsCommand = (
    sectionIndex: number,
    settings: Partial<EditorSection>,
  ) => {
    execState(updateSectionSettings(state, sectionIndex, settings));
  };

  const applyToggleTrackChangesCommand = () => {
    execState(toggleTrackChanges(state));
  };

  const applyToggleShowMarginsCommand = () => {
    applyState({ ...state, showMargins: !state.showMargins });
    focusInput();
  };

  const applyToggleShowParagraphMarksCommand = () => {
    applyState({ ...state, showParagraphMarks: !state.showParagraphMarks });
    focusInput();
  };

  const applyAcceptRevisionsCommand = () => {
    execState(acceptRevisionsInSelection(state));
  };

  const applyRejectRevisionsCommand = () => {
    execState(rejectRevisionsInSelection(state));
  };

  const applyLinkCommand = (href: string | null) => {
    const activeLink = getLinkAtSelection(state);
    if (selectionCollapsed() && !activeLink) {
      return;
    }
    execTransactional((current) => setLinkAtSelection(current, href), {
      mergeKey: MERGE_KEYS.link,
    });
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
    execTransactional((current) => setSelectedImageAlt(current, alt), {
      mergeKey: MERGE_KEYS.imageAlt,
    });
  };

  const promptForImageAlt = () => {
    const run = selectedImageRun();
    if (!run) {
      return;
    }
    const currentAlt = getRunImage(run.run)?.alt ?? "";
    deps.openImageAltDialog(currentAlt);
  };

  const applyImageCaptionCommand = (caption: string) => {
    const run = selectedImageRun();
    if (!run) {
      return;
    }
    execTransactional(
      (current) =>
        setSelectedImageCaption(current, caption, deps.imageCaptionLabel()),
      { mergeKey: MERGE_KEYS.imageCaption },
    );
  };

  const promptForImageCaption = () => {
    const run = selectedImageRun();
    if (!run) {
      return;
    }
    deps.openImageCaptionDialog(getSelectedImageCaption(state) ?? "");
  };

  return {
    applyBooleanStyleCommand,
    applyValueStyleCommand,
    applyChangeTextCaseCommand,
    applyClearFormattingCommand,
    applyParagraphStyleCommand,
    toggleParagraphFlagCommand,
    applyParagraphListCommand,
    handleListFormatChange,
    handleListStartAtChange,
    applyInsertSectionBreakCommand,
    applyInsertPageBreakCommand,
    canInsertFootnoteCommand,
    applyInsertFootnoteCommand,
    handleStyleChange,
    applyUpdateSectionSettingsCommand,
    applyToggleTrackChangesCommand,
    applyToggleShowMarginsCommand,
    applyToggleShowParagraphMarksCommand,
    applyAcceptRevisionsCommand,
    applyRejectRevisionsCommand,
    applyLinkCommand,
    promptForLink,
    removeLinkCommand,
    applyImageAltCommand,
    promptForImageAlt,
    applyImageCaptionCommand,
    promptForImageCaption,
    handleListTab,
    handleListEnter,
    handleListBoundaryBackspace,
  };
}
