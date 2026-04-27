import { EditorState } from "../EditorState.js";
import { findBlockById } from "../../document/BlockUtils.js";
import { isTextBlock, withBlockKind, TextRun, BlockNode } from "../../document/BlockTypes.js";
import { LogicalPosition } from "../../selection/SelectionTypes.js";
import { updateDocumentSections } from "../../document/DocumentMutationUtils.js";
import { registerHandler } from "../OperationHandlers.js";
import { OperationType, InsertPageBreakOp } from "../../operations/OperationTypes.js";
import { createPageBreak } from "../../document/DocumentFactory.js";

function handleInsertParagraph(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { newBlockId, newRunId } = op.payload;

  let targetInlineId = "";
  let shouldEndList = false;

  const currentBlock = findBlockById(state.document, blockId);
  if (
    currentBlock &&
    (currentBlock.kind === "list-item" ||
      currentBlock.kind === "ordered-list-item")
  ) {
    const plainText = isTextBlock(currentBlock)
      ? currentBlock.children.map((r) => r.text).join("")
      : "";
    if (plainText.length === 0) {
      shouldEndList = true;
    }
  }

  if (shouldEndList) {
    return updateDocumentSections(state, blockId, (block) => {
      if (!isTextBlock(block)) return block;
      return withBlockKind(block, "paragraph");
    });
  }

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;

    const beforeChildren: TextRun[] = [];
    const afterChildren: TextRun[] = [];
    let found = false;

    for (const run of block.children) {
      if (run.id === inlineId) {
        const beforeText = run.text.substring(0, offset);
        const afterText = run.text.substring(offset);
        if (beforeText || !found)
          beforeChildren.push({ ...run, text: beforeText });

        const newRun = {
          ...run,
          id: newRunId || run.id + "_n",
          text: afterText,
        };
        afterChildren.push(newRun);
        targetInlineId = newRun.id;
        found = true;
      } else if (!found) {
        beforeChildren.push(run);
      } else {
        afterChildren.push(run);
      }
    }

    const p1 = { ...block, children: beforeChildren };
    const p2 = {
      ...block,
      id: newBlockId || block.id + "_n",
      children: afterChildren,
    };
    return [p1, p2];
  });

  const newPos: LogicalPosition = {
    ...selection.anchor,
    blockId: newBlockId || blockId,
    inlineId: targetInlineId,
    offset: 0,
  };

  return {
    ...nextState,
    selection: { anchor: newPos, focus: newPos },
  };
}

function handleAppendParagraph(state: EditorState, op: any): EditorState {
  const { text, newBlockId, newRunId } = op.payload;
  const sections = state.document.sections;
  if (sections.length === 0) return state;
  const newPara: BlockNode = {
    id: newBlockId,
    kind: "paragraph",
    children: [{ id: newRunId, text: text ?? "", marks: {} }],
  } as BlockNode;
  const nextSections = sections.map((s, i) =>
    i === sections.length - 1
      ? { ...s, children: [...s.children, newPara] }
      : s,
  );
  return {
    ...state,
    document: { ...state.document, sections: nextSections, revision: state.document.revision + 1 },
  };
}

function handleInsertPageBreak(state: EditorState, op: InsertPageBreakOp): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId } = selection.anchor;
  const { pageBreakId } = op.payload;

  return updateDocumentSections(state, blockId, (block) => {
    const pb = createPageBreak(pageBreakId);
    return [block, pb];
  });
}

export function registerStructureHandlers() {
  registerHandler(OperationType.INSERT_PARAGRAPH, handleInsertParagraph);
  registerHandler(OperationType.APPEND_PARAGRAPH, handleAppendParagraph);
  registerHandler(OperationType.INSERT_PAGE_BREAK, handleInsertPageBreak);
}
