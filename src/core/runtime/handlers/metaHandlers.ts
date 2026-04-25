import { registerHandler } from "../OperationHandlers.js";
import { OperationType } from "../../operations/OperationTypes.js";

export function registerMetaHandlers(): void {
  registerHandler(OperationType.SET_SECTION_TEMPLATE, (state, op) => {
    const { sectionId, templateId } = op.payload;
    const nextSections = state.document.sections.map((s) =>
      s.id === sectionId ? { ...s, pageTemplateId: templateId } : s,
    );
    return {
      ...state,
      document: {
        ...state.document,
        revision: state.document.revision + 1,
        sections: nextSections,
      },
    };
  });

  registerHandler(OperationType.SET_EDITING_MODE, (state, op) => {
    return {
      ...state,
      editingMode: op.payload.mode,
    };
  });
}
