// @ts-nocheck








import { OPERATION_TYPES } from "../operations/OperationTypes.js";
import { createParagraph } from "../document/DocumentFactory.js";

export const reduceDocumentState = (state, operation) => {
  const { document, selection } = state;

  switch (operation.type) {
    case OPERATION_TYPES.SET_SELECTION:
      console.log('REDUCER: SET_SELECTION recebido');
      console.log('REDUCER: Nova selecao:', operation.payload.selection);
      return {
        ...state,
        selection: operation.payload.selection,
      };

    case OPERATION_TYPES.TOGGLE_MARK: {
      if (!selection) return state;

      const mark = operation.payload.mark;

      // Find chronological order of selection
      const blocksFlat = document.sections.flatMap(s => s.children);
      const anchorBlockIdx = blocksFlat.findIndex(b => b.id === selection.anchor.blockId);
      const focusBlockIdx = blocksFlat.findIndex(b => b.id === selection.focus.blockId);

      // If selection spans outside known bounds, abort
      if (anchorBlockIdx === -1 || focusBlockIdx === -1) return state;

      let startPos, endPos;
      if (anchorBlockIdx < focusBlockIdx || (anchorBlockIdx === focusBlockIdx && selection.anchor.offset <= selection.focus.offset)) {
         startPos = selection.anchor;
         endPos = selection.focus;
      } else {
         startPos = selection.focus;
         endPos = selection.anchor;
      }

      if (startPos.offset === endPos.offset && startPos.blockId === endPos.blockId) {
         return state; // Basic implementation doesn't toggle empty selections yet
      }

      let inSelection = false;
      let selectionToggleTarget = undefined;

      const nextSections = document.sections.map((section) => ({
        ...section,
        children: section.children.map((block) => {
          const isStartBlock = block.id === startPos.blockId;
          const isEndBlock = block.id === endPos.blockId;

          if (!inSelection && !isStartBlock) return block;
          if (isStartBlock) inSelection = true;

          let currentOffset = 0;
          const nextRuns = [];

          for (const run of block.children) {
            const runLength = run.text.length;
            const runStart = currentOffset;
            const runEnd = currentOffset + runLength;
            currentOffset += runLength;

            const selStart = isStartBlock ? startPos.offset : 0;
            const selEnd = isEndBlock ? endPos.offset : Infinity;

            const overlapStart = Math.max(runStart, selStart);
            const overlapEnd = Math.min(runEnd, selEnd);

            if (overlapStart < overlapEnd) {
              const beforeText = run.text.substring(0, overlapStart - runStart);
              const overlapText = run.text.substring(overlapStart - runStart, overlapEnd - runStart);
              const afterText = run.text.substring(overlapEnd - runStart);

              if (selectionToggleTarget === undefined) {
                 selectionToggleTarget = !run.marks[mark];
              }

              if (beforeText) {
                nextRuns.push({ ...run, id: `run:${Date.now().toString(36)}:${Math.random().toString(36).substr(2, 6)}`, text: beforeText });
              }
              if (overlapText) {
                nextRuns.push({
                   ...run,
                   id: `run:${Date.now().toString(36)}:${Math.random().toString(36).substr(2, 6)}`,
                   text: overlapText,
                   marks: { ...run.marks, [mark]: selectionToggleTarget }
                });
              }
              if (afterText) {
                nextRuns.push({ ...run, id: `run:${Date.now().toString(36)}:${Math.random().toString(36).substr(2, 6)}`, text: afterText });
              }
            } else {
              nextRuns.push(run);
            }
          }

          if (isEndBlock) inSelection = false;

          // Merge adjacent runs with identical marks
          const mergedRuns = [];
          for (const run of nextRuns) {
            if (mergedRuns.length > 0) {
              const last = mergedRuns[mergedRuns.length - 1];
              if (JSON.stringify(last.marks) === JSON.stringify(run.marks)) {
                 last.text += run.text;
                 continue;
              }
            }
            mergedRuns.push(run);
          }

          return { ...block, children: mergedRuns };
        }),
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

      const nextSections = document.sections.map((section) => ({
        ...section,
        children: section.children.map((block) => {
          if (block.id !== blockId) return block;

          const nextChildren = block.children.map((run) => {
            if (run.id !== inlineId) return run;
            const before = run.text.substring(0, offset);
            const after = run.text.substring(offset);
            return { ...run, text: before + text + after };
          });

          return { ...block, children: nextChildren };
        }),
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

      const nextSections = document.sections.map((section) => ({
        ...section,
        children: section.children.map((block) => {
          if (block.id !== blockId) return block;

          const nextChildren = block.children.map((run) => {
            if (run.id !== inlineId) return run;
            const before = run.text.substring(0, offset - 1);
            const after = run.text.substring(offset);
            return { ...run, text: before + after };
          });

          return { ...block, children: nextChildren };
        }),
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
        currentBlock = section.children.find((b) => b.id === blockId);
        if (currentBlock) break;
      }

      const currentRun = currentBlock?.children.find((r) => r.id === inlineId);
      const textLength = currentRun?.text.length || 0;

      if (key === "ArrowLeft") {
        nextOffset = Math.max(0, offset - 1);
      } else if (key === "ArrowRight") {
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
