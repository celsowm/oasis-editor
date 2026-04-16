import { OPERATION_TYPES } from '../operations/OperationTypes.js';
import { createParagraph } from '../document/DocumentFactory.js';

export const reduceDocumentState = (state, operation) => {
  const { document, selection } = state;

  switch (operation.type) {
    case OPERATION_TYPES.SET_SELECTION:
      return {
        ...state,
        selection: operation.payload.selection,
      };

    case OPERATION_TYPES.TOGGLE_MARK: {
      if (!selection) return state;
      const { blockId, inlineId } = selection.anchor;
      const mark = operation.payload.mark;

      const nextSections = document.sections.map(section => ({
        ...section,
        children: section.children.map(block => {
          if (block.id !== blockId) return block;

          const nextChildren = block.children.map(run => {
            if (run.id !== inlineId) return run;
            return {
              ...run,
              marks: {
                ...run.marks,
                [mark]: !run.marks[mark],
              }
            };
          });

          return { ...block, children: nextChildren };
        })
      }));

      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          sections: nextSections,
        },
      };
    }

    case OPERATION_TYPES.SET_SECTION_TEMPLATE:
      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          sections: document.sections.map((section) =>
            section.id === operation.payload.sectionId
              ? { ...section, pageTemplateId: operation.payload.templateId }
              : section,
          ),
        },
      };

    case OPERATION_TYPES.INSERT_TEXT: {
      if (!selection) return state;

      const { blockId, inlineId, offset } = selection.anchor;
      const text = operation.payload.text;

      const nextSections = document.sections.map(section => ({
        ...section,
        children: section.children.map(block => {
          if (block.id !== blockId) return block;

          const nextChildren = block.children.map(run => {
            if (run.id !== inlineId) return run;
            const before = run.text.substring(0, offset);
            const after = run.text.substring(offset);
            return { ...run, text: before + text + after };
          });

          return { ...block, children: nextChildren };
        })
      }));

      const nextOffset = offset + text.length;
      const nextPosition = { ...selection.anchor, offset: nextOffset };

      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          sections: nextSections,
        },
        selection: { anchor: nextPosition, focus: nextPosition },
      };
    }

    case OPERATION_TYPES.DELETE_TEXT: {
      if (!selection) return state;

      const { blockId, inlineId, offset } = selection.anchor;
      if (offset === 0) return state;

      const nextSections = document.sections.map(section => ({
        ...section,
        children: section.children.map(block => {
          if (block.id !== blockId) return block;

          const nextChildren = block.children.map(run => {
            if (run.id !== inlineId) return run;
            const before = run.text.substring(0, offset - 1);
            const after = run.text.substring(offset);
            return { ...run, text: before + after };
          });

          return { ...block, children: nextChildren };
        })
      }));

      const nextOffset = offset - 1;
      const nextPosition = { ...selection.anchor, offset: nextOffset };

      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          sections: nextSections,
        },
        selection: { anchor: nextPosition, focus: nextPosition },
      };
    }

    case OPERATION_TYPES.MOVE_SELECTION: {
      if (!selection) return state;
      const { key } = operation.payload;
      const { blockId, inlineId, offset } = selection.anchor;

      let nextOffset = offset;

      let currentBlock;
      for (const section of document.sections) {
        currentBlock = section.children.find(b => b.id === blockId);
        if (currentBlock) break;
      }

      const currentRun = currentBlock?.children.find(r => r.id === inlineId);
      const textLength = currentRun?.text.length || 0;

      if (key === 'ArrowLeft') {
        nextOffset = Math.max(0, offset - 1);
      } else if (key === 'ArrowRight') {
        nextOffset = Math.min(textLength, offset + 1);
      }

      const nextPosition = { ...selection.anchor, offset: nextOffset };
      return {
        ...state,
        selection: { anchor: nextPosition, focus: nextPosition },
      };
    }

    case OPERATION_TYPES.APPEND_PARAGRAPH: {
      const [firstSection, ...rest] = document.sections;
      const nextParagraph = createParagraph(operation.payload.text);
      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          metadata: {
            ...document.metadata,
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
