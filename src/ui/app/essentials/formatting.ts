import {
  insertPageBreakAtSelection,
  splitBlockAtSelection,
} from "@/core/commands/block.js";
import { insertTextAtSelection } from "@/core/commands/text.js";
import {
  getDocumentParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  type EditorState,
} from "@/core/model.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import {
  insertTableOfContents,
  updateTableOfContents,
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
import { togglePreciseFontMode } from "../localFontAccess.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

// The returned object provides insertTableOfContents/updateTableOfContents in
// addition to the EssentialsFormattingCapability surface (the TOC commands are
// dispatched by id via the menu, so the capability interface does not declare
// them). The intersection keeps them typed without tripping excess-property
// checks.
type EssentialsFormattingImpl = EssentialsFormattingCapability & {
  insertTableOfContents: () => boolean;
  updateTableOfContents: () => boolean;
};

export function buildEssentialsFormatting(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsFormattingImpl {
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
    insertText: (text: string, fontFamily?: string | null): boolean => {
      if (text.length === 0) return false;
      const styleOverride = fontFamily ? { fontFamily } : undefined;
      options.applyTransactionalState(
        (current): EditorState =>
          options.tableOps.applyTableAwareParagraphEdit(
            current,
            (temp): EditorState =>
              insertTextAtSelection(temp, text, styleOverride),
          ),
      );
      options.focusInput();
      return true;
    },
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
}
