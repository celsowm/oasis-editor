import type { OasisPlugin } from "@/core/plugin.js";
import type { EditorPageMargins } from "@/core/model.js";
import type { TextCaseMode } from "@/core/commands/text.js";
import type {
  ActionCommandBuilder,
  CommandBuilder,
  ValueCommandBuilder,
} from "./essentialsCommandBuilders.js";
import { numOrNull } from "./essentialsCommandBuilders.js";
import { formatFontSizePt, parseFontSizePtToPx } from "@/ui/fontSizeUnits.js";
import {
  isPreciseFontModeEnabled,
  preciseFontModeVersion,
} from "@/text/fonts/preciseFontMode.js";
import type {
  EssentialsBrowserCapability,
  EssentialsDocumentCapability,
  EssentialsFeatureGate,
  EssentialsFormattingCapability,
  EssentialsHistoryCapability,
  EssentialsImageCapability,
  EssentialsLinkCapability,
  EssentialsParagraphCapability,
  EssentialsSectionCapability,
  EssentialsSelectionCapability,
  EssentialsStyleCapability,
  EssentialsTableCapability,
} from "./essentialsCapabilities.js";
import type { EssentialsDocumentStyleDescriptor } from "@/plugins/internal/essentialsCapabilities.js";

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

interface DocumentAndBrowserGroupDeps {
  gate: EssentialsFeatureGate;
  style: EssentialsStyleCapability;
  document: EssentialsDocumentCapability;
  link: EssentialsLinkCapability;
  image: EssentialsImageCapability;
  browser: EssentialsBrowserCapability;
  actionCommand: ActionCommandBuilder;
}

interface ParagraphAndSectionGroupDeps {
  style: EssentialsStyleCapability;
  paragraph: EssentialsParagraphCapability;
  section: EssentialsSectionCapability;
  valueCommand: ValueCommandBuilder;
  actionCommand: ActionCommandBuilder;
}

interface TableGroupDeps {
  gate: EssentialsFeatureGate;
  table: EssentialsTableCapability;
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
    insertFootnote: command("insertFootnote", formatting.insertFootnote),
    pastePlainText: command("pastePlainText", formatting.pastePlainText),
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
    toggleTrackChanges: command(
      "toggleTrackChanges",
      formatting.toggleTrackChanges,
    ),
    acceptRevisions: command("acceptRevisions", formatting.acceptRevisions),
    rejectRevisions: command("rejectRevisions", formatting.rejectRevisions),
    toggleShowMargins: command(
      "toggleShowMargins",
      formatting.toggleShowMargins,
    ),
    toggleShowParagraphMarks: command(
      "toggleShowParagraphMarks",
      formatting.toggleShowParagraphMarks,
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

export function buildDocumentAndBrowserCommands({
  gate,
  style,
  document,
  link,
  image,
  browser,
  actionCommand,
}: DocumentAndBrowserGroupDeps): NonNullable<OasisPlugin["commands"]> {
  const s = style.state;
  return {
    documentStyles: actionCommand(
      "documentStyles",
      (): void => {},
      (): { isEnabled: true; value: EssentialsDocumentStyleDescriptor[] } => ({
        isEnabled: true,
        value: document.documentStyles(),
      }),
    ),
    print: actionCommand(
      "print",
      (): void => browser.print(),
      (): { isEnabled: true } => ({ isEnabled: true }),
    ),
    copy: actionCommand(
      "copy",
      (): void => browser.copy(),
      (): { isEnabled: true } => ({ isEnabled: true }),
    ),
    exportDocx: actionCommand("exportDocx", (): void => document.exportDocx()),
    exportPdf: actionCommand("exportPdf", (): void => document.exportPdf()),
    importDocument: actionCommand("importDocument", (): void =>
      document.importDocument(),
    ),
    insertImage: actionCommand("insertImage", (): void =>
      document.insertImage(),
    ),
    insertShape: actionCommand("insertShape", (p): void =>
      document.insertShape(String(p)),
    ),
    unlink: actionCommand(
      "unlink",
      (): void => link.remove(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: gate.isCommandEnabled("unlink") && Boolean(s().link),
        isActive: Boolean(s().link),
      }),
    ),
    editImageAlt: actionCommand(
      "editImageAlt",
      (): void => image.promptAlt(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: image.isSelected(),
        isActive: image.isSelected(),
      }),
    ),
    insertImageCaption: actionCommand(
      "insertImageCaption",
      (): void => image.promptCaption(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: image.isSelected(),
        isActive: image.isSelected(),
      }),
    ),
  };
}

export function buildParagraphAndSectionCommands({
  style,
  paragraph,
  section,
  valueCommand,
  actionCommand,
}: ParagraphAndSectionGroupDeps): NonNullable<OasisPlugin["commands"]> {
  const s = style.state;
  return {
    outdent: actionCommand("outdent", (): void => paragraph.outdent()),
    indent: actionCommand("indent", (): void => paragraph.indent()),
    togglePageBreakBefore: actionCommand(
      "togglePageBreakBefore",
      (): void => paragraph.togglePageBreakBefore(),
      (): { isActive: boolean } => ({ isActive: Boolean(s().pageBreakBefore) }),
    ),
    toggleKeepWithNext: actionCommand(
      "toggleKeepWithNext",
      (): void => paragraph.toggleKeepWithNext(),
      (): { isActive: boolean } => ({ isActive: Boolean(s().keepWithNext) }),
    ),
    setSpacingAfter: valueCommand(
      "setSpacingAfter",
      (p): true => (paragraph.setSpacingAfter(numOrNull(p)), true),
      (): string => s().spacingAfter,
    ),
    setSpacingBefore: valueCommand(
      "setSpacingBefore",
      (p): true => (paragraph.setSpacingBefore(numOrNull(p)), true),
      (): string => s().spacingBefore,
    ),
    setIndentLeft: valueCommand(
      "setIndentLeft",
      (p): true => (paragraph.setIndentLeft(numOrNull(p)), true),
      (): string => s().indentLeft,
    ),
    setIndentRight: valueCommand(
      "setIndentRight",
      (p): true => (paragraph.setIndentRight(numOrNull(p)), true),
      (): string => s().indentRight,
    ),
    setIndentFirstLine: valueCommand(
      "setIndentFirstLine",
      (p): true => (paragraph.setIndentFirstLine(numOrNull(p)), true),
      (): string => s().indentFirstLine,
    ),
    setIndentHanging: valueCommand(
      "setIndentHanging",
      (p): true => (paragraph.setIndentHanging(numOrNull(p)), true),
      (): string => s().indentHanging,
    ),
    setSpecialIndent: actionCommand(
      "setSpecialIndent",
      (p): void => {
        const payload = (p ?? {}) as {
          kind?: "none" | "firstLine" | "hanging";
          value?: unknown;
        };
        paragraph.setSpecialIndent(
          payload.kind ?? "none",
          numOrNull(payload.value),
        );
      },
      (): { isActive: boolean; value: string } => {
        const firstLine = Number(s().indentFirstLine);
        const hanging = Number(s().indentHanging);
        const kind =
          Number.isFinite(hanging) && hanging > 0
            ? "hanging"
            : Number.isFinite(firstLine) && firstLine > 0
              ? "firstLine"
              : "none";
        return {
          isActive: kind !== "none",
          value: kind,
        };
      },
    ),
    setParagraphShading: valueCommand(
      "setParagraphShading",
      (p): true => (paragraph.setShading((p as string) ?? null), true),
      (): string => s().shading || "#ffffff",
    ),
    applyParagraphBorders: actionCommand("applyParagraphBorders", (): void =>
      paragraph.applyBorders(),
    ),
    setLineHeight: valueCommand(
      "setLineHeight",
      (p): true => (paragraph.setLineHeight(numOrNull(p)), true),
      (): string => s().lineHeight,
    ),
    setListFormat: actionCommand("setListFormat", (p): void =>
      paragraph.setListFormat(String(p)),
    ),
    setListStartAt: actionCommand("setListStartAt", (p): void =>
      paragraph.setListStartAt(numOrNull(p)),
    ),
    toggleOrientation: actionCommand(
      "toggleOrientation",
      (): void => section.toggleOrientation(),
      (): { isActive: boolean } => ({ isActive: section.isLandscape() }),
    ),
    setOrientation: actionCommand("setOrientation", (p): void =>
      section.setOrientation(p as "portrait" | "landscape"),
    ),
    sectionBreakNextPage: actionCommand("sectionBreakNextPage", (): void =>
      section.breakNextPage(),
    ),
    sectionBreakContinuous: actionCommand("sectionBreakContinuous", (): void =>
      section.breakContinuous(),
    ),
    setPageMargins: actionCommand(
      "setPageMargins",
      (p): void => {
        section.setPageMargins((p ?? {}) as Partial<EditorPageMargins>);
      },
      (): { value: EditorPageMargins | undefined } => ({
        value: section.getMargins(),
      }),
    ),
  };
}

export function buildTableCommands({
  gate,
  table,
  actionCommand,
}: TableGroupDeps): NonNullable<OasisPlugin["commands"]> {
  return {
    tableContext: actionCommand(
      "tableContext",
      (): void => {},
      (): { isEnabled: boolean; isActive: boolean; value: string | null } => ({
        isEnabled: table.insideTable(),
        isActive: table.insideTable(),
        value: table.selectionLabel(),
      }),
    ),
    tableMerge: actionCommand(
      "tableMerge",
      (): void => table.merge(),
      (): { isEnabled: boolean } => ({
        isEnabled: gate.isCommandEnabled("tableMerge") && table.canMerge(),
      }),
    ),
    tableSplit: actionCommand(
      "tableSplit",
      (): void => table.split(),
      (): { isEnabled: boolean } => ({
        isEnabled: gate.isCommandEnabled("tableSplit") && table.canSplit(),
      }),
    ),
    tableInsertColumnBefore: actionCommand(
      "tableInsertColumnBefore",
      (): void => table.insertColumnBefore(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertColumnBefore") &&
          table.canEditColumn(),
      }),
    ),
    tableInsertColumnAfter: actionCommand(
      "tableInsertColumnAfter",
      (): void => table.insertColumnAfter(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertColumnAfter") &&
          table.canEditColumn(),
      }),
    ),
    tableDeleteColumn: actionCommand(
      "tableDeleteColumn",
      (): void => table.deleteColumn(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableDeleteColumn") && table.canEditColumn(),
      }),
    ),
    tableInsertRowBefore: actionCommand(
      "tableInsertRowBefore",
      (): void => table.insertRowBefore(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertRowBefore") && table.canEditRow(),
      }),
    ),
    tableInsertRowAfter: actionCommand(
      "tableInsertRowAfter",
      (): void => table.insertRowAfter(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertRowAfter") && table.canEditRow(),
      }),
    ),
    tableDeleteRow: actionCommand(
      "tableDeleteRow",
      (): void => table.deleteRow(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableDeleteRow") && table.canEditRow(),
      }),
    ),
    tableCellShading: actionCommand("tableCellShading", (p): void =>
      table.cellShading((p as string) ?? null),
    ),
    tableCellBorders: actionCommand("tableCellBorders", (): void =>
      table.cellBorders(),
    ),
    tableCellNoBorders: actionCommand("tableCellNoBorders", (): void =>
      table.cellNoBorders(),
    ),
    tableWidth100: actionCommand("tableWidth100", (): void => table.width100()),
    tableAlignLeft: actionCommand("tableAlignLeft", (): void =>
      table.alignLeft(),
    ),
    tableAlignCenter: actionCommand("tableAlignCenter", (): void =>
      table.alignCenter(),
    ),
    tableAlignRight: actionCommand("tableAlignRight", (): void =>
      table.alignRight(),
    ),
    tableSetCellWidth: actionCommand("tableSetCellWidth", (p): void =>
      table.setCellWidth(String(p)),
    ),
    insertTable: actionCommand("insertTable", (p): void => {
      const { rows, cols, columns } = (p ?? {}) as {
        rows?: number;
        cols?: number;
        columns?: number;
      };
      const columnCount = cols ?? columns;
      if (rows && columnCount) {
        table.insert(rows, columnCount);
      }
    }),
  };
}
