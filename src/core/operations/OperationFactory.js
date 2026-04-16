import { OPERATION_TYPES } from './OperationTypes.js';

export const Operations = {
  appendParagraph: (text) => ({
    type: OPERATION_TYPES.APPEND_PARAGRAPH,
    payload: { text },
  }),
  setSectionTemplate: (sectionId, templateId) => ({
    type: OPERATION_TYPES.SET_SECTION_TEMPLATE,
    payload: { sectionId, templateId },
  }),
  setSelection: (selection) => ({
    type: OPERATION_TYPES.SET_SELECTION,
    payload: { selection },
  }),
  insertText: (text) => ({
    type: OPERATION_TYPES.INSERT_TEXT,
    payload: { text },
  }),
  deleteText: () => ({
    type: OPERATION_TYPES.DELETE_TEXT,
    payload: {},
  }),
  insertParagraph: () => ({
    type: OPERATION_TYPES.INSERT_PARAGRAPH,
    payload: {},
  }),
  moveSelection: (key) => ({
    type: OPERATION_TYPES.MOVE_SELECTION,
    payload: { key },
  }),
  toggleMark: (mark) => ({
    type: OPERATION_TYPES.TOGGLE_MARK,
    payload: { mark },
  }),
};
