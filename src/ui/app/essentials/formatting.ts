import {
  insertPageBreakAtSelection,
  splitBlockAtSelection,
} from "@/core/commands/block.js";
import {
  insertColumnBreakAtSelection,
  insertMathAtSelection,
  insertTextAtSelection,
  nudgeFontSize,
  updateMathRun,
} from "@/core/commands/text.js";
import { replaceAllInDocument } from "@/core/commands/findReplace.js";
import { insertSpecialCharacter } from "@/core/commands/specialChar.js";
import {
  getNoteOptions,
  setNoteOptions as setNoteOptionsCore,
} from "@/core/commands/noteOptions.js";
import { MERGE_KEYS } from "@/core/transactionMergeKeys.js";
import {
  getDocumentParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  type EditorState,
} from "@/core/model.js";
import {
  selectCollapse,
  selectParagraph,
  selectRange,
  selectSentence,
  selectTextOccurrence,
  selectWord,
} from "@/core/commands/selectUnit.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import {
  hasRevisionsInDocument,
  hasRevisionsInSelection,
} from "@/core/commands/history.js";
import {
  collectNavigableRevisions,
  collectNavigableComments,
  navigateRevision,
  navigateComment,
  getSelectedReviewComment,
} from "@/core/commands/reviewNavigation.js";
import {
  insertTableOfContents,
  updateTableOfContents,
  hasTableOfContents,
  type TocPageNumberResolver,
} from "@/core/commands/tableOfContents.js";
import { projectDocumentLayout } from "@/layoutProjection/index.js";
import {
  fontSizePtToPx,
  fontSizePxToPt,
  nextFontSizePt,
  previousFontSizePt,
} from "@/ui/fontSizeUnits.js";
import type { TextCaseMode } from "@/core/commands/text.js";
import type { EssentialsFormattingCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { EditorMathExpression } from "@/core/model.js";
import { togglePreciseFontMode } from "../localFontAccess.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsFormatting(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsFormattingCapability {
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

  return {
    formatPainterOnce: options.formatPainter.armOnce,
    formatPainterContinuous: options.formatPainter.armContinuous,
    cancelFormatPainter: (): boolean => {
      options.formatPainter.cancel();
      return true;
    },
    formatPainterMode: options.formatPainter.mode,
    canCaptureFormatPainter: options.formatPainter.canCapture,
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
    selectWord: (): boolean => {
      if (options.isReadOnly()) return false;
      options.applyState(selectWord(options.state()));
      options.focusInput();
      return true;
    },
    selectSentence: (): boolean => {
      if (options.isReadOnly()) return false;
      options.applyState(selectSentence(options.state()));
      options.focusInput();
      return true;
    },
    selectParagraph: (): boolean => {
      if (options.isReadOnly()) return false;
      options.applyState(selectParagraph(options.state()));
      options.focusInput();
      return true;
    },
    selectCollapse: (end = false): boolean => {
      if (options.isReadOnly()) return false;
      options.applyState(selectCollapse(options.state(), end));
      options.focusInput();
      return true;
    },
    selectText: (text: string, occurrence = 1): boolean => {
      if (text.length === 0) return false;
      options.applyState(
        selectTextOccurrence(options.state(), text, occurrence),
      );
      options.focusInput();
      return true;
    },
    selectRange: (anchor, focus): boolean => {
      options.applyState(selectRange(options.state(), anchor, focus));
      options.focusInput();
      return true;
    },
    insertFootnote: (): true => (
      options.commandsController.applyInsertFootnoteCommand(),
      true
    ),
    setNoteOptions: (optionsInput): void => {
      options.applyTransactionalState((current): EditorState =>
        setNoteOptionsCore(current, {
          kind: optionsInput.kind,
          ...(optionsInput.numberFormat !== undefined
            ? {
                numberFormat:
                  optionsInput.numberFormat === null
                    ? null
                    : (optionsInput.numberFormat as import("@/core/model.js").EditorFootnoteNumberFormat),
              }
            : {}),
          ...(optionsInput.startAt !== undefined
            ? { startAt: optionsInput.startAt }
            : {}),
          ...(optionsInput.restart !== undefined
            ? {
                restart:
                  optionsInput.restart === null
                    ? null
                    : (optionsInput.restart as import("@/core/model.js").EditorFootnoteRestart),
              }
            : {}),
        }),
      );
      options.focusInput();
    },
    getNoteOptions: (kind) => getNoteOptions(options.state(), kind),
    insertText: (text: string, fontFamily?: string | null): boolean => {
      if (text.length === 0) return false;
      const styleOverride = fontFamily ? { fontFamily } : undefined;
      options.applyTransactionalState((current): EditorState =>
        options.tableOps.applyTableAwareParagraphEdit(
          current,
          (temp): EditorState =>
            insertTextAtSelection(temp, text, styleOverride),
        ),
      );
      options.focusInput();
      return true;
    },
    insertEquation: (expression: EditorMathExpression): boolean => {
      options.applyTransactionalState((current): EditorState =>
        options.tableOps.applyTableAwareParagraphEdit(
          current,
          (temp): EditorState => insertMathAtSelection(temp, expression),
        ),
      );
      options.focusInput();
      return true;
    },
    updateEquation: (
      runId: string,
      expression: EditorMathExpression,
    ): boolean => {
      options.applyTransactionalState((current): EditorState =>
        updateMathRun(current, runId, expression),
      );
      options.focusInput();
      return true;
    },
    hasTableOfContents: (): boolean => hasTableOfContents(options.state()),
    hasRevisionsInSelection: (): boolean =>
      hasRevisionsInSelection(options.state()),
    hasRevisionsInDocument: (): boolean =>
      hasRevisionsInDocument(options.state()),
    hasNavigableRevisions: (): boolean =>
      collectNavigableRevisions(options.state()).length > 0,
    hasNavigableComments: (): boolean =>
      collectNavigableComments(options.state()).length > 0,
    canCreateComment: options.commentComposer.canCreate,
    canReplyToComment: options.commentComposer.canReply,
    newComment: options.commentComposer.openNew,
    replyComment: options.commentComposer.openReply,
    editComment: options.commentComposer.openEdit,
    toggleCommentsPanel: options.commentComposer.togglePanel,
    isCommentsPanelOpen: options.commentComposer.panelOpen,
    canEditComment: options.commentComposer.canEdit,
    navigateRevisionNext: (): boolean => {
      const current = options.state();
      const next = navigateRevision(current, "next");
      if (next === current) return false;
      options.applyState(next);
      options.focusInput();
      return true;
    },
    navigateRevisionPrevious: (): boolean => {
      const current = options.state();
      const next = navigateRevision(current, "previous");
      if (next === current) return false;
      options.applyState(next);
      options.focusInput();
      return true;
    },
    navigateCommentNext: (): boolean => {
      const current = options.state();
      const next = navigateComment(current, "next");
      if (next === current) return false;
      options.applyState(next);
      options.focusInput();
      return true;
    },
    navigateCommentPrevious: (): boolean => {
      const current = options.state();
      const next = navigateComment(current, "previous");
      if (next === current) return false;
      options.applyState(next);
      options.focusInput();
      return true;
    },
    hasSelectedComment: (): boolean =>
      getSelectedReviewComment(options.state()) !== null,
    isSelectedCommentResolved: (): boolean =>
      Boolean(getSelectedReviewComment(options.state())?.resolved),
    canManageSelectedComment: options.commentComposer.canResolveSelected,
    resolveSelectedComment: (): boolean =>
      options.commentComposer.resolveSelected(true),
    reopenSelectedComment: (): boolean =>
      options.commentComposer.resolveSelected(false),
    deleteSelectedComment: options.commentComposer.deleteSelected,
    canDeleteSelectedComment: options.commentComposer.canDeleteSelected,
    insertTableOfContents: (): boolean => {
      options.applyTransactionalState((current): EditorState =>
        insertTableOfContents(current, buildTocPageResolver(current)),
      );
      options.focusInput();
      return true;
    },
    updateTableOfContents: (): boolean => {
      options.applyTransactionalState((current): EditorState =>
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
    doubleUnderline: (): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "underlineStyle",
          value: string | null,
        ) => void
      )("underlineStyle", "double"),
      options.keyboardCommandsController.applyBooleanStyleCommand("underline"),
      true
    ),
    wordUnderline: (): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "underlineStyle",
          value: string | null,
        ) => void
      )("underlineStyle", "words"),
      options.keyboardCommandsController.applyBooleanStyleCommand("underline"),
      true
    ),
    strike: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("strike"),
      true
    ),
    doubleStrike: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand(
        "doubleStrike",
      ),
      true
    ),
    smallCaps: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("smallCaps"),
      true
    ),
    allCaps: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("allCaps"),
      true
    ),
    hidden: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("hidden"),
      true
    ),
    noProof: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("noProof"),
      true
    ),
    webHidden: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("webHidden"),
      true
    ),
    specVanish: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("specVanish"),
      true
    ),
    toggleCharacterBorder: (): true => (
      options.keyboardCommandsController.applyToggleCharacterBorderCommand(),
      true
    ),
    shadow: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("shadow"),
      true
    ),
    emboss: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("emboss"),
      true
    ),
    engrave: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("imprint"),
      true
    ),
    outline: (): true => (
      options.keyboardCommandsController.applyBooleanStyleCommand("outline"),
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
    replaceAll: (payload): true => {
      if (options.isReadOnly()) return true;
      options.applyTransactionalState(
        (current): EditorState =>
          replaceAllInDocument(current, payload.search, payload.replace, {
            matchCase: payload.matchCase,
            wholeWord: payload.wholeWord,
          }),
        { mergeKey: MERGE_KEYS.findReplaceAll },
      );
      options.focusInput();
      return true;
    },
    isTrackChangesEnabled: (): boolean =>
      Boolean(options.state().trackChangesEnabled),
    areMarginsVisible: (): boolean => Boolean(options.state().showMargins),
    areParagraphMarksVisible: (): boolean =>
      Boolean(options.state().showParagraphMarks),
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
    acceptAllRevisions: (): true => (
      options.commandsController.applyAcceptAllRevisionsCommand(),
      true
    ),
    rejectAllRevisions: (): true => (
      options.commandsController.applyRejectAllRevisionsCommand(),
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
      options.applyTransactionalState((current): EditorState =>
        options.tableOps.applyTableAwareParagraphEdit(
          current,
          (temp): EditorState => insertPageBreakAtSelection(temp),
        ),
      );
      options.focusInput();
      return true;
    },
    lineBreak: (): boolean => {
      options.applyTransactionalState((current): EditorState =>
        options.tableOps.applyTableAwareParagraphEdit(
          current,
          (temp): EditorState => insertTextAtSelection(temp, "\n"),
        ),
      );
      options.focusInput();
      return true;
    },
    columnBreak: (): boolean => {
      options.applyTransactionalState((current): EditorState =>
        options.tableOps.applyTableAwareParagraphEdit(
          current,
          (temp): EditorState => insertColumnBreakAtSelection(temp),
        ),
      );
      options.focusInput();
      return true;
    },
    splitBlock: (): boolean => {
      if (options.commandsController.handleListEnter()) return true;
      options.applyTransactionalState((current): EditorState =>
        options.tableOps.applyTableAwareParagraphEdit(
          current,
          (temp): EditorState => splitBlockAtSelection(temp),
        ),
      );
      options.focusInput();
      return true;
    },
    insertSpecialChar: (kind): boolean => {
      options.applyTransactionalState((current): EditorState =>
        options.tableOps.applyTableAwareParagraphEdit(
          current,
          (temp): EditorState => insertSpecialCharacter(temp, kind),
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
    growFont1: (): true => {
      options.applyTransactionalState((current): EditorState =>
        nudgeFontSize(current, 1),
      );
      options.focusInput();
      return true;
    },
    shrinkFont1: (): true => {
      options.applyTransactionalState((current): EditorState =>
        nudgeFontSize(current, -1),
      );
      options.focusInput();
      return true;
    },
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
    setUnderlineColor: (value: string | null): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "underlineColor",
          value: string | null,
        ) => void
      )("underlineColor", value),
      true
    ),
    setCharacterScale: (value: number | null): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "characterScale",
          value: number | null,
        ) => void
      )("characterScale", value),
      true
    ),
    setCharacterSpacing: (value: number | null): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "characterSpacing",
          value: number | null,
        ) => void
      )("characterSpacing", value),
      true
    ),
    setBaselineShift: (value: number | null): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "baselineShift",
          value: number | null,
        ) => void
      )("baselineShift", value),
      true
    ),
    setEmphasisMark: (value: string | null): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "emphasisMark",
          value: string | null,
        ) => void
      )("emphasisMark", value),
      true
    ),
    setKerning: (value: number | null): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "kerningThreshold",
          value: number | null,
        ) => void
      )("kerningThreshold", value),
      true
    ),
    setLigatures: (value: string | null): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "ligatures",
          value: string | null,
        ) => void
      )("ligatures", value || null),
      true
    ),
    setNumberSpacing: (value: string | null): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "numberSpacing",
          value: string | null,
        ) => void
      )("numberSpacing", value || null),
      true
    ),
    setNumberForm: (value: string | null): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "numberForm",
          value: string | null,
        ) => void
      )("numberForm", value || null),
      true
    ),
    setStylisticSet: (value: number | null): true => (
      (
        options.styleController.applyToolbarValueStyleCommand as (
          key: "stylisticSet",
          value: number | null,
        ) => void
      )("stylisticSet", value),
      true
    ),
  };
}
