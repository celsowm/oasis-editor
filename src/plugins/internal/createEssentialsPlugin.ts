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

export interface EssentialsPluginDeps {
  isCommandEnabled: (commandName: string) => boolean;
  /** Reactive toolbar style snapshot — feeds command `isActive`/`value`. */
  styleState: () => ToolbarStyleState;
  canUndo: () => boolean;
  canRedo: () => boolean;
  selectAll: () => boolean;
  insertFootnote: () => boolean;
  pastePlainText: () => boolean;
  bold: () => boolean;
  italic: () => boolean;
  underline: () => boolean;
  strike: () => boolean;
  superscript: () => boolean;
  subscript: () => boolean;
  link: () => boolean;
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
  undo: () => boolean;
  redo: () => boolean;
  pageBreak: () => boolean;
  lineBreak: () => boolean;
  splitBlock: () => boolean;
  /** Value commands — apply a payload and expose the current value via refresh. */
  setFontFamily: (value: string | null) => boolean;
  setFontSize: (value: number | null) => boolean;
  setColor: (value: string | null) => boolean;
  setHighlight: (value: string | null) => boolean;
  setStyleId: (value: string) => boolean;
  /** Document's named styles — exposed as the `documentStyles` command value. */
  documentStyles: () => Array<{ id: string; name: string; fontFamily?: string; fontSize?: number }>;

  /** File / insert IO. */
  io: {
    exportDocx: () => void;
    exportPdf: () => void;
    importDocx: () => void;
    insertImage: () => void;
  };
  /** Link / image-alt operations and their selection-derived state. */
  linkOps: {
    prompt: () => void;
    remove: () => void;
    canPrompt: () => boolean;
  };
  imageAlt: {
    prompt: () => void;
    isSelected: () => boolean;
  };
  browserActions: {
    print: () => void;
    copy: () => void;
  };
  /** Paragraph metric / list / indent operations. */
  paragraph: {
    togglePageBreakBefore: () => void;
    toggleKeepWithNext: () => void;
    setSpacingAfter: (value: number | null) => void;
    setSpacingBefore: (value: number | null) => void;
    setIndentLeft: (value: number | null) => void;
    setIndentFirstLine: (value: number | null) => void;
    setIndentHanging: (value: number | null) => void;
    setShading: (value: string | null) => void;
    applyBorders: () => void;
    setLineHeight: (value: number | null) => void;
    setListFormat: (format: string) => void;
    setListStartAt: (value: number | null) => void;
    outdent: () => void;
    indent: () => void;
  };
  /** Underline style value operation. */
  setUnderlineStyle: (value: string | null) => void;
  /** Section page-setup operations. */
  section: {
    isLandscape: () => boolean;
    toggleOrientation: () => void;
    breakNextPage: () => void;
    breakContinuous: () => void;
  };
  /** Table operations and their selection-derived enablement. */
  table: {
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
  };
}

export function createEssentialsPlugin(deps: EssentialsPluginDeps): OasisPlugin {
  const command = createCommandBuilder(deps.isCommandEnabled);
  const valueCommand = createValueCommandBuilder(deps.isCommandEnabled);
  const actionCommand = createActionCommandBuilder(deps.isCommandEnabled);

  return {
    name: "Essentials",
    commands: {
      ...buildCoreFormattingCommands({ deps, command, valueCommand, actionCommand }),
      ...buildDocumentAndBrowserCommands({ deps, command, valueCommand, actionCommand }),
      ...buildParagraphAndSectionCommands({ deps, command, valueCommand, actionCommand }),
      ...buildTableCommands({ deps, command, valueCommand, actionCommand }),
    },
  };
}
