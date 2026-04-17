import { EditorState } from "./EditorState.js";
import {
  EditorOperation,
  OperationType,
} from "../operations/OperationTypes.js";
import { createParagraph } from "../document/DocumentFactory.js";
import { LogicalPosition } from "../selection/SelectionTypes.js";
import { TextRun } from "../document/BlockTypes.js";

const genId = (prefix: string): string =>
  `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).substring(2, 8)}`;

export const reduceDocumentState = (
  state: EditorState,
  operation: EditorOperation,
): EditorState => {
  const { document, selection } = state;

  switch (operation.type) {
    case OperationType.SET_SELECTION:
      console.log("REDUCER: SET_SELECTION recebido");
      console.log("REDUCER: Nova selecao:", operation.payload.selection);
      return {
        ...state,
        selection: operation.payload.selection,
      };

    case OperationType.TOGGLE_MARK: {
      if (!selection) return state;

      const mark = operation.payload.mark;

      // Find chronological order of selection
      const blocksFlat = document.sections.flatMap((s) => s.children);
      const anchorBlockIdx = blocksFlat.findIndex(
        (b) => b.id === selection.anchor.blockId,
      );
      const focusBlockIdx = blocksFlat.findIndex(
        (b) => b.id === selection.focus.blockId,
      );

      if (anchorBlockIdx === -1 || focusBlockIdx === -1) return state;

      let startPos: LogicalPosition;
      let endPos: LogicalPosition;
      if (
        anchorBlockIdx < focusBlockIdx ||
        (anchorBlockIdx === focusBlockIdx &&
          selection.anchor.offset <= selection.focus.offset)
      ) {
        startPos = selection.anchor;
        endPos = selection.focus;
      } else {
        startPos = selection.focus;
        endPos = selection.anchor;
      }

      if (
        startPos.offset === endPos.offset &&
        startPos.blockId === endPos.blockId
      ) {
        return state;
      }

      let inSelection = false;
      let selectionToggleTarget: boolean | undefined;

      const nextSections = document.sections.map((section) => ({
        ...section,
        children: section.children.map((block) => {
          const isStartBlock = block.id === startPos.blockId;
          const isEndBlock = block.id === endPos.blockId;

          if (!inSelection && !isStartBlock) return block;
          if (isStartBlock) inSelection = true;

          let currentOffset = 0;
          const nextRuns: TextRun[] = [];

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
              const overlapText = run.text.substring(
                overlapStart - runStart,
                overlapEnd - runStart,
              );
              const afterText = run.text.substring(overlapEnd - runStart);

              if (selectionToggleTarget === undefined) {
                selectionToggleTarget = !run.marks[mark];
              }

              if (beforeText) {
                nextRuns.push({ ...run, id: genId("run"), text: beforeText });
              }
              if (overlapText) {
                nextRuns.push({
                  ...run,
                  id: genId("run"),
                  text: overlapText,
                  marks: { ...run.marks, [mark]: selectionToggleTarget },
                });
              }
              if (afterText) {
                nextRuns.push({ ...run, id: genId("run"), text: afterText });
              }
            } else {
              nextRuns.push(run);
            }
          }

          if (isEndBlock) inSelection = false;

          // Merge adjacent runs with identical marks
          const mergedRuns: TextRun[] = [];
          for (const run of nextRuns) {
            if (mergedRuns.length > 0) {
              const last = mergedRuns[mergedRuns.length - 1];
              if (JSON.stringify(last.marks) === JSON.stringify(run.marks)) {
                last.text += run.text;
                continue;
              }
            }
            mergedRuns.push({ ...run });
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

    case OperationType.SET_SECTION_TEMPLATE:
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

    case OperationType.INSERT_TEXT: {
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
      const nextPosition: LogicalPosition = {
        ...selection.anchor,
        offset: nextOffset,
      };

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

    case OperationType.DELETE_TEXT: {
      if (!selection) return state;

      const { blockId, inlineId, offset } = selection.anchor;

      if (offset > 0) {
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
        const nextPosition: LogicalPosition = {
          ...selection.anchor,
          offset: nextOffset,
        };

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

      if (offset === 0) {
        let sectionIdx = -1;
        let blockIdx = -1;

        for (let i = 0; i < document.sections.length; i++) {
          const idx = document.sections[i].children.findIndex(
            (b) => b.id === blockId,
          );
          if (idx !== -1) {
            sectionIdx = i;
            blockIdx = idx;
            break;
          }
        }

        if (sectionIdx === -1) return state;

        const section = document.sections[sectionIdx];
        const block = section.children[blockIdx];
        const runIdx = block.children.findIndex((r) => r.id === inlineId);

        if (runIdx > 0) {
          const prevRun = block.children[runIdx - 1];
          const newPosition: LogicalPosition = {
            ...selection.anchor,
            inlineId: prevRun.id,
            offset: prevRun.text.length,
          };

          if (prevRun.text.length > 0) {
            const nextSections = document.sections.map((s, sIdx) => {
              if (sIdx !== sectionIdx) return s;
              return {
                ...s,
                children: s.children.map((b) => {
                  if (b.id !== blockId) return b;
                  return {
                    ...b,
                    children: b.children.map((r) => {
                      if (r.id !== prevRun.id) return r;
                      return { ...r, text: r.text.slice(0, -1) };
                    }),
                  };
                }),
              };
            });
            const finalPosition: LogicalPosition = {
              ...newPosition,
              offset: prevRun.text.length - 1,
            };
            return {
              ...state,
              document: {
                ...document,
                revision: document.revision + 1,
                sections: nextSections,
              },
              selection: { anchor: finalPosition, focus: finalPosition },
            };
          } else {
            return {
              ...state,
              selection: { anchor: newPosition, focus: newPosition },
            };
          }
        }

        if (runIdx === 0 && blockIdx > 0) {
          const prevBlock = section.children[blockIdx - 1];
          const lastRunOfPrevBlock =
            prevBlock.children[prevBlock.children.length - 1];

          const newPosition: LogicalPosition = {
            sectionId: section.id,
            blockId: prevBlock.id,
            inlineId: lastRunOfPrevBlock.id,
            offset: lastRunOfPrevBlock.text.length,
          };

          const nextSections = document.sections.map((s, sIdx) => {
            if (sIdx !== sectionIdx) return s;

            const newChildren = [...s.children];
            newChildren[blockIdx - 1] = {
              ...prevBlock,
              children: [...prevBlock.children, ...block.children],
            };
            newChildren.splice(blockIdx, 1);

            return { ...s, children: newChildren };
          });

          return {
            ...state,
            document: {
              ...document,
              revision: document.revision + 1,
              sections: nextSections,
            },
            selection: { anchor: newPosition, focus: newPosition },
          };
        }
      }

      return state;
    }

    case OperationType.INSERT_PARAGRAPH: {
      if (!selection) return state;

      const { blockId, inlineId, offset } = selection.anchor;

      let nextBlockId: string | null = null;
      let nextInlineId: string | null = null;
      let nextSectionId: string | null = null;

      const nextSections = document.sections.map((section) => {
        const blockIndex = section.children.findIndex((b) => b.id === blockId);
        if (blockIndex === -1) return section;

        const currentBlock = section.children[blockIndex];
        const runIndex = currentBlock.children.findIndex(
          (r) => r.id === inlineId,
        );

        if (runIndex === -1) return section;

        const run = currentBlock.children[runIndex];

        const beforeText = run.text.substring(0, offset);
        const afterText = run.text.substring(offset);

        let currentBlockRuns: TextRun[] = [
          ...currentBlock.children.slice(0, runIndex),
          { ...run, id: genId("run"), text: beforeText },
        ];
        currentBlockRuns = currentBlockRuns.filter(
          (r) => r.text.length > 0 || currentBlockRuns.length === 1,
        );

        if (currentBlockRuns.length === 0) {
          currentBlockRuns.push({
            id: genId("run"),
            text: "",
            marks: { ...run.marks },
          });
        }

        const newBlockRuns: TextRun[] = [
          { ...run, id: genId("run"), text: afterText },
          ...currentBlock.children
            .slice(runIndex + 1)
            .map((r) => ({ ...r, id: genId("run") })),
        ];

        if (newBlockRuns[0].text === "" && newBlockRuns.length > 1) {
          newBlockRuns.shift();
        }

        nextBlockId = genId("block");
        nextInlineId = newBlockRuns[0].id;
        nextSectionId = section.id;

        const newBlock = {
          ...currentBlock,
          id: nextBlockId,
          children: newBlockRuns,
        };

        const currentBlockUpdated = {
          ...currentBlock,
          children: currentBlockRuns,
        };

        const newChildren = [
          ...section.children.slice(0, blockIndex),
          currentBlockUpdated,
          newBlock,
          ...section.children.slice(blockIndex + 1),
        ];

        return { ...section, children: newChildren };
      });

      if (!nextBlockId) return state;

      const nextPosition: LogicalPosition = {
        sectionId: nextSectionId!,
        blockId: nextBlockId,
        inlineId: nextInlineId!,
        offset: 0,
      };

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

    case OperationType.MOVE_SELECTION: {
      if (!selection) return state;
      const { key } = operation.payload;
      const { blockId, inlineId, offset } = selection.anchor;

      let nextOffset = offset;

      let currentBlock = undefined;
      for (const section of document.sections) {
        currentBlock = section.children.find((b) => b.id === blockId);
        if (currentBlock) break;
      }

      const currentRun = currentBlock?.children.find((r) => r.id === inlineId);
      const textLength = currentRun?.text.length ?? 0;

      if (key === "ArrowLeft") {
        nextOffset = Math.max(0, offset - 1);
      } else if (key === "ArrowRight") {
        nextOffset = Math.min(textLength, offset + 1);
      }

      const nextPosition: LogicalPosition = {
        ...selection.anchor,
        offset: nextOffset,
      };
      return {
        ...state,
        selection: { anchor: nextPosition, focus: nextPosition },
      };
    }

    case OperationType.APPEND_PARAGRAPH: {
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
