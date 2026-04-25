import { EditorState } from "../EditorState.js";
import { OperationType } from "../../operations/OperationTypes.js";
import { transformBlocks } from "../../document/BlockVisitor.js";
import { isTextBlock, TextRun, BlockNode, MarkSet } from "../../document/BlockTypes.js";
import { areMarksEqual } from "../../document/MarkUtils.js";
import { registerHandler } from "../OperationHandlers.js";
import { getAllBlocksInSection } from "../../document/BlockUtils.js";

export type BooleanMarkKey = "bold" | "italic" | "underline";

function applyMarksInRange(
  state: EditorState,
  modifier: (marks: MarkSet, run: TextRun) => MarkSet,
  align?: "left" | "center" | "right" | "justify",
): EditorState {
  const { selection, document: doc, editingMode: zone } = state;
  if (!selection) return state;

  const allBlocks: BlockNode[] = [];
  for (const section of doc.sections) {
    let targetBlocks = section.children;
    if (zone === "header") targetBlocks = section.header || [];
    else if (zone === "footer") targetBlocks = section.footer || [];
    getAllBlocksInSection(targetBlocks).forEach((b) => allBlocks.push(b));
  }

  let startPos = selection.anchor;
  let endPos = selection.focus;
  let startIdx = allBlocks.findIndex((b) => b.id === startPos.blockId);
  let endIdx = allBlocks.findIndex((b) => b.id === endPos.blockId);

  if (startIdx === -1 || endIdx === -1) return state;

  let isReversed = false;
  if (startIdx > endIdx) {
    isReversed = true;
  } else if (startIdx === endIdx) {
    const block = allBlocks[startIdx];
    if (isTextBlock(block)) {
      let sAbs = 0,
        eAbs = 0,
        acc = 0;
      for (const r of block.children) {
        if (r.id === startPos.inlineId) sAbs = acc + startPos.offset;
        if (r.id === endPos.inlineId) eAbs = acc + endPos.offset;
        acc += r.text.length;
      }
      if (sAbs > eAbs) isReversed = true;
    }
  }

  if (isReversed) {
    [startPos, endPos] = [endPos, startPos];
    [startIdx, endIdx] = [endIdx, startIdx];
  }

  let nextState = state;
  for (let i = startIdx; i <= endIdx; i++) {
    const targetBlock = allBlocks[i];
    if (!isTextBlock(targetBlock)) continue;

    let startAbs = 0;
    let endAbs = Infinity;
    let acc = 0;
    for (const r of targetBlock.children) {
      if (i === startIdx && r.id === startPos.inlineId)
        startAbs = acc + startPos.offset;
      if (i === endIdx && r.id === endPos.inlineId)
        endAbs = acc + endPos.offset;
      acc += r.text.length;
    }
    if (i < endIdx) endAbs = acc;

    nextState = updateDocumentSections(nextState, targetBlock.id, (b) => {
      if (!isTextBlock(b)) return b;
      let currentAbs = 0;
      const newChildren: TextRun[] = [];
      let runIdx = 0;

      for (const run of b.children) {
        const runStart = currentAbs;
        const runEnd = currentAbs + run.text.length;
        currentAbs = runEnd;

        if (runEnd <= startAbs || runStart >= endAbs) {
          newChildren.push(run);
        } else if (runStart >= startAbs && runEnd <= endAbs) {
          newChildren.push({ ...run, marks: modifier(run.marks, run) });
        } else {
          const overlapStart = Math.max(0, startAbs - runStart);
          const overlapEnd = Math.min(run.text.length, endAbs - runStart);
          const beforeText = run.text.substring(0, overlapStart);
          const midText = run.text.substring(overlapStart, overlapEnd);
          const afterText = run.text.substring(overlapEnd);

          if (beforeText) {
            newChildren.push({
              ...run,
              id: run.id + "_fmt_b" + runIdx++,
              text: beforeText,
            });
          }
          if (midText) {
            newChildren.push({
              ...run,
              id: run.id + "_fmt_m" + runIdx++,
              text: midText,
              marks: modifier(run.marks, run),
            });
          }
          if (afterText) {
            newChildren.push({
              ...run,
              id: run.id + "_fmt_a" + runIdx++,
              text: afterText,
            });
          }
        }
      }

      const merged: TextRun[] = [];
      for (const r of newChildren) {
        if (
          merged.length > 0 &&
          r.text !== "" &&
          areMarksEqual(merged[merged.length - 1].marks, r.marks)
        ) {
          merged[merged.length - 1].text += r.text;
        } else if (r.text !== "") {
          merged.push({ ...r });
        }
      }
      if (merged.length === 0 && newChildren.length > 0)
        merged.push(newChildren[0]);
      return { ...b, children: merged, align: align || b.align };
    });
  }
  return nextState;
}

function updateDocumentSections(
  state: EditorState,
  blockId: string,
  updater: (block: BlockNode) => BlockNode | BlockNode[] | null,
): EditorState {
  const zone = state.editingMode;
  const nextSections = state.document.sections.map((section) => {
    let childrenToTransform: BlockNode[] = section.children;
    if (zone === "header") childrenToTransform = section.header || [];
    else if (zone === "footer") childrenToTransform = section.footer || [];

    const transformed = transformBlocks(childrenToTransform, (block) => {
      if (block.id === blockId) {
        return updater(block);
      }
      return block;
    });

    const updatedChildren = recalculateListSequences(transformed);

    if (zone === "header") return { ...section, header: updatedChildren };
    if (zone === "footer") return { ...section, footer: updatedChildren };
    return { ...section, children: updatedChildren };
  });

  return {
    ...state,
    document: {
      ...state.document,
      revision: state.document.revision + 1,
      sections: nextSections,
    },
  };
}

function recalculateListSequences(blocks: BlockNode[]): BlockNode[] {
  let currentSequenceIndex = 1;
  let inSequence = false;

  return blocks.map((block) => {
    if (block.kind === "ordered-list-item") {
      const updated = { ...block, index: currentSequenceIndex++ };
      inSequence = true;
      return updated;
    } else {
      currentSequenceIndex = 1;
      inSequence = false;
      if (block.kind === "table") {
        const nextRows = block.rows.map((row) => ({
          ...row,
          cells: row.cells.map((cell) => ({
            ...cell,
            children: recalculateListSequences(cell.children),
          })),
        }));
        return { ...block, rows: nextRows };
      }
      return block;
    }
  });
}

function isCollapsedAtPoint(selection: NonNullable<EditorState["selection"]>): boolean {
  return (
    selection.anchor.blockId === selection.focus.blockId &&
    selection.anchor.inlineId === selection.focus.inlineId &&
    selection.anchor.offset === selection.focus.offset
  );
}

function registerMarkHandlers(): void {
  registerHandler(OperationType.TOGGLE_MARK, (state, op) => {
    const { selection, pendingMarks } = state;
    if (!selection) return state;
    const { mark } = op.payload as { mark: BooleanMarkKey };

    if (isCollapsedAtPoint(selection)) {
      const nextMarks: MarkSet = { ...(pendingMarks || {}) };
      if (nextMarks[mark]) delete nextMarks[mark];
      else nextMarks[mark] = true;
      return { ...state, pendingMarks: nextMarks };
    }

    let shouldAdd = false;
    applyMarksInRange(state, (m) => {
      if (!m[mark]) shouldAdd = true;
      return m;
    });

    return applyMarksInRange(state, (m) => {
      const next: MarkSet = { ...m };
      if (shouldAdd) next[mark] = true;
      else delete next[mark];
      return next;
    });
  });

  registerHandler(OperationType.SET_MARK, (state, op) => {
    const { selection, pendingMarks } = state;
    if (!selection) return state;
    const { mark, value } = op.payload as { mark: keyof MarkSet, value: any };

    if (isCollapsedAtPoint(selection)) {
      const nextMarks = { ...(pendingMarks || {}), [mark]: value } as MarkSet;
      if (value === undefined || value === null) delete nextMarks[mark];
      return { ...state, pendingMarks: nextMarks };
    }

    return applyMarksInRange(state, (m) => {
      const next: MarkSet = { ...m };
      if (value === undefined || value === null) delete next[mark];
      else next[mark] = value;
      return next;
    });
  });

  registerHandler(OperationType.APPLY_FORMAT, (state, op) => {
    const { selection, pendingMarks } = state;
    if (!selection) return state;

    const { marks, align } = op.payload;

    if (isCollapsedAtPoint(selection)) {
      let nextState: EditorState = {
        ...state,
        pendingMarks: { ...(pendingMarks || {}), ...marks },
      };

      if (align) {
        nextState = updateDocumentSections(
          nextState,
          selection.anchor.blockId,
          (block) => {
            if (isTextBlock(block)) {
              return { ...block, align };
            }
            return block;
          },
        );
      }

      return nextState;
    }

    return applyMarksInRange(state, (m) => ({ ...m, ...marks }), align);
  });
}

export { registerMarkHandlers };
