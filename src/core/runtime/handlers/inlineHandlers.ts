import { EditorState } from "../EditorState.js";
import { findBlockById } from "../../document/BlockUtils.js";
import { isTextBlock, TextRun } from "../../document/BlockTypes.js";
import { areMarksEqual } from "../../document/MarkUtils.js";
import { LogicalPosition } from "../../selection/SelectionTypes.js";
import { updateDocumentSections } from "../../document/DocumentMutationUtils.js";
import { genId } from "../../utils/IdGenerator.js";
import { registerHandler } from "../OperationHandlers.js";
import { OperationType } from "../../operations/OperationTypes.js";

function handleSetSelection(state: EditorState, op: any): EditorState {
  const newSelection = op.payload.selection;
  
  // Clear pending marks if selection actually moves to a different position
  let shouldClearPending = true;
  if (state.selection && newSelection) {
      const s = state.selection.anchor;
      const n = newSelection.anchor;
      if (s.blockId === n.blockId && s.inlineId === n.inlineId && s.offset === n.offset) {
          shouldClearPending = false;
      }
  }

  return {
    ...state,
    selection: newSelection,
    selectedImageId: op.payload.selectedImageId || null,
    pendingMarks: shouldClearPending ? undefined : state.pendingMarks,
  };
}

function handleInsertText(state: EditorState, op: any): EditorState {
  const { selection, document, pendingMarks } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { text, newRunIds } = op.payload;

  const oldBlock = findBlockById(document, blockId);
  let absoluteOffset = 0;
  if (oldBlock && isTextBlock(oldBlock)) {
    for (const run of oldBlock.children) {
      if (run.id === inlineId) {
        absoluteOffset += offset;
        break;
      }
      accRun: absoluteOffset += run.text.length;
    }
  }

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
    let runIdx = 0;
    for (const run of block.children) {
      if (run.id !== inlineId) {
        nextChildren.push(run);
        continue;
      }
      const beforeText = run.text.substring(0, offset);
      const afterText = run.text.substring(offset);

      if (pendingMarks) {
        if (beforeText)
          nextChildren.push({
            ...run,
            id: newRunIds?.[runIdx++] || run.id + "_b",
            text: beforeText,
          });
        const combinedMarks = { ...run.marks, ...(pendingMarks || {}) };
        if (pendingMarks) {
          for (const key in pendingMarks) {
            if ((pendingMarks as any)[key] === undefined || (pendingMarks as any)[key] === false) {
              delete (combinedMarks as any)[key];
            }
          }
        }

        nextChildren.push({
          id: newRunIds?.[runIdx++] || run.id + "_t",
          text,
          marks: combinedMarks,
          ...(state.trackChangesEnabled ? {
            revision: {
              type: "insert" as const,
              author: "Author",
              date: Date.now(),
              id: genId("rev"),
            },
          } : {}),
        });
        if (afterText)
          nextChildren.push({
            ...run,
            id: newRunIds?.[runIdx++] || run.id + "_a",
            text: afterText,
          });
      } else {
        if (state.trackChangesEnabled) {
          if (beforeText)
            nextChildren.push({
              ...run,
              id: newRunIds?.[runIdx++] || run.id + "_b",
              text: beforeText,
            });
          nextChildren.push({
            id: newRunIds?.[runIdx++] || run.id + "_t",
            text,
            marks: { ...run.marks },
            revision: {
              type: "insert" as const,
              author: "Author",
              date: Date.now(),
              id: genId("rev"),
            },
          });
          if (afterText)
            nextChildren.push({
              ...run,
              id: newRunIds?.[runIdx++] || run.id + "_a",
              text: afterText,
            });
        } else {
          nextChildren.push({ ...run, text: beforeText + text + afterText });
        }
      }
    }

    const merged: TextRun[] = [];
    for (const r of nextChildren) {
      const last = merged[merged.length - 1];
      const canMerge =
        last &&
        r.text !== "" &&
        areMarksEqual(last.marks, r.marks) &&
        !last.revision &&
        !r.revision &&
        !last.field &&
        !r.field;
      if (canMerge) {
        merged[merged.length - 1].text += r.text;
      } else {
        merged.push({ ...r });
      }
    }
    return { ...block, children: merged };
  });

  const targetAbsoluteOffset = absoluteOffset + text.length;
  let nextPosition: LogicalPosition = { ...selection.anchor };
  const block = findBlockById(nextState.document, blockId);
  if (block && isTextBlock(block)) {
    let acc = 0;
    for (const run of block.children) {
      if (
        targetAbsoluteOffset >= acc &&
        targetAbsoluteOffset <= acc + run.text.length
      ) {
        nextPosition = {
          ...selection.anchor,
          inlineId: run.id,
          offset: targetAbsoluteOffset - acc,
        };
        break;
      }
      acc += run.text.length;
    }
  }

  return {
    ...nextState,
    selection: { anchor: nextPosition, focus: nextPosition },
    // Preserve pendingMarks to allow continuous typing with the same style
    pendingMarks: state.pendingMarks,
  };
}

function handleDeleteText(state: EditorState, op: any): EditorState {
  const { selection, document } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;

  if (
    selection.anchor.offset !== selection.focus.offset ||
    selection.anchor.blockId !== selection.focus.blockId
  ) {
    return state; // Range delete TODO
  }

  const oldBlock = findBlockById(document, blockId);
  let absoluteOffset = 0;
  if (oldBlock && isTextBlock(oldBlock)) {
    for (const run of oldBlock.children) {
      if (run.id === inlineId) {
        absoluteOffset += offset;
        break;
      }
      absoluteOffset += run.text.length;
    }
  }

  if (absoluteOffset === 0) {
      // Merge with previous block if possible (not implemented here for brevity, 
      // but logic would call tryMergeSiblings)
      return state;
  }

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
    for (const run of block.children) {
      if (run.id !== inlineId) {
        nextChildren.push(run);
        continue;
      }
      const beforeText = run.text.substring(0, offset - 1);
      const afterText = run.text.substring(offset);
      nextChildren.push({ ...run, text: beforeText + afterText });
    }
    return { ...block, children: nextChildren };
  });

  const targetAbsoluteOffset = absoluteOffset - 1;
  let nextPosition: LogicalPosition = { ...selection.anchor };
  const block = findBlockById(nextState.document, blockId);
  if (block && isTextBlock(block)) {
    let acc = 0;
    for (const run of block.children) {
      if (
        targetAbsoluteOffset >= acc &&
        targetAbsoluteOffset <= acc + run.text.length
      ) {
        nextPosition = {
          ...selection.anchor,
          inlineId: run.id,
          offset: targetAbsoluteOffset - acc,
        };
        break;
      }
      acc += run.text.length;
    }
  }

  return {
    ...nextState,
    selection: { anchor: nextPosition, focus: nextPosition },
  };
}

export function registerInlineHandlers() {
  registerHandler(OperationType.SET_SELECTION, handleSetSelection);
  registerHandler(OperationType.INSERT_TEXT, handleInsertText);
  registerHandler(OperationType.DELETE_TEXT, handleDeleteText);
}
