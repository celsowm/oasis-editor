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
    bold: command("bold", formatting.bold, () => ({
      isActive: Boolean(s().bold),
    })),
    italic: command("italic", formatting.italic, () => ({
      isActive: Boolean(s().italic),
    })),
    underline: command("underline", formatting.underline, () => ({
      isActive: Boolean(s().underline),
    })),
    strike: command("strike", formatting.strike, () => ({
      isActive: Boolean(s().strike),
    })),
    superscript: command("superscript", formatting.superscript, () => ({
      isActive: Boolean(s().superscript),
    })),
    subscript: command("subscript", formatting.subscript, () => ({
      isActive: Boolean(s().subscript),
    })),
    link: command(
      "link",
      () => (link.prompt(), true),
      () => ({
        isEnabled: gate.isCommandEnabled("link") && link.canPrompt(),
        isActive: Boolean(s().link),
      }),
    ),
    alignLeft: command("alignLeft", formatting.alignLeft, () => ({
      isActive: s().align === "left",
    })),
    alignCenter: command("alignCenter", formatting.alignCenter, () => ({
      isActive: s().align === "center",
    })),
    alignRight: command("alignRight", formatting.alignRight, () => ({
      isActive: s().align === "right",
    })),
    alignJustify: command("alignJustify", formatting.alignJustify, () => ({
      isActive: s().align === "justify",
    })),
    orderedList: command("orderedList", formatting.orderedList, () => ({
      isActive: s().listKind === "ordered",
    })),
    bulletList: command("bulletList", formatting.bulletList, () => ({
      isActive: s().listKind === "bullet",
    })),
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
      () => {
        // Subscribe to the precise-mode version signal so the menu check state
        // tracks toggles made from anywhere (menu, welcome dialog, startup).
        preciseFontModeVersion();
        return { isActive: isPreciseFontModeEnabled() };
      },
    ),
    undo: command("undo", history.undo, () => ({
      isEnabled: gate.isCommandEnabled("undo") && history.canUndo(),
    })),
    redo: command("redo", history.redo, () => ({
      isEnabled: gate.isCommandEnabled("redo") && history.canRedo(),
    })),
    pageBreak: command("pageBreak", formatting.pageBreak),
    lineBreak: command("lineBreak", formatting.lineBreak),
    splitBlock: command("splitBlock", formatting.splitBlock),
    setFontFamily: valueCommand(
      "setFontFamily",
      (p) => formatting.setFontFamily((p as string) || null),
      () => s().fontFamily,
    ),
    setFontSize: valueCommand(
      "setFontSize",
      // The UI speaks points; the model stores pixels.
      (p) => {
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
      () => formatFontSizePt(s().fontSize),
    ),
    increaseFontSize: command("increaseFontSize", formatting.increaseFontSize),
    decreaseFontSize: command("decreaseFontSize", formatting.decreaseFontSize),
    changeTextCase: actionCommand(
      "changeTextCase",
      (p) => {
        formatting.changeTextCase((p as TextCaseMode) ?? "sentence");
      },
      () => ({
        isEnabled:
          gate.isCommandEnabled("changeTextCase") && !selection.isCollapsed(),
      }),
    ),
    clearFormatting: command("clearFormatting", formatting.clearFormatting),
    setColor: valueCommand(
      "setColor",
      (p) => formatting.setColor((p as string) ?? null),
      () => s().color || null,
    ),
    setHighlight: valueCommand(
      "setHighlight",
      (p) => formatting.setHighlight((p as string) ?? null),
      () => s().highlight || null,
    ),
    setTextShading: valueCommand(
      "setTextShading",
      (p) => formatting.setTextShading((p as string) ?? null),
      () => s().textShading || null,
    ),
    setStyleId: valueCommand(
      "setStyleId",
      (p) => formatting.setStyleId(String(p)),
      () => s().styleId || "normal",
    ),
    setCharacterStyleId: valueCommand(
      "setCharacterStyleId",
      (p) => formatting.setCharacterStyleId(String(p)),
      () => s().characterStyleId || "",
    ),
    setUnderlineStyle: valueCommand(
      "setUnderlineStyle",
      (p) => (formatting.setUnderlineStyle((p as string) || null), true),
      () => s().underlineStyle,
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
      () => {},
      () => ({
        isEnabled: true,
        value: document.documentStyles(),
      }),
    ),
    print: actionCommand(
      "print",
      () => browser.print(),
      () => ({ isEnabled: true }),
    ),
    copy: actionCommand(
      "copy",
      () => browser.copy(),
      () => ({ isEnabled: true }),
    ),
    exportDocx: actionCommand("exportDocx", () => document.exportDocx()),
    exportPdf: actionCommand("exportPdf", () => document.exportPdf()),
    importDocument: actionCommand("importDocument", () =>
      document.importDocument(),
    ),
    insertImage: actionCommand("insertImage", () => document.insertImage()),
    insertShape: actionCommand("insertShape", (p) =>
      document.insertShape(String(p)),
    ),
    unlink: actionCommand(
      "unlink",
      () => link.remove(),
      () => ({
        isEnabled: gate.isCommandEnabled("unlink") && Boolean(s().link),
        isActive: Boolean(s().link),
      }),
    ),
    editImageAlt: actionCommand(
      "editImageAlt",
      () => image.promptAlt(),
      () => ({
        isEnabled: image.isSelected(),
        isActive: image.isSelected(),
      }),
    ),
    insertImageCaption: actionCommand(
      "insertImageCaption",
      () => image.promptCaption(),
      () => ({
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
    outdent: actionCommand("outdent", () => paragraph.outdent()),
    indent: actionCommand("indent", () => paragraph.indent()),
    togglePageBreakBefore: actionCommand(
      "togglePageBreakBefore",
      () => paragraph.togglePageBreakBefore(),
      () => ({ isActive: Boolean(s().pageBreakBefore) }),
    ),
    toggleKeepWithNext: actionCommand(
      "toggleKeepWithNext",
      () => paragraph.toggleKeepWithNext(),
      () => ({ isActive: Boolean(s().keepWithNext) }),
    ),
    setSpacingAfter: valueCommand(
      "setSpacingAfter",
      (p) => (paragraph.setSpacingAfter(numOrNull(p)), true),
      () => s().spacingAfter,
    ),
    setSpacingBefore: valueCommand(
      "setSpacingBefore",
      (p) => (paragraph.setSpacingBefore(numOrNull(p)), true),
      () => s().spacingBefore,
    ),
    setIndentLeft: valueCommand(
      "setIndentLeft",
      (p) => (paragraph.setIndentLeft(numOrNull(p)), true),
      () => s().indentLeft,
    ),
    setIndentRight: valueCommand(
      "setIndentRight",
      (p) => (paragraph.setIndentRight(numOrNull(p)), true),
      () => s().indentRight,
    ),
    setIndentFirstLine: valueCommand(
      "setIndentFirstLine",
      (p) => (paragraph.setIndentFirstLine(numOrNull(p)), true),
      () => s().indentFirstLine,
    ),
    setIndentHanging: valueCommand(
      "setIndentHanging",
      (p) => (paragraph.setIndentHanging(numOrNull(p)), true),
      () => s().indentHanging,
    ),
    setSpecialIndent: actionCommand(
      "setSpecialIndent",
      (p) => {
        const payload = (p ?? {}) as {
          kind?: "none" | "firstLine" | "hanging";
          value?: unknown;
        };
        paragraph.setSpecialIndent(
          payload.kind ?? "none",
          numOrNull(payload.value),
        );
      },
      () => {
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
      (p) => (paragraph.setShading((p as string) ?? null), true),
      () => s().shading || "#ffffff",
    ),
    applyParagraphBorders: actionCommand("applyParagraphBorders", () =>
      paragraph.applyBorders(),
    ),
    setLineHeight: valueCommand(
      "setLineHeight",
      (p) => (paragraph.setLineHeight(numOrNull(p)), true),
      () => s().lineHeight,
    ),
    setListFormat: actionCommand("setListFormat", (p) =>
      paragraph.setListFormat(String(p)),
    ),
    setListStartAt: actionCommand("setListStartAt", (p) =>
      paragraph.setListStartAt(numOrNull(p)),
    ),
    toggleOrientation: actionCommand(
      "toggleOrientation",
      () => section.toggleOrientation(),
      () => ({ isActive: section.isLandscape() }),
    ),
    setOrientation: actionCommand("setOrientation", (p) =>
      section.setOrientation(p as "portrait" | "landscape"),
    ),
    sectionBreakNextPage: actionCommand("sectionBreakNextPage", () =>
      section.breakNextPage(),
    ),
    sectionBreakContinuous: actionCommand("sectionBreakContinuous", () =>
      section.breakContinuous(),
    ),
    setPageMargins: actionCommand(
      "setPageMargins",
      (p) => {
        section.setPageMargins((p ?? {}) as Partial<EditorPageMargins>);
      },
      () => ({ value: section.getMargins() }),
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
      () => {},
      () => ({
        isEnabled: table.insideTable(),
        isActive: table.insideTable(),
        value: table.selectionLabel(),
      }),
    ),
    tableMerge: actionCommand(
      "tableMerge",
      () => table.merge(),
      () => ({
        isEnabled: gate.isCommandEnabled("tableMerge") && table.canMerge(),
      }),
    ),
    tableSplit: actionCommand(
      "tableSplit",
      () => table.split(),
      () => ({
        isEnabled: gate.isCommandEnabled("tableSplit") && table.canSplit(),
      }),
    ),
    tableInsertColumnBefore: actionCommand(
      "tableInsertColumnBefore",
      () => table.insertColumnBefore(),
      () => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertColumnBefore") &&
          table.canEditColumn(),
      }),
    ),
    tableInsertColumnAfter: actionCommand(
      "tableInsertColumnAfter",
      () => table.insertColumnAfter(),
      () => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertColumnAfter") &&
          table.canEditColumn(),
      }),
    ),
    tableDeleteColumn: actionCommand(
      "tableDeleteColumn",
      () => table.deleteColumn(),
      () => ({
        isEnabled:
          gate.isCommandEnabled("tableDeleteColumn") && table.canEditColumn(),
      }),
    ),
    tableInsertRowBefore: actionCommand(
      "tableInsertRowBefore",
      () => table.insertRowBefore(),
      () => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertRowBefore") && table.canEditRow(),
      }),
    ),
    tableInsertRowAfter: actionCommand(
      "tableInsertRowAfter",
      () => table.insertRowAfter(),
      () => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertRowAfter") && table.canEditRow(),
      }),
    ),
    tableDeleteRow: actionCommand(
      "tableDeleteRow",
      () => table.deleteRow(),
      () => ({
        isEnabled:
          gate.isCommandEnabled("tableDeleteRow") && table.canEditRow(),
      }),
    ),
    tableCellShading: actionCommand("tableCellShading", (p) =>
      table.cellShading((p as string) ?? null),
    ),
    tableCellBorders: actionCommand("tableCellBorders", () =>
      table.cellBorders(),
    ),
    tableCellNoBorders: actionCommand("tableCellNoBorders", () =>
      table.cellNoBorders(),
    ),
    tableWidth100: actionCommand("tableWidth100", () => table.width100()),
    tableAlignLeft: actionCommand("tableAlignLeft", () => table.alignLeft()),
    tableAlignCenter: actionCommand("tableAlignCenter", () =>
      table.alignCenter(),
    ),
    tableAlignRight: actionCommand("tableAlignRight", () => table.alignRight()),
    tableSetCellWidth: actionCommand("tableSetCellWidth", (p) =>
      table.setCellWidth(String(p)),
    ),
    insertTable: actionCommand("insertTable", (p) => {
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
