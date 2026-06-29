import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import {
  insertPageBreakAtSelection,
  setParagraphStyle,
  splitBlockAtSelection,
} from "@/core/commands/block.js";
import { insertShapeAtSelection } from "@/core/commands/shape.js";
import {
  setTableCellBorders,
  setTableCellStyleValue,
  setTableCellWidth,
  setTableStyleValue,
} from "@/core/commands/table.js";
import { insertTextAtSelection } from "@/core/commands/text.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getDocumentParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  resolveNamedTextStyle,
  type EditorBorderStyle,
  type EditorNamedStyle,
  type EditorPageMargins,
  type EditorState,
} from "@/core/model.js";
import { isSelectionCollapsed, normalizeSelection } from "@/core/selection.js";
import {
  insertTableOfContents,
  updateTableOfContents,
  type TocPageNumberResolver,
} from "@/core/commands/tableOfContents.js";
import { projectDocumentLayout } from "@/layoutProjection/index.js";
import {
  createEssentialsPlugin,
  type EssentialsTableCapability,
} from "@/plugins/internal/createEssentialsPlugin.js";
import { togglePreciseFontMode } from "./localFontAccess.js";
import {
  fontSizePtToPx,
  fontSizePxToPt,
  nextFontSizePt,
  previousFontSizePt,
} from "@/ui/fontSizeUnits.js";
import type { TextCaseMode } from "@/core/commands/text.js";
import type { SelectedImageRun } from "@/core/commands/image.js";
import type { createEditorCommandsController } from "@/app/controllers/EditorCommandsController.js";
import type { createEditorHistoryActions } from "@/app/controllers/useEditorHistoryActions.js";
import type { createEditorStyleController } from "@/app/controllers/useEditorStyle.js";
import type { createEditorTableOperations } from "@/app/controllers/useEditorTableOperations.js";
import type { OasisPlugin } from "@/core/plugin.js";
import type { ToolbarStyleState } from "@/ui/toolbarStyleState.js";

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

export function createEditorEssentialsRuntimePlugin(
  options: CreateEditorEssentialsPluginOptions,
): OasisPlugin {
  const essentialsGate = {
    isCommandEnabled: (commandName: string): boolean =>
      !options.isReadOnly() &&
      (commandName !== "insertFootnote" ||
        options.commandsController.canInsertFootnoteCommand()),
  };

  const essentialsStyle = {
    state: (): ToolbarStyleState => options.styleController.toolbarStyleState(),
  };

  const essentialsSelection = {
    isCollapsed: (): boolean => isSelectionCollapsed(options.state().selection),
  };

  const stepFontSize = (direction: "increase" | "decrease"): boolean => {
    const currentPx = Number(
      options.styleController.toolbarStyleState().fontSize,
    );
    const currentPt =
      Number.isFinite(currentPx) && currentPx > 0
        ? fontSizePxToPt(currentPx)
        : 11;
    const nextPt =
      direction === "increase"
        ? nextFontSizePt(currentPt)
        : previousFontSizePt(currentPt);
    options.styleController.applyToolbarValueStyleCommand(
      "fontSize",
      fontSizePtToPx(nextPt),
    );
    return true;
  };

  const essentialsHistory = {
    canUndo: (): boolean => options.undoStack().length > 0,
    canRedo: (): boolean => options.redoStack().length > 0,
    undo: (): true => (options.historyActions.performUndo(), true),
    redo: (): true => (options.historyActions.performRedo(), true),
  };

  // Resolve each heading paragraph's printed page number by paginating the
  // current document, mirroring how PAGE fields resolve (page index + 1).
  const buildTocPageResolver = (state: EditorState): TocPageNumberResolver => {
    const layout = projectDocumentLayout(state.document);
    const pageByParagraph = new Map<string, number>();
    for (const page of layout.pages) {
      for (const block of page.blocks) {
        const paragraphId = block.paragraphId;
        if (paragraphId && !pageByParagraph.has(paragraphId)) {
          pageByParagraph.set(paragraphId, page.index + 1);
        }
      }
    }
    return (headingId: string): number | undefined =>
      pageByParagraph.get(headingId);
  };

  const essentialsFormatting = {
    selectAll: (): boolean => {
      const paragraphs = getDocumentParagraphs(options.state().document);
      if (paragraphs.length === 0) return false;
      const firstParagraph = paragraphs[0]!;
      const lastParagraph = paragraphs[paragraphs.length - 1]!;
      options.applyState({
        ...options.state(),
        selection: {
          anchor: paragraphOffsetToPosition(firstParagraph, 0),
          focus: paragraphOffsetToPosition(
            lastParagraph,
            getParagraphText(lastParagraph).length,
          ),
        },
      });
      options.focusInput();
      return true;
    },
    insertFootnote: (): true => (
      options.commandsController.applyInsertFootnoteCommand(),
      true
    ),
    insertTableOfContents: (): boolean => {
      options.applyTransactionalState(
        (current): EditorState =>
          insertTableOfContents(current, buildTocPageResolver(current)),
      );
      options.focusInput();
      return true;
    },
    updateTableOfContents: (): boolean => {
      options.applyTransactionalState(
        (current): EditorState =>
          updateTableOfContents(current, buildTocPageResolver(current)),
      );
      options.focusInput();
      return true;
    },
    pastePlainText: (): boolean => {
      options.forcePlainTextPaste.set(true);
      options.focusInput();
      return true;
    },
    bold: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("bold"),
      true
    ),
    italic: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("italic"),
      true
    ),
    underline: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("underline"),
      true
    ),
    strike: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("strike"),
      true
    ),
    superscript: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand(
        "superscript",
      ),
      true
    ),
    subscript: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("subscript"),
      true
    ),
    alignLeft: (): true => (
      options.commandsController.applyParagraphStyleCommand("align", "left"),
      true
    ),
    alignCenter: (): true => (
      options.commandsController.applyParagraphStyleCommand("align", "center"),
      true
    ),
    alignRight: (): true => (
      options.commandsController.applyParagraphStyleCommand("align", "right"),
      true
    ),
    alignJustify: (): true => (
      options.commandsController.applyParagraphStyleCommand("align", "justify"),
      true
    ),
    orderedList: (): true => (
      options.commandsController.applyParagraphListCommand("ordered"),
      true
    ),
    bulletList: (): true => (
      options.commandsController.applyParagraphListCommand("bullet"),
      true
    ),
    find: (): true => (options.findReplace.setIsOpen(true), true),
    replace: (): true => (options.findReplace.setIsOpen(true), true),
    toggleTrackChanges: (): true => (
      options.commandsController.applyToggleTrackChangesCommand(),
      true
    ),
    acceptRevisions: (): true => (
      options.commandsController.applyAcceptRevisionsCommand(),
      true
    ),
    rejectRevisions: (): true => (
      options.commandsController.applyRejectRevisionsCommand(),
      true
    ),
    toggleShowMargins: (): true => (
      options.commandsController.applyToggleShowMarginsCommand(),
      true
    ),
    toggleShowParagraphMarks: (): true => (
      options.commandsController.applyToggleShowParagraphMarksCommand(),
      true
    ),
    togglePreciseFonts: (): true => (void togglePreciseFontMode(), true),
    pageBreak: (): boolean => {
      options.applyTransactionalState(
        (current): EditorState =>
          options.tableOps.applyTableAwareParagraphEdit(
            current,
            (temp): EditorState => insertPageBreakAtSelection(temp),
          ),
      );
      options.focusInput();
      return true;
    },
    lineBreak: (): boolean => {
      options.applyTransactionalState(
        (current): EditorState =>
          options.tableOps.applyTableAwareParagraphEdit(
            current,
            (temp): EditorState => insertTextAtSelection(temp, "\n"),
          ),
      );
      options.focusInput();
      return true;
    },
    splitBlock: (): boolean => {
      if (options.commandsController.handleListEnter()) return true;
      options.applyTransactionalState(
        (current): EditorState =>
          options.tableOps.applyTableAwareParagraphEdit(
            current,
            (temp): EditorState => splitBlockAtSelection(temp),
          ),
      );
      options.focusInput();
      return true;
    },
    setFontFamily: (value: string | null): true => (
      options.styleController.applyToolbarValueStyleCommand(
        "fontFamily",
        value,
      ),
      true
    ),
    setFontSize: (value: number | null): true => (
      options.styleController.applyToolbarValueStyleCommand("fontSize", value),
      true
    ),
    increaseFontSize: (): boolean => stepFontSize("increase"),
    decreaseFontSize: (): boolean => stepFontSize("decrease"),
    changeTextCase: (mode: TextCaseMode): true => (
      options.commandsController.applyChangeTextCaseCommand(mode),
      true
    ),
    clearFormatting: (): boolean => {
      if (isSelectionCollapsed(options.state().selection)) {
        options.styleController.clearPendingCaretTextStyle();
        options.focusInput();
        return true;
      }
      options.commandsController.applyClearFormattingCommand();
      return true;
    },
    setColor: (value: string | null): true => (
      options.styleController.applyToolbarValueStyleCommand("color", value),
      true
    ),
    setHighlight: (value: string | null): true => (
      options.styleController.applyToolbarValueStyleCommand("highlight", value),
      true
    ),
    setTextShading: (value: string | null): true => (
      options.styleController.applyToolbarValueStyleCommand("shading", value),
      true
    ),
    setStyleId: (value: string): true => (
      options.commandsController.handleStyleChange(value),
      true
    ),
    setCharacterStyleId: (value: string): true => (
      options.styleController.applyToolbarValueStyleCommand(
        "styleId",
        value || null,
      ),
      true
    ),
    setUnderlineStyle: (value: string | null): void =>
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "underlineStyle",
          value: string | null,
        ) => void
      )("underlineStyle", value),
  };

  const essentialsDocument = {
    documentStyles: (): Array<{
      id: string;
      name: string;
      type: EditorNamedStyle["type"];
      qFormat: EditorNamedStyle["qFormat"];
      uiPriority: EditorNamedStyle["uiPriority"];
      semiHidden: EditorNamedStyle["semiHidden"];
      unhideWhenUsed: EditorNamedStyle["unhideWhenUsed"];
      isUsed: boolean;
      fontFamily: string | undefined;
      fontSize: number | undefined;
      color: string | undefined;
      bold: boolean | undefined;
      italic: boolean | undefined;
    }> => {
      const document = options.state().document;
      const styles = document?.styles ?? {};
      const usedStyleIds = new Set<string>();
      for (const paragraph of getDocumentParagraphs(document)) {
        if (paragraph.style?.styleId) usedStyleIds.add(paragraph.style.styleId);
        for (const run of paragraph.runs) {
          if (run.styles?.styleId) usedStyleIds.add(run.styles.styleId);
        }
      }
      return Object.values(styles).map((style) => {
        const preview = resolveNamedTextStyle(style.id, styles);
        return {
          id: style.id,
          name: style.name,
          type: style.type,
          qFormat: style.qFormat,
          uiPriority: style.uiPriority,
          semiHidden: style.semiHidden,
          unhideWhenUsed: style.unhideWhenUsed,
          isUsed: usedStyleIds.has(style.id),
          fontFamily: preview.fontFamily?.trim() || undefined,
          fontSize:
            typeof preview.fontSize === "number" ? preview.fontSize : undefined,
          color: preview.color ?? undefined,
          bold: preview.bold ?? undefined,
          italic: preview.italic ?? undefined,
        };
      });
    },
    exportDocx: (): undefined => void options.docIO.handleExportDocx(),
    exportPdf: (): undefined => void options.docIO.handleExportPdf(),
    importDocument: (): void | undefined => options.importInputRef()?.click(),
    insertImage: (): void | undefined => options.imageInputRef()?.click(),
    insertShape: (preset: string): void =>
      options.applyTransactionalState(
        (current): EditorState => insertShapeAtSelection(current, preset),
      ),
  };

  const essentialsLink = {
    prompt: (): void => options.commandsController.promptForLink(),
    remove: (): void => options.commandsController.removeLinkCommand(),
    canPrompt: (): boolean =>
      !isSelectionCollapsed(options.state().selection) ||
      Boolean(options.styleController.toolbarStyleState().link),
  };

  const essentialsImage = {
    promptAlt: (): void => options.commandsController.promptForImageAlt(),
    promptCaption: (): void =>
      options.commandsController.promptForImageCaption(),
    isSelected: (): boolean => Boolean(options.selectedImageRun()),
  };

  const essentialsBrowser = {
    print: (): void => window.print(),
    copy: (): void => {
      document.execCommand("copy");
    },
  };

  const essentialsParagraph = {
    togglePageBreakBefore: (): void =>
      options.commandsController.toggleParagraphFlagCommand("pageBreakBefore"),
    toggleKeepWithNext: (): void =>
      options.commandsController.toggleParagraphFlagCommand("keepWithNext"),
    setSpacingAfter: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "spacingAfter",
        value,
      ),
    setSpacingBefore: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "spacingBefore",
        value,
      ),
    setIndentLeft: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "indentLeft",
        value,
      ),
    setIndentRight: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "indentRight",
        value,
      ),
    setIndentFirstLine: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "indentFirstLine",
        value,
      ),
    setIndentHanging: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "indentHanging",
        value,
      ),
    setSpecialIndent: (
      kind: "none" | "firstLine" | "hanging",
      value?: number | null,
    ): void => {
      const resolvedValue = value ?? 48;
      options.applyTransactionalState(
        (current): EditorState => {
          let next = setParagraphStyle(current, "indentFirstLine", null);
          next = setParagraphStyle(next, "indentHanging", null);
          if (kind === "firstLine") {
            next = setParagraphStyle(next, "indentFirstLine", resolvedValue);
          } else if (kind === "hanging") {
            next = setParagraphStyle(next, "indentHanging", resolvedValue);
          }
          return next;
        },
        { mergeKey: MERGE_KEYS.specialIndent },
      );
      options.focusInput();
    },
    setShading: (value: string | null): void =>
      options.commandsController.applyParagraphStyleCommand("shading", value),
    applyBorders: (): void => {
      const border: EditorBorderStyle = {
        width: 1,
        type: "solid",
        color: "#000000",
      };
      options.applyTransactionalState(
        (current): EditorState => {
          let next = setParagraphStyle(current, "borderTop", border);
          next = setParagraphStyle(next, "borderRight", border);
          next = setParagraphStyle(next, "borderBottom", border);
          next = setParagraphStyle(next, "borderLeft", border);
          return next;
        },
        { mergeKey: MERGE_KEYS.paraBorders },
      );
      options.focusInput();
    },
    setLineHeight: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "lineHeight",
        value,
      ),
    setListFormat: (format: string): void =>
      options.commandsController.handleListFormatChange(
        format as Parameters<
          typeof options.commandsController.handleListFormatChange
        >[0],
      ),
    setListStartAt: (value: number | null): void =>
      options.commandsController.handleListStartAtChange(value),
    outdent: (): undefined =>
      void options.commandsController.handleListTab("outdent"),
    indent: (): undefined =>
      void options.commandsController.handleListTab("indent"),
  };

  const essentialsSection = {
    isLandscape: (): boolean => {
      const idx = getActiveSectionIndex(options.state());
      const section =
        options.state().document.sections?.[idx] ?? options.state().document;
      return section?.pageSettings?.orientation === "landscape";
    },
    setOrientation: (orientation: "portrait" | "landscape"): void => {
      const idx = getActiveSectionIndex(options.state());
      const section =
        options.state().document.sections?.[idx] ?? options.state().document;
      if (!section) return;
      options.commandsController.applyUpdateSectionSettingsCommand(idx, {
        pageSettings: {
          ...section.pageSettings!,
          orientation,
        },
      });
    },
    toggleOrientation: (): void => {
      const idx = getActiveSectionIndex(options.state());
      const section =
        options.state().document.sections?.[idx] ?? options.state().document;
      if (!section) return;
      const current = section.pageSettings?.orientation ?? "portrait";
      essentialsSection.setOrientation(
        current === "portrait" ? "landscape" : "portrait",
      );
    },
    breakNextPage: (): void =>
      options.commandsController.applyInsertSectionBreakCommand("nextPage"),
    breakContinuous: (): void =>
      options.commandsController.applyInsertSectionBreakCommand("continuous"),
    getMargins: (): EditorPageMargins | undefined => {
      const idx = getActiveSectionIndex(options.state());
      const section =
        options.state().document.sections?.[idx] ?? options.state().document;
      return section?.pageSettings?.margins;
    },
    setPageMargins: (margins: Partial<EditorPageMargins>): void => {
      const idx = getActiveSectionIndex(options.state());
      const section =
        options.state().document.sections?.[idx] ?? options.state().document;
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

  const buildEssentialsTable = (): EssentialsTableCapability => {
    const insideTable = (): boolean =>
      Boolean(
        findParagraphTableLocation(
          options.state().document,
          options.state().selection.focus.paragraphId,
          getActiveSectionIndex(options.state()),
        ),
      );
    const apply = (
      producer: (current: EditorState) => EditorState,
      mergeKey: MergeKey,
    ): void => {
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
        (anchorLoc.rowIndex === focusLoc.rowIndex &&
          anchorLoc.cellIndex === focusLoc.cellIndex)
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
      canMerge: (): boolean =>
        options.tableOps.canMergeSelectedTable(options.state()),
      canSplit: (): boolean =>
        options.tableOps.canSplitSelectedTable(options.state()),
      canEditColumn: (): boolean =>
        options.tableOps.canEditSelectedTableColumn(options.state()),
      canEditRow: (): boolean =>
        options.tableOps.canEditSelectedTableRow(options.state()),
      merge: (): void =>
        apply(
          (current): EditorState =>
            options.tableOps.mergeSelectedTable(current),
          MERGE_KEYS.mergeTable,
        ),
      split: (): void =>
        apply(
          (current): EditorState =>
            options.tableOps.splitSelectedTable(current),
          MERGE_KEYS.splitTable,
        ),
      insertColumnBefore: (): void =>
        apply(
          (current): EditorState =>
            options.tableOps.insertSelectedTableColumn(current, -1),
          MERGE_KEYS.insertTableColumn,
        ),
      insertColumnAfter: (): void =>
        apply(
          (current): EditorState =>
            options.tableOps.insertSelectedTableColumn(current, 1),
          MERGE_KEYS.insertTableColumn,
        ),
      deleteColumn: (): void =>
        apply(
          (current): EditorState =>
            options.tableOps.deleteSelectedTableColumn(current),
          MERGE_KEYS.deleteTableColumn,
        ),
      insertRowBefore: (): void =>
        apply(
          (current): EditorState =>
            options.tableOps.insertSelectedTableRow(current, -1),
          MERGE_KEYS.insertTableRow,
        ),
      insertRowAfter: (): void =>
        apply(
          (current): EditorState =>
            options.tableOps.insertSelectedTableRow(current, 1),
          MERGE_KEYS.insertTableRow,
        ),
      deleteRow: (): void =>
        apply(
          (current): EditorState =>
            options.tableOps.deleteSelectedTableRow(current),
          MERGE_KEYS.deleteTableRow,
        ),
      cellShading: (color: string | null): void =>
        apply(
          (current): EditorState =>
            setTableCellStyleValue(current, "shading", color || null),
          MERGE_KEYS.tableShading,
        ),
      cellBorders: (): void =>
        apply(
          (current): EditorState =>
            setTableCellBorders(current, {
              width: 1,
              type: "solid",
              color: "#64748b",
            }),
          MERGE_KEYS.tableBorders,
        ),
      cellNoBorders: (): void =>
        apply(
          (current): EditorState =>
            setTableCellBorders(current, {
              width: 0,
              type: "none",
              color: "transparent",
            }),
          MERGE_KEYS.tableBorders,
        ),
      width100: (): void =>
        apply(
          (current): EditorState =>
            setTableStyleValue(current, "width", "100%"),
          MERGE_KEYS.tableWidth,
        ),
      alignLeft: (): void =>
        apply(
          (current): EditorState =>
            setTableCellStyleValue(current, "horizontalAlign", "left"),
          MERGE_KEYS.tableAlign,
        ),
      alignCenter: (): void =>
        apply(
          (current): EditorState =>
            setTableCellStyleValue(current, "horizontalAlign", "center"),
          MERGE_KEYS.tableAlign,
        ),
      alignRight: (): void =>
        apply(
          (current): EditorState =>
            setTableCellStyleValue(current, "horizontalAlign", "right"),
          MERGE_KEYS.tableAlign,
        ),
      setCellWidth: (width: string): void =>
        apply(
          (current): EditorState => setTableCellWidth(current, width),
          MERGE_KEYS.tableCellWidth,
        ),
      insert: (rows: number, cols: number): void =>
        options.tableOps.insertTableCommand(rows, cols),
    };
  };
  const essentialsTable = buildEssentialsTable();

  return createEssentialsPlugin({
    gate: essentialsGate,
    style: essentialsStyle,
    selection: essentialsSelection,
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
