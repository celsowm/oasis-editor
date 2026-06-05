import {
  insertPageBreakAtSelection,
  insertTextAtSelection,
  setParagraphStyle,
  setTableCellBorders,
  setTableCellStyleValue,
  setTableCellWidth,
  setTableStyleValue,
  splitBlockAtSelection,
} from "../../core/editorCommands.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getDocumentParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  type EditorBorderStyle,
  type EditorDocument,
  type EditorState,
} from "../../core/model.js";
import { isSelectionCollapsed, normalizeSelection } from "../../core/selection.js";
import { createEssentialsPlugin } from "../../plugins/internal/createEssentialsPlugin.js";
import type { SelectedImageRun } from "../../core/commands/image.js";
import type { createEditorCommandsController } from "../../app/controllers/EditorCommandsController.js";
import type { createEditorHistoryActions } from "../../app/controllers/useEditorHistoryActions.js";
import type { createEditorStyleController } from "../../app/controllers/useEditorStyle.js";
import type { createEditorTableOperations } from "../../app/controllers/useEditorTableOperations.js";

interface CreateEditorEssentialsPluginOptions {
  state: () => EditorState;
  isReadOnly: () => boolean;
  forcePlainTextPaste: {
    get: () => boolean;
    set: (value: boolean) => void;
  };
  undoStack: () => EditorState[];
  redoStack: () => EditorState[];
  commandsController: ReturnType<typeof createEditorCommandsController>;
  keyboardCommandsController: ReturnType<typeof createEditorCommandsController> & {
    applyBooleanStyleCommand: ReturnType<typeof createEditorStyleController>["applyToolbarBooleanStyleCommand"];
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
    options?: { mergeKey?: string },
  ) => void;
  findReplace: {
    setIsOpen: (open: boolean) => void;
  };
}

export function createEditorEssentialsRuntimePlugin(
  options: CreateEditorEssentialsPluginOptions,
) {
  const essentialsGate = {
    isCommandEnabled: (commandName: string) =>
      !options.isReadOnly() &&
      (commandName !== "insertFootnote" || options.commandsController.canInsertFootnoteCommand()),
  };

  const essentialsStyle = {
    state: () => options.styleController.toolbarStyleState(),
  };

  const essentialsHistory = {
    canUndo: () => options.undoStack().length > 0,
    canRedo: () => options.redoStack().length > 0,
    undo: () => (options.historyActions.performUndo(), true),
    redo: () => (options.historyActions.performRedo(), true),
  };

  const essentialsFormatting = {
    selectAll: () => {
      const paragraphs = getDocumentParagraphs(options.state().document);
      if (paragraphs.length === 0) return false;
      const firstParagraph = paragraphs[0]!;
      const lastParagraph = paragraphs[paragraphs.length - 1]!;
      options.applyState({
        ...options.state(),
        selection: {
          anchor: paragraphOffsetToPosition(firstParagraph, 0),
          focus: paragraphOffsetToPosition(lastParagraph, getParagraphText(lastParagraph).length),
        },
      });
      options.focusInput();
      return true;
    },
    insertFootnote: () => (options.commandsController.applyInsertFootnoteCommand(), true),
    pastePlainText: () => {
      options.forcePlainTextPaste.set(true);
      options.focusInput();
      return true;
    },
    bold: () => (options.keyboardCommandsController.applyBooleanStyleCommand("bold"), true),
    italic: () => (options.keyboardCommandsController.applyBooleanStyleCommand("italic"), true),
    underline: () => (options.keyboardCommandsController.applyBooleanStyleCommand("underline"), true),
    strike: () => (options.keyboardCommandsController.applyBooleanStyleCommand("strike"), true),
    superscript: () => (options.keyboardCommandsController.applyBooleanStyleCommand("superscript"), true),
    subscript: () => (options.keyboardCommandsController.applyBooleanStyleCommand("subscript"), true),
    alignLeft: () => (options.commandsController.applyParagraphStyleCommand("align", "left"), true),
    alignCenter: () => (options.commandsController.applyParagraphStyleCommand("align", "center"), true),
    alignRight: () => (options.commandsController.applyParagraphStyleCommand("align", "right"), true),
    alignJustify: () => (options.commandsController.applyParagraphStyleCommand("align", "justify"), true),
    orderedList: () => (options.commandsController.applyParagraphListCommand("ordered"), true),
    bulletList: () => (options.commandsController.applyParagraphListCommand("bullet"), true),
    find: () => (options.findReplace.setIsOpen(true), true),
    replace: () => (options.findReplace.setIsOpen(true), true),
    toggleTrackChanges: () => (options.commandsController.applyToggleTrackChangesCommand(), true),
    acceptRevisions: () => (options.commandsController.applyAcceptRevisionsCommand(), true),
    rejectRevisions: () => (options.commandsController.applyRejectRevisionsCommand(), true),
    toggleShowMargins: () => (options.commandsController.applyToggleShowMarginsCommand(), true),
    toggleShowParagraphMarks: () =>
      (options.commandsController.applyToggleShowParagraphMarksCommand(), true),
    pageBreak: () => {
      options.applyTransactionalState((current) =>
        options.tableOps.applyTableAwareParagraphEdit(current, (temp) => insertPageBreakAtSelection(temp)),
      );
      options.focusInput();
      return true;
    },
    lineBreak: () => {
      options.applyTransactionalState((current) =>
        options.tableOps.applyTableAwareParagraphEdit(current, (temp) => insertTextAtSelection(temp, "\n")),
      );
      options.focusInput();
      return true;
    },
    splitBlock: () => {
      if (options.commandsController.handleListEnter()) return true;
      options.applyTransactionalState((current) =>
        options.tableOps.applyTableAwareParagraphEdit(current, (temp) => splitBlockAtSelection(temp)),
      );
      options.focusInput();
      return true;
    },
    setFontFamily: (value: string | null) => (
      options.styleController.applyToolbarValueStyleCommand("fontFamily", value), true
    ),
    setFontSize: (value: number | null) => (
      options.styleController.applyToolbarValueStyleCommand("fontSize", value), true
    ),
    setColor: (value: string | null) => (
      options.styleController.applyToolbarValueStyleCommand("color", value), true
    ),
    setHighlight: (value: string | null) => (
      options.styleController.applyToolbarValueStyleCommand("highlight", value), true
    ),
    setStyleId: (value: string) => (options.commandsController.handleStyleChange(value), true),
    setUnderlineStyle: (value: string | null) =>
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "underlineStyle",
          value: string | null,
        ) => void
      )("underlineStyle", value),
  };

  const essentialsDocument = {
    documentStyles: () =>
      Object.values(options.state().document?.styles ?? {}).map((style) => ({
        id: style.id,
        name: style.name,
        fontFamily: style.textStyle?.fontFamily?.trim() || undefined,
        fontSize:
          typeof style.textStyle?.fontSize === "number" ? style.textStyle.fontSize : undefined,
      })),
    exportDocx: () => void options.docIO.handleExportDocx(),
    exportPdf: () => void options.docIO.handleExportPdf(),
    importDocx: () => options.importInputRef()?.click(),
    insertImage: () => options.imageInputRef()?.click(),
  };

  const essentialsLink = {
    prompt: () => options.commandsController.promptForLink(),
    remove: () => options.commandsController.removeLinkCommand(),
    canPrompt: () =>
      !isSelectionCollapsed(options.state().selection) ||
      Boolean(options.styleController.toolbarStyleState().link),
  };

  const essentialsImage = {
    promptAlt: () => options.commandsController.promptForImageAlt(),
    isSelected: () => Boolean(options.selectedImageRun()),
  };

  const essentialsBrowser = {
    print: () => window.print(),
    copy: () => {
      document.execCommand("copy");
    },
  };

  const essentialsParagraph = {
    togglePageBreakBefore: () =>
      options.commandsController.toggleParagraphFlagCommand("pageBreakBefore"),
    toggleKeepWithNext: () => options.commandsController.toggleParagraphFlagCommand("keepWithNext"),
    setSpacingAfter: (value: number | null) =>
      options.commandsController.applyParagraphStyleCommand("spacingAfter", value),
    setSpacingBefore: (value: number | null) =>
      options.commandsController.applyParagraphStyleCommand("spacingBefore", value),
    setIndentLeft: (value: number | null) =>
      options.commandsController.applyParagraphStyleCommand("indentLeft", value),
    setIndentRight: (value: number | null) =>
      options.commandsController.applyParagraphStyleCommand("indentRight", value),
    setIndentFirstLine: (value: number | null) =>
      options.commandsController.applyParagraphStyleCommand("indentFirstLine", value),
    setIndentHanging: (value: number | null) =>
      options.commandsController.applyParagraphStyleCommand("indentHanging", value),
    setShading: (value: string | null) =>
      options.commandsController.applyParagraphStyleCommand("shading", value),
    applyBorders: () => {
      const border: EditorBorderStyle = { width: 1, type: "solid", color: "#000000" };
      options.applyTransactionalState(
        (current) => {
          let next = setParagraphStyle(current, "borderTop", border);
          next = setParagraphStyle(next, "borderRight", border);
          next = setParagraphStyle(next, "borderBottom", border);
          next = setParagraphStyle(next, "borderLeft", border);
          return next;
        },
        { mergeKey: "paraBorders" },
      );
      options.focusInput();
    },
    setLineHeight: (value: number | null) =>
      options.commandsController.applyParagraphStyleCommand("lineHeight", value),
    setListFormat: (format: string) =>
      options.commandsController.handleListFormatChange(
        format as Parameters<typeof options.commandsController.handleListFormatChange>[0],
      ),
    setListStartAt: (value: number | null) => options.commandsController.handleListStartAtChange(value),
    outdent: () => void options.commandsController.handleListTab("outdent"),
    indent: () => void options.commandsController.handleListTab("indent"),
  };

  const essentialsSection = {
    isLandscape: () => {
      const idx = getActiveSectionIndex(options.state());
      const section = options.state().document.sections?.[idx] ?? options.state().document;
      return section?.pageSettings?.orientation === "landscape";
    },
    toggleOrientation: () => {
      const idx = getActiveSectionIndex(options.state());
      const section = options.state().document.sections?.[idx] ?? options.state().document;
      if (!section) return;
      const current = section.pageSettings?.orientation ?? "portrait";
      options.commandsController.applyUpdateSectionSettingsCommand(idx, {
        pageSettings: {
          ...section.pageSettings!,
          orientation: current === "portrait" ? "landscape" : "portrait",
        },
      });
    },
    breakNextPage: () => options.commandsController.applyInsertSectionBreakCommand("nextPage"),
    breakContinuous: () => options.commandsController.applyInsertSectionBreakCommand("continuous"),
    setPageMargins: (margins: { left?: number; right?: number }) => {
      const idx = getActiveSectionIndex(options.state());
      const section = options.state().document.sections?.[idx] ?? options.state().document;
      if (!section?.pageSettings) return;
      options.commandsController.applyUpdateSectionSettingsCommand(idx, {
        pageSettings: {
          ...section.pageSettings,
          margins: {
            ...section.pageSettings.margins,
            ...margins,
          },
        },
      });
    },
  };

  const essentialsTable = (() => {
    const insideTable = () =>
      Boolean(
        findParagraphTableLocation(
          options.state().document,
          options.state().selection.focus.paragraphId,
          getActiveSectionIndex(options.state()),
        ),
      );
    const apply = (
      producer: (current: EditorState) => EditorState,
      mergeKey: string,
    ) => {
      options.applyTransactionalState(producer, { mergeKey });
      options.focusInput();
    };
    const selectionLabel = (): string | null => {
      const normalized = normalizeSelection(options.state());
      if (normalized.isCollapsed) return null;
      const secIdx = getActiveSectionIndex(options.state());
      const anchorLoc = findParagraphTableLocation(
        options.state().document,
        options.state().selection.anchor.paragraphId,
        secIdx,
      );
      const focusLoc = findParagraphTableLocation(
        options.state().document,
        options.state().selection.focus.paragraphId,
        secIdx,
      );
      if (
        !anchorLoc ||
        !focusLoc ||
        anchorLoc.blockIndex !== focusLoc.blockIndex ||
        (anchorLoc.rowIndex === focusLoc.rowIndex && anchorLoc.cellIndex === focusLoc.cellIndex)
      ) {
        return null;
      }
      const count = options.selectionBoxes().length;
      if (count === 0) return null;
      return `Table selection: ${count} cell${count === 1 ? "" : "s"}`;
    };
    return {
      insideTable,
      selectionLabel,
      canMerge: () => options.tableOps.canMergeSelectedTable(options.state()),
      canSplit: () => options.tableOps.canSplitSelectedTable(options.state()),
      canEditColumn: () => options.tableOps.canEditSelectedTableColumn(options.state()),
      canEditRow: () => options.tableOps.canEditSelectedTableRow(options.state()),
      merge: () => apply((current) => options.tableOps.mergeSelectedTable(current), "mergeTable"),
      split: () => apply((current) => options.tableOps.splitSelectedTable(current), "splitTable"),
      insertColumnBefore: () =>
        apply((current) => options.tableOps.insertSelectedTableColumn(current, -1), "insertTableColumn"),
      insertColumnAfter: () =>
        apply((current) => options.tableOps.insertSelectedTableColumn(current, 1), "insertTableColumn"),
      deleteColumn: () =>
        apply((current) => options.tableOps.deleteSelectedTableColumn(current), "deleteTableColumn"),
      insertRowBefore: () =>
        apply((current) => options.tableOps.insertSelectedTableRow(current, -1), "insertTableRow"),
      insertRowAfter: () =>
        apply((current) => options.tableOps.insertSelectedTableRow(current, 1), "insertTableRow"),
      deleteRow: () => apply((current) => options.tableOps.deleteSelectedTableRow(current), "deleteTableRow"),
      cellShading: (color: string | null) =>
        apply((current) => setTableCellStyleValue(current, "shading", color || null), "tableShading"),
      cellBorders: () =>
        apply(
          (current) => setTableCellBorders(current, { width: 1, type: "solid", color: "#64748b" }),
          "tableBorders",
        ),
      cellNoBorders: () =>
        apply(
          (current) => setTableCellBorders(current, { width: 0, type: "none", color: "transparent" }),
          "tableBorders",
        ),
      width100: () => apply((current) => setTableStyleValue(current, "width", "100%"), "tableWidth"),
      alignLeft: () =>
        apply((current) => setTableCellStyleValue(current, "horizontalAlign", "left"), "tableAlign"),
      alignCenter: () =>
        apply((current) => setTableCellStyleValue(current, "horizontalAlign", "center"), "tableAlign"),
      alignRight: () =>
        apply((current) => setTableCellStyleValue(current, "horizontalAlign", "right"), "tableAlign"),
      setCellWidth: (width: string) =>
        apply((current) => setTableCellWidth(current, width), "tableCellWidth"),
      insert: (rows: number, cols: number) => options.tableOps.insertTableCommand(rows, cols),
    };
  })();

  return createEssentialsPlugin({
    gate: essentialsGate,
    style: essentialsStyle,
    history: essentialsHistory,
    formatting: essentialsFormatting,
    document: essentialsDocument,
    link: essentialsLink,
    image: essentialsImage,
    browser: essentialsBrowser,
    paragraph: essentialsParagraph,
    section: essentialsSection,
    table: essentialsTable,
  });
}
