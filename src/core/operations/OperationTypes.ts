import { EditorSelection } from "../selection/SelectionTypes.js";
import { MarkSet, FieldInfo } from "../document/BlockTypes.js";

export enum OperationType {
  APPEND_PARAGRAPH = "APPEND_PARAGRAPH",
  SET_SECTION_TEMPLATE = "SET_SECTION_TEMPLATE",
  SET_SELECTION = "SET_SELECTION",
  INSERT_TEXT = "INSERT_TEXT",
  DELETE_TEXT = "DELETE_TEXT",
  INSERT_PARAGRAPH = "INSERT_PARAGRAPH",
  MOVE_SELECTION = "MOVE_SELECTION",
  TOGGLE_MARK = "TOGGLE_MARK",
  SET_MARK = "SET_MARK",
  APPLY_FORMAT = "APPLY_FORMAT",
  SET_ALIGNMENT = "SET_ALIGNMENT",
  INSERT_IMAGE = "INSERT_IMAGE",
  RESIZE_IMAGE = "RESIZE_IMAGE",
  SELECT_IMAGE = "SELECT_IMAGE",
  UPDATE_IMAGE = "UPDATE_IMAGE",
  INSERT_TABLE = "INSERT_TABLE",
  TABLE_ADD_ROW_ABOVE = "TABLE_ADD_ROW_ABOVE",
  TABLE_ADD_ROW_BELOW = "TABLE_ADD_ROW_BELOW",
  TABLE_ADD_COLUMN_LEFT = "TABLE_ADD_COLUMN_LEFT",
  TABLE_ADD_COLUMN_RIGHT = "TABLE_ADD_COLUMN_RIGHT",
  TABLE_DELETE_ROW = "TABLE_DELETE_ROW",
  TABLE_DELETE_COLUMN = "TABLE_DELETE_COLUMN",
  TABLE_DELETE = "TABLE_DELETE",
  TABLE_MERGE_CELLS = "TABLE_MERGE_CELLS",
  TABLE_SPLIT_CELL = "TABLE_SPLIT_CELL",
  TABLE_TOGGLE_HEADER_ROW = "TABLE_TOGGLE_HEADER_ROW",
  TABLE_TOGGLE_FIRST_COLUMN = "TABLE_TOGGLE_FIRST_COLUMN",
  MOVE_BLOCK = "MOVE_BLOCK",
  TOGGLE_UNORDERED_LIST = "TOGGLE_UNORDERED_LIST",
  TOGGLE_ORDERED_LIST = "TOGGLE_ORDERED_LIST",
  DECREASE_INDENT = "DECREASE_INDENT",
  INCREASE_INDENT = "INCREASE_INDENT",
  SET_INDENTATION = "SET_INDENTATION",
  SET_EDITING_MODE = "SET_EDITING_MODE",
  INSERT_PAGE_BREAK = "INSERT_PAGE_BREAK",
  INSERT_FIELD = "INSERT_FIELD",
  SET_STYLE = "SET_STYLE",
  TOGGLE_TRACK_CHANGES = "TOGGLE_TRACK_CHANGES",
  ACCEPT_REVISION = "ACCEPT_REVISION",
  REJECT_REVISION = "REJECT_REVISION",
  INSERT_EQUATION = "INSERT_EQUATION",
  INSERT_BOOKMARK = "INSERT_BOOKMARK",
  INSERT_FOOTNOTE = "INSERT_FOOTNOTE",
  INSERT_ENDNOTE = "INSERT_ENDNOTE",
  INSERT_COMMENT = "INSERT_COMMENT",
}

export interface SetEditingModePayload {
  mode: "main" | "header" | "footer" | "footnote";
  footnoteId?: string;
}

export interface TableRowColPayload {
  tableId: string;
  referenceBlockId: string; // The block inside the cell we are using as reference
}

export interface TableDeletePayload {
  tableId: string;
}
export interface TableMergeCellsPayload {
  tableId: string;
  anchorBlockId: string; // block inside the top-left cell of the selection
  targetBlockId: string; // block inside the bottom-right cell of the selection
}
export interface TableSplitCellPayload {
  tableId: string;
  referenceBlockId: string; // block inside the cell to split
}

export interface MoveBlockPayload {
  blockId: string;
  targetReferenceBlockId: string; // The block after which the moved block should be placed
  isBefore?: boolean;
}

export interface AppendParagraphPayload {
  text: string;
  newBlockId?: string;
  newRunId?: string;
}
export interface SetSectionTemplatePayload {
  sectionId: string;
  templateId: string;
}
export interface SetSelectionPayload {
  selection: EditorSelection | null;
  selectedImageId?: string | null;
}
export interface InsertTextPayload {
  text: string;
  newRunIds?: string[]; // For cases where we split runs
}
export interface DeleteTextPayload {}
export interface SetIndentationPayload {
  indentation: number;
}
export interface InsertParagraphPayload {
  newBlockId?: string;
  newRunId?: string;
}
export interface MoveSelectionPayload {
  key: string;
}
export interface ToggleMarkPayload {
  mark: keyof MarkSet;
  value?: any;
}
export interface SetMarkPayload {
  mark: keyof MarkSet;
  value: any;
}
export interface ApplyFormatPayload {
  marks: MarkSet;
  align?: "left" | "center" | "right" | "justify";
}
export interface SetAlignmentPayload {
  align: "left" | "center" | "right" | "justify";
}
export interface InsertImagePayload {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  align: "left" | "center" | "right";
  alt?: string;
  newBlockId?: string;
}
export interface ResizeImagePayload {
  blockId: string;
  width: number;
  height: number;
}
export interface SelectImagePayload {
  blockId: string;
}
export interface UpdateImagePayload {
  blockId: string;
  alt?: string;
  width?: number;
  height?: number;
}
export interface InsertTablePayload {
  rows: number;
  cols: number;
  newTableId?: string;
  newRowIds?: string[];
  newCellIds?: string[];
  newParaIds?: string[];
  newRunIds?: string[];
}
export interface InsertPageBreakPayload {
  newBlockId?: string;
}
export interface InsertFieldPayload {
  field: FieldInfo;
  newRunId?: string;
}
export interface SetStylePayload {
  styleId: string;
}
export interface AcceptRevisionPayload {
  runId: string;
}
export interface RejectRevisionPayload {
  runId: string;
}
export interface InsertEquationPayload {
  latex: string;
  display?: boolean;
  newBlockId?: string;
}
export interface InsertBookmarkPayload {
  name: string;
  newRunId?: string;
}
export interface InsertFootnotePayload {
  text: string;
  newRunId?: string;
  newBlockId?: string;
}
export interface InsertEndnotePayload {
  text: string;
  newRunId?: string;
  newBlockId?: string;
}
export interface InsertCommentPayload {
  text: string;
  newRunId?: string;
  newBlockId?: string;
}

interface Operation<T extends OperationType, P> {
  type: T;
  payload: P;
}

export type AppendParagraphOp = Operation<
  OperationType.APPEND_PARAGRAPH,
  AppendParagraphPayload
>;
export type SetSectionTemplateOp = Operation<
  OperationType.SET_SECTION_TEMPLATE,
  SetSectionTemplatePayload
>;
export type SetSelectionOp = Operation<
  OperationType.SET_SELECTION,
  SetSelectionPayload
>;
export type InsertTextOp = Operation<
  OperationType.INSERT_TEXT,
  InsertTextPayload
>;
export type DeleteTextOp = Operation<
  OperationType.DELETE_TEXT,
  DeleteTextPayload
>;
export type InsertParagraphOp = Operation<
  OperationType.INSERT_PARAGRAPH,
  InsertParagraphPayload
>;
export type MoveSelectionOp = Operation<
  OperationType.MOVE_SELECTION,
  MoveSelectionPayload
>;
export type ToggleMarkOp = Operation<
  OperationType.TOGGLE_MARK,
  ToggleMarkPayload
>;
export type SetMarkOp = Operation<OperationType.SET_MARK, SetMarkPayload>;
export type ApplyFormatOp = Operation<
  OperationType.APPLY_FORMAT,
  ApplyFormatPayload
>;
export type SetAlignmentOp = Operation<
  OperationType.SET_ALIGNMENT,
  SetAlignmentPayload
>;
export type InsertImageOp = Operation<
  OperationType.INSERT_IMAGE,
  InsertImagePayload
>;
export type ResizeImageOp = Operation<
  OperationType.RESIZE_IMAGE,
  ResizeImagePayload
>;
export type SelectImageOp = Operation<
  OperationType.SELECT_IMAGE,
  SelectImagePayload
>;
export type UpdateImageOp = Operation<
  OperationType.UPDATE_IMAGE,
  UpdateImagePayload
>;
export type InsertTableOp = Operation<
  OperationType.INSERT_TABLE,
  InsertTablePayload
>;
export type InsertPageBreakOp = Operation<
  OperationType.INSERT_PAGE_BREAK,
  InsertPageBreakPayload
>;
export type InsertFieldOp = Operation<
  OperationType.INSERT_FIELD,
  InsertFieldPayload
>;
export type SetStyleOp = Operation<
  OperationType.SET_STYLE,
  SetStylePayload
>;
export type AcceptRevisionOp = Operation<
  OperationType.ACCEPT_REVISION,
  AcceptRevisionPayload
>;
export type RejectRevisionOp = Operation<
  OperationType.REJECT_REVISION,
  RejectRevisionPayload
>;
export type ToggleTrackChangesOp = Operation<
  OperationType.TOGGLE_TRACK_CHANGES,
  {}
>;
export type InsertEquationOp = Operation<
  OperationType.INSERT_EQUATION,
  InsertEquationPayload
>;
export type InsertBookmarkOp = Operation<
  OperationType.INSERT_BOOKMARK,
  InsertBookmarkPayload
>;
export type InsertFootnoteOp = Operation<
  OperationType.INSERT_FOOTNOTE,
  InsertFootnotePayload
>;
export type InsertEndnoteOp = Operation<
  OperationType.INSERT_ENDNOTE,
  InsertEndnotePayload
>;
export type InsertCommentOp = Operation<
  OperationType.INSERT_COMMENT,
  InsertCommentPayload
>;

export type MoveBlockOp = Operation<OperationType.MOVE_BLOCK, MoveBlockPayload>;
export type TableMergeCellsOp = Operation<OperationType.TABLE_MERGE_CELLS, TableMergeCellsPayload>;
export type TableSplitCellOp = Operation<OperationType.TABLE_SPLIT_CELL, TableSplitCellPayload>;

export type EditorOperation =
  | AppendParagraphOp
  | SetSectionTemplateOp
  | SetSelectionOp
  | InsertTextOp
  | DeleteTextOp
  | InsertParagraphOp
  | MoveSelectionOp
  | ToggleMarkOp
  | SetMarkOp
  | ApplyFormatOp
  | SetAlignmentOp
  | InsertImageOp
  | ResizeImageOp
  | SelectImageOp
  | UpdateImageOp
  | InsertTableOp
  | InsertPageBreakOp
  | InsertFieldOp
  | SetStyleOp
  | AcceptRevisionOp
  | RejectRevisionOp
  | ToggleTrackChangesOp
  | InsertEquationOp
  | InsertBookmarkOp
  | InsertFootnoteOp
  | InsertEndnoteOp
  | InsertCommentOp
  | MoveBlockOp
  | Operation<OperationType.TABLE_ADD_ROW_ABOVE, TableRowColPayload>
  | Operation<OperationType.TABLE_ADD_ROW_BELOW, TableRowColPayload>
  | Operation<OperationType.TABLE_ADD_COLUMN_LEFT, TableRowColPayload>
  | Operation<OperationType.TABLE_ADD_COLUMN_RIGHT, TableRowColPayload>
  | Operation<OperationType.TABLE_DELETE_ROW, TableRowColPayload>
  | Operation<OperationType.TABLE_DELETE_COLUMN, TableRowColPayload>
  | Operation<OperationType.TABLE_DELETE, TableDeletePayload>
  | Operation<OperationType.TABLE_MERGE_CELLS, TableMergeCellsPayload>
  | Operation<OperationType.TABLE_SPLIT_CELL, TableSplitCellPayload>
  | Operation<OperationType.TABLE_TOGGLE_HEADER_ROW, { tableId: string }>
  | Operation<OperationType.TABLE_TOGGLE_FIRST_COLUMN, { tableId: string }>
  | Operation<OperationType.TOGGLE_UNORDERED_LIST, {}>
  | Operation<OperationType.TOGGLE_ORDERED_LIST, {}>
  | Operation<OperationType.DECREASE_INDENT, {}>
  | Operation<OperationType.INCREASE_INDENT, {}>
  | Operation<OperationType.SET_INDENTATION, SetIndentationPayload>
  | Operation<OperationType.SET_EDITING_MODE, SetEditingModePayload>;

/** @deprecated Use OperationType enum directly */
export const OPERATION_TYPES = OperationType;
