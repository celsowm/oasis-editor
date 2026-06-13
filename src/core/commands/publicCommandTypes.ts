import type { CommandRef } from "./CommandRef.js";
import type { EditorPageMargins } from "../model.js";

export interface InsertTablePayload {
  rows: number;
  columns: number;
}

export interface SetFontSizePayload {
  size: number | string | null;
}

export interface SetPageMarginsPayload extends Partial<EditorPageMargins> {}

export interface OasisCommandPayloads {
  selectAll: undefined;
  insertFootnote: undefined;
  pastePlainText: undefined;
  bold: undefined;
  italic: undefined;
  underline: undefined;
  strike: undefined;
  superscript: undefined;
  subscript: undefined;
  link: string | undefined;
  unlink: undefined;
  alignLeft: undefined;
  alignCenter: undefined;
  alignRight: undefined;
  alignJustify: undefined;
  orderedList: undefined;
  bulletList: undefined;
  find: undefined;
  replace: undefined;
  toggleTrackChanges: undefined;
  acceptRevisions: undefined;
  rejectRevisions: undefined;
  toggleShowMargins: undefined;
  toggleShowParagraphMarks: undefined;
  togglePreciseFonts: undefined;
  undo: undefined;
  redo: undefined;
  pageBreak: undefined;
  lineBreak: undefined;
  splitBlock: undefined;
  setFontFamily: string | null;
  setFontSize: SetFontSizePayload | number | string | null;
  setColor: string | null;
  setHighlight: string | null;
  setTextShading: string | null;
  setStyleId: string;
  setUnderlineStyle: string | null;
  documentStyles: undefined;
  print: undefined;
  copy: undefined;
  exportDocx: undefined;
  exportPdf: undefined;
  importDocument: undefined;
  insertImage: undefined;
  editImageAlt: undefined;
  outdent: undefined;
  indent: undefined;
  togglePageBreakBefore: undefined;
  toggleKeepWithNext: undefined;
  setSpacingAfter: number | null;
  setSpacingBefore: number | null;
  setIndentLeft: number | null;
  setIndentRight: number | null;
  setIndentFirstLine: number | null;
  setIndentHanging: number | null;
  setParagraphShading: string | null;
  applyParagraphBorders: undefined;
  setLineHeight: number | null;
  setListFormat: string;
  setListStartAt: number | null;
  toggleOrientation: undefined;
  sectionBreakNextPage: undefined;
  sectionBreakContinuous: undefined;
  setPageMargins: SetPageMarginsPayload;
  tableContext: undefined;
  tableMerge: undefined;
  tableSplit: undefined;
  tableInsertColumnBefore: undefined;
  tableInsertColumnAfter: undefined;
  tableDeleteColumn: undefined;
  tableInsertRowBefore: undefined;
  tableInsertRowAfter: undefined;
  tableDeleteRow: undefined;
  tableCellShading: string | null;
  tableCellBorders: undefined;
  tableCellNoBorders: undefined;
  tableWidth100: undefined;
  tableAlignLeft: undefined;
  tableAlignCenter: undefined;
  tableAlignRight: undefined;
  tableSetCellWidth: string | number;
  insertTable: InsertTablePayload;
}

export interface OasisCommandResults {
  documentStyles: unknown;
  [command: string]: unknown;
}

export type OasisCommandName = keyof OasisCommandPayloads & string;

export type CommandPayloadArgs<TCommand extends OasisCommandName> =
  OasisCommandPayloads[TCommand] extends undefined
    ? [payload?: undefined]
    : [payload: OasisCommandPayloads[TCommand]];

export interface TypedCommandBus<TState> {
  execute<TCommand extends OasisCommandName>(
    command: TCommand,
    ...args: CommandPayloadArgs<TCommand>
  ): TCommand extends keyof OasisCommandResults
    ? OasisCommandResults[TCommand]
    : unknown;
  execute(command: CommandRef, payloadOverride?: unknown): unknown;
  canExecute<TCommand extends OasisCommandName>(
    command: TCommand,
    ...args: CommandPayloadArgs<TCommand>
  ): boolean;
  canExecute(command: CommandRef, payloadOverride?: unknown): boolean;
  state<TCommand extends OasisCommandName>(command: TCommand): TState;
  state(command: CommandRef): TState;
}
