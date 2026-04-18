import {
  OperationType,
  AppendParagraphOp,
  SetSectionTemplateOp,
  SetSelectionOp,
  InsertTextOp,
  DeleteTextOp,
  InsertParagraphOp,
  MoveSelectionOp,
  ToggleMarkOp,
} from "./OperationTypes.js";
import { EditorSelection } from "../selection/SelectionTypes.js";
import { MarkSet } from "../document/BlockTypes.js";

export const Operations = {
  appendParagraph: (text: string): AppendParagraphOp => ({
    type: OperationType.APPEND_PARAGRAPH,
    payload: { text },
  }),
  setSectionTemplate: (
    sectionId: string,
    templateId: string,
  ): SetSectionTemplateOp => ({
    type: OperationType.SET_SECTION_TEMPLATE,
    payload: { sectionId, templateId },
  }),
  setSelection: (selection: EditorSelection): SetSelectionOp => ({
    type: OperationType.SET_SELECTION,
    payload: { selection },
  }),
  insertText: (text: string): InsertTextOp => ({
    type: OperationType.INSERT_TEXT,
    payload: { text },
  }),
  deleteText: (): DeleteTextOp => ({
    type: OperationType.DELETE_TEXT,
    payload: {},
  }),
  insertParagraph: (): InsertParagraphOp => ({
    type: OperationType.INSERT_PARAGRAPH,
    payload: {},
  }),
  moveSelection: (key: string): MoveSelectionOp => ({
    type: OperationType.MOVE_SELECTION,
    payload: { key },
  }),
  toggleMark: (mark: keyof MarkSet): ToggleMarkOp => ({
    type: OperationType.TOGGLE_MARK,
    payload: { mark },
  }),
  setAlignment: (
    align: "left" | "center" | "right" | "justify",
  ): SetAlignmentOp => ({
    type: OperationType.SET_ALIGNMENT,
    payload: { align },
  }),
};
