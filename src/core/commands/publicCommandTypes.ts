import type { CommandRef } from "./CommandRef.js";
import type { EditorPageMargins } from "@/core/model.js";
import type { TextCaseMode } from "./text.js";
import type { TableBorderPreset } from "./table.js";
import type { EditorMathExpression } from "@/core/model.js";

/** Payload for the `insertTable` command. */
export interface InsertTablePayload {
  rows: number;
  columns: number;
}

/** Payload for the `setFontSize` command. */
export interface SetFontSizePayload {
  size: number | string | null;
}

/** Payload for the `setPageMargins` command. */
export interface SetPageMarginsPayload extends Partial<EditorPageMargins> {}

/** Payload for the `setSpecialIndent` command. */
export interface SetSpecialIndentPayload {
  kind: "none" | "firstLine" | "hanging";
  value?: number | null;
}

/** Payload for inserting text with an optional character font override. */
export interface InsertTextPayload {
  text: string;
  fontFamily?: string | null;
}

/**
 * Maps every built-in command name to its expected payload type.
 * Commands with `undefined` payload accept no arguments.
 */
export interface OasisCommandPayloads {
  selectAll: undefined;
  insertFootnote: undefined;
  insertText: string | InsertTextPayload;
  insertEquation: EditorMathExpression;
  updateEquation: { runId: string; expression: EditorMathExpression };
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
  increaseFontSize: undefined;
  decreaseFontSize: undefined;
  changeTextCase: TextCaseMode;
  clearFormatting: undefined;
  setColor: string | null;
  setHighlight: string | null;
  setTextShading: string | null;
  setStyleId: string;
  setCharacterStyleId: string;
  setUnderlineStyle: string | null;
  documentStyles: undefined;
  print: undefined;
  copy: undefined;
  newDocument: undefined;
  exportDocx: undefined;
  exportPdf: undefined;
  importDocument: undefined;
  insertImage: undefined;
  editImageAlt: undefined;
  insertImageCaption: undefined;
  imageContext: undefined;
  imageWidthCm: number | string | null;
  imageHeightCm: number | string | null;
  imageCrop: undefined;
  imageCropAspect: string;
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
  setSpecialIndent: SetSpecialIndentPayload;
  setParagraphShading: string | null;
  applyParagraphBorders: undefined;
  setLineHeight: number | null;
  setListFormat: string;
  setListStartAt: number | null;
  toggleOrientation: undefined;
  setOrientation: "portrait" | "landscape";
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
  tableApplyBorderPreset: TableBorderPreset;
  toggleTableDrawBorders: undefined;
  toggleTableGridlines: undefined;
  tableWidth100: undefined;
  tableAlignLeft: undefined;
  tableAlignCenter: undefined;
  tableAlignRight: undefined;
  tableSetCellWidth: string | number;
  tableToggleHeaderRow: undefined;
  tableToggleTotalRow: undefined;
  tableToggleBandedRows: undefined;
  tableToggleFirstColumn: undefined;
  tableToggleLastColumn: undefined;
  tableToggleBandedColumns: undefined;
  setTableStyle: string;
  tableToggleAutoFit: undefined;
  tableDistributeColumns: undefined;
  tableDistributeRows: undefined;
  insertTable: InsertTablePayload;
  openSymbolDialog: undefined;
  openEquationDialog: undefined;
}

/** Maps commands to their typed return values. Commands not listed return `unknown`. */
export interface OasisCommandResults {
  documentStyles: unknown;
  [command: string]: unknown;
}

/** A valid built-in command name. */
export type OasisCommandName = keyof OasisCommandPayloads & string;

/**
 * Infers the argument tuple for a typed command based on its payload type.
 * @typeParam TCommand - The command name.
 */
export type CommandPayloadArgs<TCommand extends OasisCommandName> =
  OasisCommandPayloads[TCommand] extends undefined
    ? [payload?: undefined]
    : [payload: OasisCommandPayloads[TCommand]];

/**
 * Typed command bus that provides type-safe execute/canExecute/state methods
 * for built-in commands, while also accepting runtime {@link CommandRef} overloads.
 * @typeParam TState - The command state type.
 */
export interface TypedCommandBus<TState> {
  /**
   * Type-safe execute for known commands.
   * @param command - The command name.
   * @param args - The command payload.
   * @returns The command result.
   */
  execute<TCommand extends OasisCommandName>(
    command: TCommand,
    ...args: CommandPayloadArgs<TCommand>
  ): TCommand extends keyof OasisCommandResults
    ? OasisCommandResults[TCommand]
    : unknown;
  /**
   * Runtime execute via CommandRef.
   * @param command - The command reference.
   * @param payloadOverride - Optional payload override.
   * @returns The command result.
   */
  execute(command: CommandRef, payloadOverride?: unknown): unknown;
  /**
   * Type-safe canExecute for known commands.
   * @param command - The command name.
   * @param args - The command payload.
   * @returns Whether the command can execute.
   */
  canExecute<TCommand extends OasisCommandName>(
    command: TCommand,
    ...args: CommandPayloadArgs<TCommand>
  ): boolean;
  /**
   * Runtime canExecute via CommandRef.
   * @param command - The command reference.
   * @param payloadOverride - Optional payload override.
   * @returns Whether the command can execute.
   */
  canExecute(command: CommandRef, payloadOverride?: unknown): boolean;
  /**
   * Type-safe state for known commands.
   * @param command - The command name.
   * @returns The command state.
   */
  state<TCommand extends OasisCommandName>(command: TCommand): TState;
  /**
   * Runtime state via CommandRef.
   * @param command - The command reference.
   * @returns The command state.
   */
  state(command: CommandRef): TState;
}
