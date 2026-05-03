import { EditorState } from "../EditorState.js";
import { findBlockById, getAllBlocks } from "../../document/BlockUtils.js";
import { isTextBlock, TextRun } from "../../document/BlockTypes.js";
import { transformBlocks } from "../../document/BlockVisitor.js";
import { areMarksEqual } from "../../document/MarkUtils.js";
import { applyPendingMarks } from "../../document/MarkUtils.js";
import { LogicalPosition } from "../../selection/SelectionTypes.js";
import { updateDocumentSections } from "../../document/DocumentMutationUtils.js";
import { registerHandler } from "../OperationHandlers.js";
import { OperationType, SetSelectionOp, InsertTextOp, DeleteTextOp } from "../../operations/OperationTypes.js";
import { Logger, isDebugEnabled } from "../../utils/Logger.js";

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

  if (isDebugEnabled()) {
    Logger.debug("INLINE: insertText:start", {
      blockId,
      inlineId,
      offset,
      text,
      hasPendingMarks: !!pendingMarks,
      oldBlockText: oldBlock && isTextBlock(oldBlock)
        ? oldBlock.children.map((run) => run.text).join("")
        : null,
    });
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
        const effectiveMarks = applyPendingMarks(run.marks, pendingMarks);
        Logger.debug("INLINE: insertText with pendingMarks", {
          blockId,
          inlineId,
          offset,
          text,
          runId: run.id,
          pendingMarks,
          effectiveMarks,
        });
        if (beforeText)
          nextChildren.push({
            ...run,
            id: idGenerator.nextRunId(),
            text: beforeText,
          });

        nextChildren.push({
          id: idGenerator.nextRunId(),
          text,
          marks: effectiveMarks,
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
    Logger.debug("INLINE: insertText:end", {
      blockId,
      nextBlockText: block.children.map((run) => run.text).join(""),
      nextRunCount: block.children.length,
      nextSelection: nextPosition,
    });
  } else {
    Logger.debug("INLINE: insertText:end", {
      blockId,
      nextBlockText: null,
      nextRunCount: 0,
      nextSelection: nextPosition,
    });
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
  const { selection, document } = state;
  if (!selection) return state;

  const { anchor, focus } = selection;

  // 1. Determine document order
  const allBlocks = getAllBlocks(document);
  const anchorIdx = allBlocks.findIndex((b) => b.id === anchor.blockId);
  const focusIdx = allBlocks.findIndex((b) => b.id === focus.blockId);

  if (anchorIdx === -1 || focusIdx === -1) return state;

  let startPos: LogicalPosition;
  let endPos: LogicalPosition;
  let startIdx: number;
  let endIdx: number;

  if (anchorIdx < focusIdx) {
    startPos = anchor;
    endPos = focus;
    startIdx = anchorIdx;
    endIdx = focusIdx;
  } else if (anchorIdx > focusIdx) {
    startPos = focus;
    endPos = anchor;
    startIdx = focusIdx;
    endIdx = anchorIdx;
  } else {
    // Same block deletion
    const block = allBlocks[anchorIdx];
    if (!block || !isTextBlock(block)) return state;

    let anchorAbs = 0;
    let focusAbs = 0;
    let anchorRun: TextRun | null = null;
    let focusRun: TextRun | null = null;

    for (const run of block.children) {
      const runLen = run.text.length;
      if (!anchorRun && anchor.inlineId === run.id) {
        anchorAbs += anchor.offset;
        anchorRun = run;
      } else if (!anchorRun) {
        anchorAbs += runLen;
      }
      if (!focusRun && focus.inlineId === run.id) {
        focusAbs += focus.offset;
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

    const nextState = updateDocumentSections(state, block.id, (b) =>
      isTextBlock(b) ? { ...b, children: nextChildren } : b,
    );

    let newPos: LogicalPosition = { ...anchor };
    acc = 0;
    for (const run of nextChildren) {
      if (startAbs >= acc && startAbs <= acc + run.text.length) {
        newPos = {
          ...anchor,
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

  // 2. Cross-block deletion
  const startBlock = allBlocks[startIdx];
  const endBlock = allBlocks[endIdx];

  if (!isTextBlock(startBlock) || !isTextBlock(endBlock)) {
    // For non-text blocks, just return state for now or handle specifically
    // If we select an image, maybe we should just delete the whole block
    return state;
  }

  // Calculate prefix of start block
  const prefixRuns: TextRun[] = [];
  for (const run of startBlock.children) {
    if (run.id === startPos.inlineId) {
      prefixRuns.push({ ...run, text: run.text.substring(0, startPos.offset) });
      break;
    }
    prefixRuns.push(run);
  }

  // Calculate suffix of end block
  const suffixRuns: TextRun[] = [];
  let foundEndRun = false;
  for (const run of endBlock.children) {
    if (run.id === endPos.inlineId) {
      suffixRuns.push({ ...run, text: run.text.substring(endPos.offset) });
      foundEndRun = true;
      continue;
    }
    if (foundEndRun) {
      suffixRuns.push(run);
    }
  }

  const combinedRuns = [...prefixRuns, ...suffixRuns];
  const mergedRuns: TextRun[] = [];
  for (const r of combinedRuns) {
    const last = mergedRuns[mergedRuns.length - 1];
    const canMerge =
      last &&
      r.text !== "" &&
      areMarksEqual(last.marks, r.marks) &&
      !last.revision &&
      !r.revision &&
      !last.field &&
      !r.field;
    if (canMerge) {
      mergedRuns[mergedRuns.length - 1].text += r.text;
    } else {
      mergedRuns.push({ ...r });
    }
  }

  // If both prefix and suffix are empty, ensure we have at least one empty run if it's a paragraph
  if (mergedRuns.length === 0 && startBlock.children.length > 0) {
      mergedRuns.push({ ...startBlock.children[0], text: "" });
  }

  const mergedBlock = { ...startBlock, children: mergedRuns };
  const removeIds = new Set(allBlocks.slice(startIdx + 1, endIdx + 1).map((b) => b.id));
  const startBlockId = startBlock.id;

  const nextSections = document.sections.map((section) => {
    const nextChildren = transformBlocks(section.children, (block) => {
      if (block.id === startBlockId) {
        return mergedBlock;
      }
      if (removeIds.has(block.id)) {
        return null;
      }
      return block;
    });
    return { ...section, children: nextChildren };
  });

  // Calculate new selection position (at the merge point)
  let nextInlineId = startPos.inlineId;
  let nextOffset = startPos.offset;
  let acc = 0;
  for (const run of mergedRuns) {
      if (acc + run.text.length >= startPos.offset) {
          nextInlineId = run.id;
          nextOffset = startPos.offset - acc;
          break;
      }
      acc += run.text.length;
  }
  
  const nextPosition: LogicalPosition = {
    ...startPos,
    inlineId: nextInlineId,
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

export function registerInlineHandlers() {
  registerHandler(OperationType.SET_SELECTION, handleSetSelection);
  registerHandler(OperationType.INSERT_TEXT, handleInsertText);
  registerHandler(OperationType.DELETE_TEXT, handleDeleteText);
}
