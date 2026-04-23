import { EditorSelection } from "../selection/SelectionTypes.js";
import { MarkSet } from "../document/BlockTypes.js";

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
  SET_ALIGNMENT = "SET_ALIGNMENT",
  INSERT_IMAGE = "INSERT_IMAGE",
  RESIZE_IMAGE = "RESIZE_IMAGE",
  SELECT_IMAGE = "SELECT_IMAGE",
  INSERT_TABLE = "INSERT_TABLE",
  TABLE_ADD_ROW_ABOVE = "TABLE_ADD_ROW_ABOVE",
  TABLE_ADD_ROW_BELOW = "TABLE_ADD_ROW_BELOW",
  TABLE_ADD_COLUMN_LEFT = "TABLE_ADD_COLUMN_LEFT",
  TABLE_ADD_COLUMN_RIGHT = "TABLE_ADD_COLUMN_RIGHT",
  TABLE_DELETE_ROW = "TABLE_DELETE_ROW",
  TABLE_DELETE_COLUMN = "TABLE_DELETE_COLUMN",
  TABLE_DELETE = "TABLE_DELETE",
  MOVE_BLOCK = "MOVE_BLOCK",
  TOGGLE_UNORDERED_LIST = "TOGGLE_UNORDERED_LIST",
  TOGGLE_ORDERED_LIST = "TOGGLE_ORDERED_LIST",
}

export interface TableRowColPayload {
  tableId: string;
  referenceBlockId: string; // The block inside the cell we are using as reference
}

export interface TableDeletePayload {
  tableId: string;
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
  selection: EditorSelection;
}
export interface InsertTextPayload {
  text: string;
  newRunIds?: string[]; // For cases where we split runs
}
export interface DeleteTextPayload {}
export interface InsertParagraphPayload {
  newBlockId?: string;
  newRunId?: string;
}
export interface MoveSelectionPayload {
  key: string;
}
export interface ToggleMarkPayload {
  mark: keyof MarkSet;
}
export interface SetMarkPayload {
  mark: keyof MarkSet;
  value: any;
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
export interface InsertTablePayload {
  rows: number;
  cols: number;
  newTableId?: string;
  newRowIds?: string[];
  newCellIds?: string[];
  newParaIds?: string[];
  newRunIds?: string[];
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
export type InsertTableOp = Operation<
  OperationType.INSERT_TABLE,
  InsertTablePayload
>;

export type MoveBlockOp = Operation<
    OperationType.MOVE_BLOCK,
    MoveBlockPayload
>;

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
  | SetAlignmentOp
  | InsertImageOp
  | ResizeImageOp
  | SelectImageOp
  | InsertTableOp
  | MoveBlockOp
  | Operation<OperationType.TABLE_ADD_ROW_ABOVE, TableRowColPayload>
  | Operation<OperationType.TABLE_ADD_ROW_BELOW, TableRowColPayload>
  | Operation<OperationType.TABLE_ADD_COLUMN_LEFT, TableRowColPayload>
  | Operation<OperationType.TABLE_ADD_COLUMN_RIGHT, TableRowColPayload>
  | Operation<OperationType.TABLE_DELETE_ROW, TableRowColPayload>
  | Operation<OperationType.TABLE_DELETE_COLUMN, TableRowColPayload>
  | Operation<OperationType.TABLE_DELETE, TableDeletePayload>
  | Operation<OperationType.TOGGLE_UNORDERED_LIST, {}>
  | Operation<OperationType.TOGGLE_ORDERED_LIST, {}>;

/** @deprecated Use OperationType enum directly */
export const OPERATION_TYPES = OperationType;
