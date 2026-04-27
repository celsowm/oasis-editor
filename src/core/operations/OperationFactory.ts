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
  SetMarkOp,
  ApplyFormatOp,
  SetAlignmentOp,
  InsertImageOp,
  ResizeImageOp,
  SelectImageOp,
  UpdateImageOp,
  InsertTableOp,
  MoveBlockOp,
  EditorOperation,
} from "./OperationTypes.js";
import { EditorSelection } from "../selection/SelectionTypes.js";
import { MarkSet, FieldInfo } from "../document/BlockTypes.js";
import { genId } from "../utils/IdGenerator.js";

export const Operations = {
  appendParagraph: (text: string): AppendParagraphOp => ({
    type: OperationType.APPEND_PARAGRAPH,
    payload: { text, newBlockId: genId("block"), newRunId: genId("run") },
  }),
  setSectionTemplate: (
    sectionId: string,
    templateId: string,
  ): SetSectionTemplateOp => ({
    type: OperationType.SET_SECTION_TEMPLATE,
    payload: { sectionId, templateId },
  }),
  setSelection: (
    selection: EditorSelection | null,
    selectedImageId: string | null = null,
  ): SetSelectionOp => ({
    type: OperationType.SET_SELECTION,
    payload: { selection, selectedImageId },
  }),
  insertText: (text: string): InsertTextOp => ({
    type: OperationType.INSERT_TEXT,
    payload: { text, newRunIds: [genId("run"), genId("run"), genId("run")] },
  }),
  deleteText: (): DeleteTextOp => ({
    type: OperationType.DELETE_TEXT,
    payload: {},
  }),
  insertParagraph: (): InsertParagraphOp => ({
    type: OperationType.INSERT_PARAGRAPH,
    payload: { newBlockId: genId("block"), newRunId: genId("run") },
  }),
  moveSelection: (key: string): MoveSelectionOp => ({
    type: OperationType.MOVE_SELECTION,
    payload: { key },
  }),
  toggleMark: (mark: keyof MarkSet, value?: any): ToggleMarkOp => ({
    type: OperationType.TOGGLE_MARK,
    payload: { mark, value },
  }),
  setMark: (mark: keyof MarkSet, value: any): SetMarkOp => ({
    type: OperationType.SET_MARK,
    payload: { mark, value },
  }),
  applyFormat: (
    marks: MarkSet,
    align?: "left" | "center" | "right" | "justify",
  ): ApplyFormatOp => ({
    type: OperationType.APPLY_FORMAT,
    payload: { marks, align },
  }),
  setAlignment: (
    align: "left" | "center" | "right" | "justify",
  ): SetAlignmentOp => ({
    type: OperationType.SET_ALIGNMENT,
    payload: { align },
  }),
  insertImage: (
    src: string,
    naturalWidth: number,
    naturalHeight: number,
    displayWidth: number,
    align: "left" | "center" | "right" = "center",
    alt = "",
  ): InsertImageOp => ({
    type: OperationType.INSERT_IMAGE,
    payload: {
      src,
      naturalWidth,
      naturalHeight,
      displayWidth,
      align,
      alt,
      newBlockId: genId("block"),
    },
  }),
  resizeImage: (
    blockId: string,
    width: number,
    height: number,
  ): ResizeImageOp => ({
    type: OperationType.RESIZE_IMAGE,
    payload: { blockId, width, height },
  }),
  selectImage: (blockId: string): SelectImageOp => ({
    type: OperationType.SELECT_IMAGE,
    payload: { blockId },
  }),
  updateImage: (
    blockId: string,
    alt?: string,
    width?: number,
    height?: number,
  ): UpdateImageOp => ({
    type: OperationType.UPDATE_IMAGE,
    payload: { blockId, alt, width, height },
  }),
  insertTable: (rows: number, cols: number): EditorOperation => {
    const newTableId = genId("table");
    const newRowIds = Array.from({ length: rows }, () => genId("row"));
    const newCellIds = Array.from({ length: rows * cols }, () => genId("cell"));
    const newParaIds = Array.from({ length: rows * cols }, () =>
      genId("block"),
    );
    const newRunIds = Array.from({ length: rows * cols }, () => genId("run"));
    return {
      type: OperationType.INSERT_TABLE,
      payload: {
        rows,
        cols,
        newTableId,
        newRowIds,
        newCellIds,
        newParaIds,
        newRunIds,
      },
    };
  },

  tableAddRowAbove: (
    tableId: string,
    referenceBlockId: string,
  ): EditorOperation => ({
    type: OperationType.TABLE_ADD_ROW_ABOVE,
    payload: { tableId, referenceBlockId },
  }),
  tableAddRowBelow: (
    tableId: string,
    referenceBlockId: string,
  ): EditorOperation => ({
    type: OperationType.TABLE_ADD_ROW_BELOW,
    payload: { tableId, referenceBlockId },
  }),
  tableAddColumnLeft: (
    tableId: string,
    referenceBlockId: string,
  ): EditorOperation => ({
    type: OperationType.TABLE_ADD_COLUMN_LEFT,
    payload: { tableId, referenceBlockId },
  }),
  tableAddColumnRight: (
    tableId: string,
    referenceBlockId: string,
  ): EditorOperation => ({
    type: OperationType.TABLE_ADD_COLUMN_RIGHT,
    payload: { tableId, referenceBlockId },
  }),
  tableDeleteRow: (
    tableId: string,
    referenceBlockId: string,
  ): EditorOperation => ({
    type: OperationType.TABLE_DELETE_ROW,
    payload: { tableId, referenceBlockId },
  }),
  tableDeleteColumn: (
    tableId: string,
    referenceBlockId: string,
  ): EditorOperation => ({
    type: OperationType.TABLE_DELETE_COLUMN,
    payload: { tableId, referenceBlockId },
  }),
  tableDelete: (tableId: string): EditorOperation => ({
    type: OperationType.TABLE_DELETE,
    payload: { tableId },
  }),
  tableMergeCells: (
    tableId: string,
    anchorBlockId: string,
    targetBlockId: string,
  ): EditorOperation => ({
    type: OperationType.TABLE_MERGE_CELLS,
    payload: { tableId, anchorBlockId, targetBlockId },
  }),
  tableSplitCell: (
    tableId: string,
    referenceBlockId: string,
  ): EditorOperation => ({
    type: OperationType.TABLE_SPLIT_CELL,
    payload: { tableId, referenceBlockId },
  }),
  tableToggleHeaderRow: (tableId: string): EditorOperation => ({
    type: OperationType.TABLE_TOGGLE_HEADER_ROW,
    payload: { tableId },
  }),
  tableToggleFirstColumn: (tableId: string): EditorOperation => ({
    type: OperationType.TABLE_TOGGLE_FIRST_COLUMN,
    payload: { tableId },
  }),
  moveBlock: (
    blockId: string,
    targetReferenceBlockId: string,
    isBefore = false,
  ): MoveBlockOp => ({
    type: OperationType.MOVE_BLOCK,
    payload: { blockId, targetReferenceBlockId, isBefore },
  }),
  toggleUnorderedList: (): EditorOperation => ({
    type: OperationType.TOGGLE_UNORDERED_LIST,
    payload: {},
  }),
  toggleOrderedList: (): EditorOperation => ({
    type: OperationType.TOGGLE_ORDERED_LIST,
    payload: {},
  }),
  decreaseIndent: (): EditorOperation => ({
    type: OperationType.DECREASE_INDENT,
    payload: {},
  }),
  increaseIndent: (): EditorOperation => ({
    type: OperationType.INCREASE_INDENT,
    payload: {},
  }),
  setIndentation: (indentation: number): EditorOperation => ({
    type: OperationType.SET_INDENTATION,
    payload: { indentation },
  }),
  setEditingMode: (mode: "main" | "header" | "footer" | "footnote", footnoteId?: string): EditorOperation => ({
    type: OperationType.SET_EDITING_MODE,
    payload: { mode, footnoteId },
  }),
  insertPageBreak: (): EditorOperation => ({
    type: OperationType.INSERT_PAGE_BREAK,
    payload: { newBlockId: genId("block") },
  }),
  insertField: (field: FieldInfo): EditorOperation => ({
    type: OperationType.INSERT_FIELD,
    payload: { field, newRunId: genId("run") },
  }),
  setStyle: (styleId: string): EditorOperation => ({
    type: OperationType.SET_STYLE,
    payload: { styleId },
  }),
  toggleTrackChanges: (): EditorOperation => ({
    type: OperationType.TOGGLE_TRACK_CHANGES,
    payload: {},
  }),
  acceptRevision: (runId: string): EditorOperation => ({
    type: OperationType.ACCEPT_REVISION,
    payload: { runId },
  }),
  rejectRevision: (runId: string): EditorOperation => ({
    type: OperationType.REJECT_REVISION,
    payload: { runId },
  }),
  insertEquation: (
    latex: string,
    display = false,
  ): EditorOperation => ({
    type: OperationType.INSERT_EQUATION,
    payload: { latex, display, newBlockId: genId("block") },
  }),
  insertBookmark: (name: string): EditorOperation => ({
    type: OperationType.INSERT_BOOKMARK,
    payload: { name, newRunId: genId("run") },
  }),
  insertFootnote: (): EditorOperation => ({
    type: OperationType.INSERT_FOOTNOTE,
    payload: { text: "", newRunId: genId("run"), newBlockId: genId("block") },
  }),
  insertEndnote: (): EditorOperation => ({
    type: OperationType.INSERT_ENDNOTE,
    payload: { text: "", newRunId: genId("run"), newBlockId: genId("block") },
  }),
  insertComment: (text: string): EditorOperation => ({
    type: OperationType.INSERT_COMMENT,
    payload: { text, newRunId: genId("run"), newBlockId: genId("block") },
  }),
};
