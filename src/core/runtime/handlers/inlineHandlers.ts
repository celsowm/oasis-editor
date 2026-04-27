import { EditorState } from "../EditorState.js";
import { findBlockById } from "../../document/BlockUtils.js";
import { isTextBlock, TextRun } from "../../document/BlockTypes.js";
import { areMarksEqual } from "../../document/MarkUtils.js";
import { LogicalPosition } from "../../selection/SelectionTypes.js";
import { updateDocumentSections } from "../../document/DocumentMutationUtils.js";
import { registerHandler } from "../OperationHandlers.js";
import { OperationType, SetSelectionOp, InsertTextOp, DeleteTextOp } from "../../operations/OperationTypes.js";

function handleSetSelection(state: EditorState, op: SetSelectionOp): EditorState {
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
    selectedImageId: op.payload.selectedImageId !== undefined ? op.payload.selectedImageId : state.selectedImageId,
    pendingMarks: shouldClearPending ? undefined : state.pendingMarks,
  };
}

function handleInsertText(state: EditorState, op: InsertTextOp): EditorState {
  const { selection, document, pendingMarks, idGenerator } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { text } = op.payload;

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

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
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
            id: idGenerator.nextRunId(),
            text: beforeText,
          });
        const combinedMarks = { ...run.marks, ...pendingMarks };
        const cleaned = Object.fromEntries(
          Object.entries(pendingMarks).filter(
            ([, v]) => v !== undefined && v !== false,
          ),
        );
        Object.assign(combinedMarks, cleaned);

        nextChildren.push({
          id: idGenerator.nextRunId(),
          text,
          marks: combinedMarks,
          ...(state.trackChangesEnabled ? {
            revision: {
              type: "insert" as const,
              author: "Author",
              date: Date.now(),
              id: idGenerator.nextBlockId(), // use blockId generator for revision id for now
            },
          } : {}),
        });
        if (afterText)
          nextChildren.push({
            ...run,
            id: idGenerator.nextRunId(),
            text: afterText,
          });
      } else {
        if (state.trackChangesEnabled) {
          if (beforeText)
            nextChildren.push({
              ...run,
              id: idGenerator.nextRunId(),
              text: beforeText,
            });
          nextChildren.push({
            id: idGenerator.nextRunId(),
            text,
            marks: { ...run.marks },
            revision: {
              type: "insert" as const,
              author: "Author",
              date: Date.now(),
              id: idGenerator.nextBlockId(),
            },
          });
          if (afterText)
            nextChildren.push({
              ...run,
              id: idGenerator.nextRunId(),
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

function handleDeleteText(state: EditorState, op: DeleteTextOp): EditorState {
  const { selection, document } = state;
  if (!selection) return state;

  // Range delete: anchor and focus are different — delete text between them
  if (
    selection.anchor.offset !== selection.focus.offset ||
    selection.anchor.blockId !== selection.focus.blockId
  ) {
    return deleteTextRange(state);
  }

  const { blockId, inlineId, offset } = selection.anchor;

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
      // Merge with previous block if possible
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

function deleteTextRange(state: EditorState): EditorState {
  const { selection } = state;
  if (!selection) return state;

  const { blockId } = selection.anchor;
  if (selection.anchor.blockId !== selection.focus.blockId) {
    return state;
  }

  const block = findBlockById(state.document, blockId);
  if (!block || !isTextBlock(block)) return state;

  let anchorAbs = 0;
  let focusAbs = 0;
  let anchorRun: TextRun | null = null;
  let focusRun: TextRun | null = null;

  for (const run of block.children) {
    const runLen = run.text.length;
    if (!anchorRun && selection.anchor.inlineId === run.id) {
      anchorAbs += selection.anchor.offset;
      anchorRun = run;
    } else if (!anchorRun) {
      anchorAbs += runLen;
    }
    if (!focusRun && selection.focus.inlineId === run.id) {
      focusAbs += selection.focus.offset;
      focusRun = run;
    } else if (!focusRun) {
      focusAbs += runLen;
    }
  }

  if (anchorRun === null || focusRun === null) return state;

  const startAbs = Math.min(anchorAbs, focusAbs);
  const endAbs = Math.max(anchorAbs, focusAbs);

  const nextChildren: TextRun[] = [];
  let acc = 0;
  for (const run of block.children) {
    const runLen = run.text.length;
    const runStart = acc;
    const runEnd = acc + runLen;

    if (endAbs <= runStart || startAbs >= runEnd) {
      nextChildren.push(run);
    } else {
      const sliceStart = Math.max(0, startAbs - runStart);
      const sliceEnd = Math.min(runLen, endAbs - runStart);
      const before = run.text.substring(0, sliceStart);
      const after = run.text.substring(sliceEnd);
      const newText = before + after;
      if (newText.length > 0 || nextChildren.length === 0) {
        nextChildren.push({ ...run, text: newText });
      }
    }
    acc += runLen;
  }

  const nextState = updateDocumentSections(state, blockId, (b) =>
    isTextBlock(b) ? { ...b, children: nextChildren } : b,
  );

  let newPos: LogicalPosition = { ...selection.anchor };
  acc = 0;
  for (const run of nextChildren) {
    if (startAbs >= acc && startAbs <= acc + run.text.length) {
      newPos = {
        ...selection.anchor,
        inlineId: run.id,
        offset: startAbs - acc,
      };
      break;
    }
    acc += run.text.length;
  }

  return {
    ...nextState,
    selection: { anchor: newPos, focus: newPos },
  };
}

export function registerInlineHandlers() {
  registerHandler(OperationType.SET_SELECTION, handleSetSelection);
  registerHandler(OperationType.INSERT_TEXT, handleInsertText);
  registerHandler(OperationType.DELETE_TEXT, handleDeleteText);
}
