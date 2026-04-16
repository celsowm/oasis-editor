import { OPERATION_TYPES } from '../operations/OperationTypes.js';
import { createParagraph } from '../document/DocumentFactory.js';

export const reduceDocumentState = (state, operation) => {
  switch (operation.type) {
    case OPERATION_TYPES.SET_SELECTION:
      return {
        ...state,
        selection: operation.payload.selection,
      };

    case OPERATION_TYPES.SET_SECTION_TEMPLATE:
      return {
        ...state,
        document: {
          ...state.document,
          revision: state.document.revision + 1,
          sections: state.document.sections.map((section) =>
            section.id === operation.payload.sectionId
              ? { ...section, pageTemplateId: operation.payload.templateId }
              : section,
          ),
        },
      };

    case OPERATION_TYPES.APPEND_PARAGRAPH: {
      const [firstSection, ...rest] = state.document.sections;
      const nextParagraph = createParagraph(operation.payload.text);
      return {
        ...state,
        document: {
          ...state.document,
          revision: state.document.revision + 1,
          metadata: {
            ...state.document.metadata,
            updatedAt: Date.now(),
          },
          sections: [
            {
              ...firstSection,
              children: [...firstSection.children, nextParagraph],
            },
            ...rest,
          ],
        },
      };
    }

    default:
      return state;
  }
};
