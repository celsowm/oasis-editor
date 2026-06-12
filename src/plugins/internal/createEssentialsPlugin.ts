import type { OasisPlugin } from "../../core/plugin.js";
import type { ToolbarStyleState } from "../../ui/toolbarStyleState.js";
import {
  createActionCommandBuilder,
  createCommandBuilder,
  createValueCommandBuilder,
} from "./essentialsCommandBuilders.js";
import {
  buildCoreFormattingCommands,
  buildDocumentAndBrowserCommands,
  buildParagraphAndSectionCommands,
  buildTableCommands,
} from "./essentialsCommandGroups.js";

export interface EssentialsFeatureGate {
  isCommandEnabled: (commandName: string) => boolean;
}

export interface EssentialsStyleCapability {
  state: () => ToolbarStyleState;
}

export interface EssentialsHistoryCapability {
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => boolean;
  redo: () => boolean;
}

export interface EssentialsFormattingCapability {
  selectAll: () => boolean;
  insertFootnote: () => boolean;
  pastePlainText: () => boolean;
  bold: () => boolean;
  italic: () => boolean;
  underline: () => boolean;
  strike: () => boolean;
  superscript: () => boolean;
  subscript: () => boolean;
  alignLeft: () => boolean;
  alignCenter: () => boolean;
  alignRight: () => boolean;
  alignJustify: () => boolean;
  orderedList: () => boolean;
  bulletList: () => boolean;
  find: () => boolean;
  replace: () => boolean;
  toggleTrackChanges: () => boolean;
  acceptRevisions: () => boolean;
  rejectRevisions: () => boolean;
  toggleShowMargins: () => boolean;
  toggleShowParagraphMarks: () => boolean;
  togglePreciseFonts: () => boolean;
  pageBreak: () => boolean;
  lineBreak: () => boolean;
  splitBlock: () => boolean;
  setFontFamily: (value: string | null) => boolean;
  setFontSize: (value: number | null) => boolean;
  setColor: (value: string | null) => boolean;
  setHighlight: (value: string | null) => boolean;
  setTextShading: (value: string | null) => boolean;
  setStyleId: (value: string) => boolean;
  setUnderlineStyle: (value: string | null) => void;
}

export interface EssentialsDocumentStyleDescriptor {
  id: string;
  name: string;
  fontFamily?: string;
  fontSize?: number;
}

export interface EssentialsDocumentCapability {
  documentStyles: () => EssentialsDocumentStyleDescriptor[];
  exportDocx: () => void;
  exportPdf: () => void;
  importDocument: () => void;
  insertImage: () => void;
}

export interface EssentialsLinkCapability {
  prompt: () => void;
  remove: () => void;
  canPrompt: () => boolean;
}

export interface EssentialsImageCapability {
  promptAlt: () => void;
  isSelected: () => boolean;
}

export interface EssentialsBrowserCapability {
  print: () => void;
  copy: () => void;
}

export interface EssentialsParagraphCapability {
  togglePageBreakBefore: () => void;
  toggleKeepWithNext: () => void;
  setSpacingAfter: (value: number | null) => void;
  setSpacingBefore: (value: number | null) => void;
  setIndentLeft: (value: number | null) => void;
  setIndentRight: (value: number | null) => void;
  setIndentFirstLine: (value: number | null) => void;
  setIndentHanging: (value: number | null) => void;
  setShading: (value: string | null) => void;
  applyBorders: () => void;
  setLineHeight: (value: number | null) => void;
  setListFormat: (format: string) => void;
  setListStartAt: (value: number | null) => void;
  outdent: () => void;
  indent: () => void;
}

export interface EssentialsSectionCapability {
  isLandscape: () => boolean;
  toggleOrientation: () => void;
  breakNextPage: () => void;
  breakContinuous: () => void;
  setPageMargins: (margins: { left?: number; right?: number }) => void;
}

export interface EssentialsTableCapability {
  insideTable: () => boolean;
  selectionLabel: () => string | null;
  canMerge: () => boolean;
  canSplit: () => boolean;
  canEditColumn: () => boolean;
  canEditRow: () => boolean;
  merge: () => void;
  split: () => void;
  insertColumnBefore: () => void;
  insertColumnAfter: () => void;
  deleteColumn: () => void;
  insertRowBefore: () => void;
  insertRowAfter: () => void;
  deleteRow: () => void;
  cellShading: (color: string | null) => void;
  cellBorders: () => void;
  cellNoBorders: () => void;
  width100: () => void;
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  setCellWidth: (width: string) => void;
  insert: (rows: number, cols: number) => void;
}

export interface EssentialsPluginDeps {
  gate: EssentialsFeatureGate;
  style: EssentialsStyleCapability;
  history: EssentialsHistoryCapability;
  formatting: EssentialsFormattingCapability;
  document: EssentialsDocumentCapability;
  link: EssentialsLinkCapability;
  image: EssentialsImageCapability;
  browser: EssentialsBrowserCapability;
  paragraph: EssentialsParagraphCapability;
  section: EssentialsSectionCapability;
  table: EssentialsTableCapability;
}

export function createEssentialsPlugin(
  deps: EssentialsPluginDeps,
): OasisPlugin {
  const command = createCommandBuilder(deps.gate.isCommandEnabled);
  const valueCommand = createValueCommandBuilder(deps.gate.isCommandEnabled);
  const actionCommand = createActionCommandBuilder(deps.gate.isCommandEnabled);

  return {
    name: "Essentials",
    commands: {
      ...buildCoreFormattingCommands({
        gate: deps.gate,
        style: deps.style,
        history: deps.history,
        formatting: deps.formatting,
        link: deps.link,
        command,
        valueCommand,
      }),
      ...buildDocumentAndBrowserCommands({
        gate: deps.gate,
        style: deps.style,
        document: deps.document,
        link: deps.link,
        image: deps.image,
        browser: deps.browser,
        actionCommand,
      }),
      ...buildParagraphAndSectionCommands({
        style: deps.style,
        paragraph: deps.paragraph,
        section: deps.section,
        valueCommand,
        actionCommand,
      }),
      ...buildTableCommands({
        gate: deps.gate,
        table: deps.table,
        actionCommand,
      }),
    },
  };
}
