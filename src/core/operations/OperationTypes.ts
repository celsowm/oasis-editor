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
  SET_ALIGNMENT = "SET_ALIGNMENT",
}

export interface AppendParagraphPayload {
  text: string;
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
}
export interface DeleteTextPayload {}
export interface InsertParagraphPayload {}
export interface MoveSelectionPayload {
  key: string;
}
export interface ToggleMarkPayload {
  mark: keyof MarkSet;
}
export interface SetAlignmentPayload {
  align: "left" | "center" | "right" | "justify";
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
export type SetAlignmentOp = Operation<
  OperationType.SET_ALIGNMENT,
  SetAlignmentPayload
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
  | SetAlignmentOp;

/** @deprecated Use OperationType enum directly */
export const OPERATION_TYPES = OperationType;
