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
};
