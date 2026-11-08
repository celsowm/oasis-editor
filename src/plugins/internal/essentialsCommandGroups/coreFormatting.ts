import type { OasisPlugin } from "@/core/plugin.js";
import type { TextCaseMode } from "@/core/commands/text.js";
import type {
  ActionCommandBuilder,
  CommandBuilder,
  ValueCommandBuilder,
} from "../essentialsCommandBuilders.js";
import { formatFontSizePt, parseFontSizePtToPx } from "@/ui/fontSizeUnits.js";
import {
  isPreciseFontModeEnabled,
  preciseFontModeVersion,
} from "@/text/fonts/preciseFontMode.js";
import type {
  EssentialsFeatureGate,
  EssentialsFormattingCapability,
  EssentialsHistoryCapability,
  EssentialsLinkCapability,
  EssentialsSelectionCapability,
  EssentialsStyleCapability,
} from "../essentialsCapabilities.js";

interface CoreFormattingGroupDeps {
  gate: EssentialsFeatureGate;
  style: EssentialsStyleCapability;
  selection: EssentialsSelectionCapability;
  history: EssentialsHistoryCapability;
  formatting: EssentialsFormattingCapability;
  link: EssentialsLinkCapability;
  command: CommandBuilder;
  valueCommand: ValueCommandBuilder;
  actionCommand: ActionCommandBuilder;
}

export function buildCoreFormattingCommands({
  gate,
  style,
  selection,
  history,
  formatting,
  link,
  command,
  valueCommand,
  actionCommand,
}: CoreFormattingGroupDeps): NonNullable<OasisPlugin["commands"]> {
  const s = style.state;
  return {
    selectAll: command("selectAll", formatting.selectAll),
    selectWord: command("selectWord", formatting.selectWord),
    selectSentence: command("selectSentence", formatting.selectSentence),
    selectParagraph: command("selectParagraph", formatting.selectParagraph),
    insertFootnote: command("insertFootnote", formatting.insertFootnote),
    insertTableOfContents: command(
      "insertTableOfContents",
      formatting.insertTableOfContents,
    ),
    updateTableOfContents: command(
      "updateTableOfContents",
      formatting.updateTableOfContents,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("updateTableOfContents") &&
          formatting.hasTableOfContents(),
      }),
    ),
    insertText: actionCommand("insertText", (p): void => {
      const payload =
        typeof p === "object" && p !== null && "text" in p
          ? (p as { text?: unknown; fontFamily?: unknown })
          : { text: p };
      formatting.insertText(
        String(payload.text ?? ""),
        typeof payload.fontFamily === "string" ? payload.fontFamily : null,
      );
    }),
    insertEquation: actionCommand("insertEquation", (p): void => {
      formatting.insertEquation(
        p as Parameters<typeof formatting.insertEquation>[0],
      );
    }),
    updateEquation: actionCommand("updateEquation", (p): void => {
      const payload = p as Parameters<
        typeof formatting.updateEquation
      >[1] extends never
        ? never
        : {
            runId: string;
            expression: Parameters<typeof formatting.updateEquation>[1];
          };
      formatting.updateEquation(payload.runId, payload.expression);
    }),
    pastePlainText: command("pastePlainText", formatting.pastePlainText),
    formatPainter: command(
      "formatPainter",
      formatting.formatPainterOnce,
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("formatPainter") &&
          formatting.canCaptureFormatPainter(),
        isActive: formatting.formatPainterMode() !== null,
      }),
    ),
    formatPainterContinuous: command(
      "formatPainterContinuous",
      formatting.formatPainterContinuous,
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("formatPainterContinuous") &&
          formatting.canCaptureFormatPainter(),
        isActive: formatting.formatPainterMode() === "continuous",
      }),
    ),
    cancelFormatPainter: command(
      "cancelFormatPainter",
      formatting.cancelFormatPainter,
      (): { isEnabled: boolean } => ({
        isEnabled: formatting.formatPainterMode() !== null,
      }),
    ),
    bold: command("bold", formatting.bold, (): { isActive: boolean } => ({
      isActive: Boolean(s().bold),
    })),
    italic: command("italic", formatting.italic, (): { isActive: boolean } => ({
      isActive: Boolean(s().italic),
    })),
    underline: command(
      "underline",
      formatting.underline,
      (): { isActive: boolean } => ({
        isActive: Boolean(s().underline),
      }),
    ),
    strike: command("strike", formatting.strike, (): { isActive: boolean } => ({
      isActive: Boolean(s().strike),
    })),
    superscript: command(
      "superscript",
      formatting.superscript,
      (): { isActive: boolean } => ({
        isActive: Boolean(s().superscript),
      }),
    ),
    subscript: command(
      "subscript",
      formatting.subscript,
      (): { isActive: boolean } => ({
        isActive: Boolean(s().subscript),
      }),
    ),
    link: command(
      "link",
      (): true => (link.prompt(), true),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: gate.isCommandEnabled("link") && link.canPrompt(),
        isActive: Boolean(s().link),
      }),
    ),
    alignLeft: command(
      "alignLeft",
      formatting.alignLeft,
      (): { isActive: boolean } => ({
        isActive: s().align === "left",
      }),
    ),
    alignCenter: command(
      "alignCenter",
      formatting.alignCenter,
      (): { isActive: boolean } => ({
        isActive: s().align === "center",
      }),
    ),
    alignRight: command(
      "alignRight",
      formatting.alignRight,
      (): { isActive: boolean } => ({
        isActive: s().align === "right",
      }),
    ),
    alignJustify: command(
      "alignJustify",
      formatting.alignJustify,
      (): { isActive: boolean } => ({
        isActive: s().align === "justify",
      }),
    ),
    orderedList: command(
      "orderedList",
      formatting.orderedList,
      (): { isActive: boolean } => ({
        isActive: s().listKind === "ordered",
      }),
    ),
    bulletList: command(
      "bulletList",
      formatting.bulletList,
      (): { isActive: boolean } => ({
        isActive: s().listKind === "bullet",
      }),
    ),
    find: command("find", formatting.find),
    replace: command("replace", formatting.replace),
    replaceAll: actionCommand("replaceAll", (p): void => {
      const payload = (p ??
        {}) as import("@/core/commands/publicCommandTypes.js").ReplaceAllPayload;
      if (typeof payload.search === "string" && payload.search.length > 0) {
        formatting.replaceAll(payload);
      }
    }),
    toggleTrackChanges: command(
      "toggleTrackChanges",
      formatting.toggleTrackChanges,
      (): { isActive: boolean } => ({
        isActive: formatting.isTrackChangesEnabled(),
      }),
    ),
    acceptRevisions: command(
      "acceptRevisions",
      formatting.acceptRevisions,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("acceptRevisions") &&
          formatting.hasRevisionsInSelection(),
      }),
    ),
    rejectRevisions: command(
      "rejectRevisions",
      formatting.rejectRevisions,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("rejectRevisions") &&
          formatting.hasRevisionsInSelection(),
      }),
    ),
    acceptAllRevisions: command(
      "acceptAllRevisions",
      formatting.acceptAllRevisions,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("acceptAllRevisions") &&
          formatting.hasRevisionsInDocument(),
      }),
    ),
    rejectAllRevisions: command(
      "rejectAllRevisions",
      formatting.rejectAllRevisions,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("rejectAllRevisions") &&
          formatting.hasRevisionsInDocument(),
      }),
    ),
    nextRevision: command(
      "nextRevision",
      formatting.navigateRevisionNext,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("nextRevision") &&
          formatting.hasNavigableRevisions(),
      }),
    ),
    previousRevision: command(
      "previousRevision",
      formatting.navigateRevisionPrevious,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("previousRevision") &&
          formatting.hasNavigableRevisions(),
      }),
    ),
    newComment: command(
      "newComment",
      formatting.newComment,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("newComment") && formatting.canCreateComment(),
      }),
    ),
    replyComment: command(
      "replyComment",
      formatting.replyComment,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("replyComment") &&
          formatting.canReplyToComment(),
      }),
    ),
    toggleCommentsPanel: command(
      "toggleCommentsPanel",
      formatting.toggleCommentsPanel,
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: gate.isCommandEnabled("toggleCommentsPanel"),
        isActive: formatting.isCommentsPanelOpen(),
      }),
    ),
    editComment: command(
      "editComment",
      formatting.editComment,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("editComment") && formatting.canEditComment(),
      }),
    ),
    nextComment: command(
      "nextComment",
      formatting.navigateCommentNext,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("nextComment") &&
          formatting.hasNavigableComments(),
      }),
    ),
    previousComment: command(
      "previousComment",
      formatting.navigateCommentPrevious,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("previousComment") &&
          formatting.hasNavigableComments(),
      }),
    ),
    resolveComment: command(
      "resolveComment",
      formatting.resolveSelectedComment,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("resolveComment") &&
          formatting.canManageSelectedComment() &&
          !formatting.isSelectedCommentResolved(),
      }),
    ),
    reopenComment: command(
      "reopenComment",
      formatting.reopenSelectedComment,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("reopenComment") &&
          formatting.canManageSelectedComment() &&
          formatting.isSelectedCommentResolved(),
      }),
    ),
    deleteComment: command(
      "deleteComment",
      formatting.deleteSelectedComment,
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("deleteComment") &&
          formatting.canDeleteSelectedComment(),
      }),
    ),
    toggleShowMargins: command(
      "toggleShowMargins",
      formatting.toggleShowMargins,
      (): { isActive: boolean } => ({
        isActive: formatting.areMarginsVisible(),
      }),
    ),
    toggleShowParagraphMarks: command(
      "toggleShowParagraphMarks",
      formatting.toggleShowParagraphMarks,
      (): { isActive: boolean } => ({
        isActive: formatting.areParagraphMarksVisible(),
      }),
    ),
    togglePreciseFonts: command(
      "togglePreciseFonts",
      formatting.togglePreciseFonts,
      (): { isActive: boolean } => {
        // Subscribe to the precise-mode version signal so the menu check state
        // tracks toggles made from anywhere (menu, welcome dialog, startup).
        preciseFontModeVersion();
        return { isActive: isPreciseFontModeEnabled() };
      },
    ),
    undo: command("undo", history.undo, (): { isEnabled: boolean } => ({
      isEnabled: gate.isCommandEnabled("undo") && history.canUndo(),
    })),
    redo: command("redo", history.redo, (): { isEnabled: boolean } => ({
      isEnabled: gate.isCommandEnabled("redo") && history.canRedo(),
    })),
    pageBreak: command("pageBreak", formatting.pageBreak),
    lineBreak: command("lineBreak", formatting.lineBreak),
    columnBreak: command("columnBreak", formatting.columnBreak),
    splitBlock: command("splitBlock", formatting.splitBlock),
    setFontFamily: valueCommand(
      "setFontFamily",
      (p): boolean => formatting.setFontFamily((p as string) || null),
      (): string => s().fontFamily,
    ),
    setFontSize: valueCommand(
      "setFontSize",
      // The UI speaks points; the model stores pixels.
      (p): true => {
        const value =
          p && typeof p === "object" && "size" in p
            ? (p as { size?: unknown }).size
            : p;
        formatting.setFontSize(
          value != null && value !== ""
            ? parseFontSizePtToPx(value as string)
            : null,
        );
        return true;
      },
      (): string => formatFontSizePt(s().fontSize),
    ),
    increaseFontSize: command("increaseFontSize", formatting.increaseFontSize),
    decreaseFontSize: command("decreaseFontSize", formatting.decreaseFontSize),
    changeTextCase: actionCommand(
      "changeTextCase",
      (p): void => {
        formatting.changeTextCase((p as TextCaseMode) ?? "sentence");
      },
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("changeTextCase") && !selection.isCollapsed(),
      }),
    ),
    clearFormatting: command("clearFormatting", formatting.clearFormatting),
    setColor: valueCommand(
      "setColor",
      (p): boolean => formatting.setColor((p as string) ?? null),
      (): string | null => s().color || null,
    ),
    setHighlight: valueCommand(
      "setHighlight",
      (p): boolean => formatting.setHighlight((p as string) ?? null),
      (): string | null => s().highlight || null,
    ),
    setTextShading: valueCommand(
      "setTextShading",
      (p): boolean => formatting.setTextShading((p as string) ?? null),
      (): string | null => s().textShading || null,
    ),
    setStyleId: valueCommand(
      "setStyleId",
      (p): boolean => formatting.setStyleId(String(p)),
      (): string => s().styleId || "normal",
    ),
    setCharacterStyleId: valueCommand(
      "setCharacterStyleId",
      (p): boolean => formatting.setCharacterStyleId(String(p)),
      (): string => s().characterStyleId || "",
    ),
    setUnderlineStyle: valueCommand(
      "setUnderlineStyle",
      (p): true => (formatting.setUnderlineStyle((p as string) || null), true),
      (): string => s().underlineStyle,
    ),
  };
}
