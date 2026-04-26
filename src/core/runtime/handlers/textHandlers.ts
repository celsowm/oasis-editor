import { EditorState } from "../EditorState.js";
import { OperationType } from "../../operations/OperationTypes.js";
import { transformBlocks } from "../../document/BlockVisitor.js";
import { findBlockById } from "../../document/BlockUtils.js";
import { isTextBlock, TextRun, BlockNode, TextBlockNode, withBlockKind, withIndentation, getBlockIndentation } from "../../document/BlockTypes.js";
import { areMarksEqual } from "../../document/MarkUtils.js";
import { LogicalPosition } from "../../selection/SelectionTypes.js";
import { createParagraph, createPageBreak, createTextRun, createEquation } from "../../document/DocumentFactory.js";
import { registerHandler } from "../OperationHandlers.js";
import { genId } from "../../utils/IdGenerator.js";
import {
  DEFAULT_LIST_INDENTATION,
  DEFAULT_ORDERED_LIST_INDENTATION,
} from "../../composition/ParagraphComposer.js";

// --- Internal Helpers (not exported) ---

function updateDocumentSections(
  state: EditorState,
  blockId: string,
  updater: (block: BlockNode) => BlockNode | BlockNode[] | null,
): EditorState {
  const zone = state.editingMode;

  if (zone === "footnote" && state.editingFootnoteId) {
    const footnote = state.document.footnotes?.find(f => f.id === state.editingFootnoteId);
    if (footnote) {
      const transformed = transformBlocks(footnote.blocks, (block) => {
        if (block.id === blockId) {
          return updater(block);
        }
        return block;
      });
      const nextFootnotes = (state.document.footnotes || []).map(f =>
        f.id === state.editingFootnoteId ? { ...f, blocks: transformed } : f
      );
      return {
        ...state,
        document: {
          ...state.document,
          revision: state.document.revision + 1,
          footnotes: nextFootnotes,
        },
      };
    }
  }

  if (zone === "header" || zone === "footer") {
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

  const nextSections = state.document.sections.map((section) => {
    const transformed = transformBlocks(section.children, (block) => {
      if (block.id === blockId) {
        return updater(block);
      }
      return block;
    });

    const updatedChildren = recalculateListSequences(transformed);

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
  // Stack of counters per list level
  const counters: number[] = [];
  let lastLevel = -1;
  let lastListKind: "list-item" | "ordered-list-item" | null = null;

  return blocks.map((block) => {
    if (block.kind === "ordered-list-item" || block.kind === "list-item") {
      const level = block.level ?? 0;

      // Reset counters when list type changes or we leave a list context
      if (lastListKind !== block.kind) {
        counters.length = 0;
        lastListKind = block.kind;
      }

      if (level > lastLevel) {
        // Going deeper: add new counter levels
        while (counters.length <= level) {
          counters.push(0);
        }
      } else if (level < lastLevel) {
        // Going shallower: reset deeper counters
        for (let i = level + 1; i < counters.length; i++) {
          counters[i] = 0;
        }
      }

      counters[level]++;
      lastLevel = level;

      const updated =
        block.kind === "ordered-list-item"
          ? { ...block, index: counters[level] }
          : block;
      return updated;
    } else {
      // Non-list block: reset everything
      counters.length = 0;
      lastLevel = -1;
      lastListKind = null;
      // Recursively handle nested blocks in tables if needed
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

function tryMergeSiblings(
  blocks: BlockNode[],
  targetId: string,
): { nextBlocks: BlockNode[]; mergedPos: LogicalPosition | null } {
  const idx = blocks.findIndex((b) => b.id === targetId);
  if (idx === -1) {
    let mergedPos: LogicalPosition | null = null;
    const nextBlocksDeep = blocks.map((block) => {
      const result = transformContainerDeepForMerge(block, targetId);
      if (result.mergedPos) mergedPos = result.mergedPos;
      return result.block;
    });
    return { nextBlocks: nextBlocksDeep, mergedPos };
  }

  if (idx === 0) return { nextBlocks: blocks, mergedPos: null };

  const prev = blocks[idx - 1];
  const curr = blocks[idx];

  if (isTextBlock(prev) && isTextBlock(curr)) {
    const lastRun = prev.children[prev.children.length - 1];
    const mergePos: LogicalPosition = {
      sectionId: "",
      blockId: prev.id,
      inlineId: lastRun.id,
      offset: lastRun.text.length,
    };

    const mergedBlock: BlockNode = {
      ...prev,
      children: [...prev.children, ...curr.children],
    };

    const mergedRuns: TextRun[] = [];
    for (const r of mergedBlock.children) {
      if (
        mergedRuns.length > 0 &&
        r.text !== "" &&
        areMarksEqual(mergedRuns[mergedRuns.length - 1].marks, r.marks)
      ) {
        mergedRuns[mergedRuns.length - 1].text += r.text;
      } else {
        mergedRuns.push({ ...r });
      }
    }
    const finalBlock: TextBlockNode = {
      ...mergedBlock,
      children: mergedRuns.length > 0 ? mergedRuns : [curr.children[0]],
    };

    const nextBlocks = [...blocks];
    nextBlocks.splice(idx - 1, 2, finalBlock);
    return { nextBlocks, mergedPos: mergePos };
  }

  return { nextBlocks: blocks, mergedPos: null };
}

function transformContainerDeepForMerge(
  container: any,
  targetId: string,
): { block: any; mergedPos: LogicalPosition | null } {
  if (!container || typeof container !== "object")
    return { block: container, mergedPos: null };

  let mergedPos: LogicalPosition | null = null;
  const result = { ...container };
  let hasChanges = false;

  for (const key in result) {
    const value = result[key];
    if (Array.isArray(value)) {
      if (value.length > 0 && "kind" in value[0] && "id" in value[0]) {
        const res = tryMergeSiblings(value, targetId);
        if (res.mergedPos) mergedPos = res.mergedPos;
        result[key] = res.nextBlocks;
        hasChanges = true;
      } else {
        result[key] = value.map((item) => {
          const res = transformContainerDeepForMerge(item, targetId);
          if (res.mergedPos) mergedPos = res.mergedPos;
          return res.block;
        });
        hasChanges = true;
      }
    }
  }
  return { block: hasChanges ? result : container, mergedPos };
}

// --- Handler Implementations ---

function handleSetSelection(state: EditorState, op: any): EditorState {
  return {
    ...state,
    selection: op.payload.selection,
    selectedImageId: null,
    pendingMarks: undefined,
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
      absoluteOffset += run.text.length;
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
        nextChildren.push({
          id: newRunIds?.[runIdx++] || run.id + "_t",
          text,
          marks: { ...run.marks, ...pendingMarks },
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
    pendingMarks: undefined,
  };
}

function handleInsertParagraph(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { newBlockId, newRunId } = op.payload;

  let targetInlineId = "";
  let shouldEndList = false;

  // Check if we are on an empty list item to end the list
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
    const currentBlock = findBlockById(document, blockId);
    if (currentBlock && isTextBlock(currentBlock)) {
      // Case 1: list-item or ordered-list-item -> paragraph (keep indentation)
      if (
        currentBlock.kind === "list-item" ||
        currentBlock.kind === "ordered-list-item"
      ) {
        return updateDocumentSections(state, blockId, (block) => {
          if (!isTextBlock(block)) return block;
          const indent =
            getBlockIndentation(block) ??
            (block.kind === "list-item"
              ? DEFAULT_LIST_INDENTATION
              : DEFAULT_ORDERED_LIST_INDENTATION);
          return { ...withBlockKind(block, "paragraph"), indentation: indent };
        });
      }
      // Case 2: indented paragraph -> normal paragraph
      if (
        currentBlock.kind === "paragraph" &&
        (currentBlock.indentation ?? 0) > 0
      ) {
        return updateDocumentSections(state, blockId, (block) => {
          if (!isTextBlock(block)) return block;
          return withIndentation(block, 0);
        });
      }
    }

    let mergedSelection: LogicalPosition | null = null;
    const nextSections = document.sections.map((section) => {
      const res = tryMergeSiblings(section.children, blockId);
      if (res.mergedPos)
        mergedSelection = { ...res.mergedPos, sectionId: section.id };
      return { ...section, children: res.nextBlocks };
    });

    if (mergedSelection) {
      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          sections: nextSections,
        },
        selection: { anchor: mergedSelection, focus: mergedSelection },
      };
    }
    return state;
  }

  const targetAbsoluteOffset = absoluteOffset - 1;
  let removedFootnoteId: string | null = null;

  const afterDeleteState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    let currentAbs = 0;
    const nextChildren: TextRun[] = [];

    for (const run of block.children) {
      const runStart = currentAbs;
      const runEnd = currentAbs + run.text.length;
      currentAbs = runEnd;
      if (targetAbsoluteOffset >= runStart && targetAbsoluteOffset < runEnd) {
        // If the character before this delete point is a footnote marker run,
        // remove the entire footnote marker run
        if (run.footnoteId && run.text.length === 0) {
          removedFootnoteId = run.footnoteId;
          continue;
        }
        nextChildren.push({
          ...run,
          text:
            run.text.substring(0, targetAbsoluteOffset - runStart) +
            run.text.substring(targetAbsoluteOffset - runStart + 1),
        });
      } else {
        nextChildren.push(run);
      }
    }

    return { ...block, children: nextChildren };
  });

  // If we removed a footnote marker, also remove its footnote entry and renumber
  if (removedFootnoteId && afterDeleteState.document.footnotes) {
    const remainingFootnotes = afterDeleteState.document.footnotes
      .filter((fn) => fn.id !== removedFootnoteId)
      .map((fn, i) => ({ ...fn, id: String(i + 1) }));

    // Renumber footnoteId references in all sections
    const nextSections = afterDeleteState.document.sections.map((section) => {
      const renumberBlocks = (blocks: BlockNode[]): BlockNode[] =>
        blocks.map((block) => {
          if (isTextBlock(block)) {
            const newRuns = block.children.map((run) => {
              if (!run.footnoteId) return run;
              const oldIdx = state.document.footnotes!.findIndex((f) => f.id === run.footnoteId);
              const removedIdx = state.document.footnotes!.findIndex((f) => f.id === removedFootnoteId);
              if (oldIdx === -1 || oldIdx === removedIdx) return { ...run, footnoteId: undefined } as any;
              return { ...run, footnoteId: oldIdx > removedIdx ? String(oldIdx) : run.footnoteId };
            });
            return { ...block, children: newRuns };
          }
          return block;
        });
      return {
        ...section,
        children: renumberBlocks(section.children),
        header: section.header ? renumberBlocks(section.header) : undefined,
        footer: section.footer ? renumberBlocks(section.footer) : undefined,
      };
    });

    return {
      ...afterDeleteState,
      document: {
        ...afterDeleteState.document,
        footnotes: remainingFootnotes,
        sections: nextSections,
      },
    };
  }

  let nextPosition = { ...selection.anchor };
  const block = findBlockById(afterDeleteState.document, blockId);
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
    ...afterDeleteState,
    selection: { anchor: nextPosition, focus: nextPosition },
  };
}

function handleAppendParagraph(state: EditorState, op: any): EditorState {
  const { text, newBlockId, newRunId } = op.payload;
  const p = createParagraph(text);
  if (newBlockId) p.id = newBlockId;
  if (newRunId && p.children[0]) p.children[0].id = newRunId;

  const nextSections = [...state.document.sections];
  const last = nextSections.length - 1;
  nextSections[last] = {
    ...nextSections[last],
    children: [...nextSections[last].children, p],
  };

  return {
    ...state,
    document: {
      ...state.document,
      revision: state.document.revision + 1,
      sections: nextSections,
    },
  };
}

function handleInsertPageBreak(state: EditorState, op: any): EditorState {
  const { selection, document } = state;
  const { newBlockId } = op.payload;
  const pageBreak = createPageBreak();
  if (newBlockId) pageBreak.id = newBlockId;

  let insertSectionIdx = 0;
  let insertBlockIdx = -1;
  if (selection) {
    for (let sIdx = 0; sIdx < document.sections.length; sIdx++) {
      const idx = document.sections[sIdx].children.findIndex(
        (b) => b.id === selection.anchor.blockId,
      );
      if (idx !== -1) {
        insertSectionIdx = sIdx;
        insertBlockIdx = idx;
        break;
      }
    }
  }

  const nextSections = document.sections.map((section, sIdx) => {
    if (sIdx !== insertSectionIdx) return section;
    const children = [...section.children];
    children.splice(insertBlockIdx + 1, 0, pageBreak);
    return { ...section, children };
  });

  return {
    ...state,
    document: {
      ...document,
      revision: document.revision + 1,
      sections: nextSections,
    },
    selection: null,
    selectedImageId: null,
  };
}

function handleInsertField(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { field, newRunId } = op.payload;

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

      if (beforeText) {
        nextChildren.push({ ...run, text: beforeText });
      }
      nextChildren.push(createTextRun(field.type === "page" ? "1" : field.type, { ...run.marks }, undefined, field));
      if (afterText) {
        nextChildren.push({ ...run, text: afterText });
      }
    }
    return { ...block, children: nextChildren };
  });

  return {
    ...nextState,
    selection: {
      anchor: { ...selection.anchor, offset: offset + 1 },
      focus: { ...selection.focus, offset: offset + 1 },
    },
    pendingMarks: undefined,
  };
}

function handleInsertEquation(state: EditorState, op: any): EditorState {
  const { selection, document } = state;
  const { latex, display, newBlockId } = op.payload;
  const equation = createEquation(latex, display);
  if (newBlockId) equation.id = newBlockId;

  let insertSectionIdx = 0;
  let insertBlockIdx = -1;
  if (selection) {
    for (let sIdx = 0; sIdx < document.sections.length; sIdx++) {
      const idx = document.sections[sIdx].children.findIndex(
        (b) => b.id === selection.anchor.blockId,
      );
      if (idx !== -1) {
        insertSectionIdx = sIdx;
        insertBlockIdx = idx;
        break;
      }
    }
  }

  const nextSections = document.sections.map((section, sIdx) => {
    if (sIdx !== insertSectionIdx) return section;
    const children = [...section.children];
    children.splice(insertBlockIdx + 1, 0, equation);
    return { ...section, children };
  });

  return {
    ...state,
    document: {
      ...document,
      revision: document.revision + 1,
      sections: nextSections,
    },
    selection: null,
    selectedImageId: null,
  };
}

function handleInsertBookmark(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { name, newRunId } = op.payload;

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
    let inserted = false;

    for (const run of block.children) {
      if (run.id === inlineId) {
        const before = run.text.slice(0, offset);
        const after = run.text.slice(offset);
        if (before) {
          nextChildren.push({ ...run, text: before });
        }
        const bookmarkRun = createTextRun("", {}, undefined, undefined, name, name);
        if (newRunId) bookmarkRun.id = newRunId;
        nextChildren.push(bookmarkRun);
        inserted = true;
        if (after) {
          nextChildren.push({ ...run, text: after });
        }
      } else {
        nextChildren.push(run);
      }
    }

    if (!inserted) {
      const bookmarkRun = createTextRun("", {}, undefined, undefined, name, name);
      if (newRunId) bookmarkRun.id = newRunId;
      nextChildren.push(bookmarkRun);
    }

    return { ...block, children: nextChildren };
  });

  return {
    ...nextState,
    selection: {
      anchor: { ...selection.anchor, offset: 0 },
      focus: { ...selection.focus, offset: 0 },
    },
  };
}

function handleInsertFootnote(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { text, newRunId, newBlockId } = op.payload;

  const nextFootnoteId = String((state.document.footnotes?.length || 0) + 1);

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
    let inserted = false;

    for (const run of block.children) {
      if (run.id === inlineId) {
        const before = run.text.slice(0, offset);
        const after = run.text.slice(offset);
        if (before) {
          nextChildren.push({ ...run, text: before, id: genId("run") });
        }
        const fnRun: TextRun = {
          id: newRunId || genId("run"),
          text: "",
          marks: { ...run.marks },
          footnoteId: nextFootnoteId,
        };
        nextChildren.push(fnRun);
        inserted = true;
        if (after) {
          nextChildren.push({ ...run, text: after, id: genId("run") });
        }
      } else {
        nextChildren.push(run);
      }
    }

    if (!inserted) {
      const fnRun: TextRun = {
        id: newRunId || genId("run"),
        text: "",
        marks: {},
        footnoteId: nextFootnoteId,
      };
      nextChildren.push(fnRun);
    }

    return { ...block, children: nextChildren };
  });

  const footnoteBlock = createParagraph(text);
  if (newBlockId) footnoteBlock.id = newBlockId;
  const footnotes = [...(nextState.document.footnotes || [])];
  footnotes.push({ id: nextFootnoteId, blocks: [footnoteBlock] });

  // Place cursor at the start of the new footnote block (Word/Docs behavior)
  const fnPos: LogicalPosition = {
    sectionId: "footnote",
    blockId: footnoteBlock.id,
    inlineId: footnoteBlock.children[0]?.id || "",
    offset: 0,
  };

  return {
    ...nextState,
    document: {
      ...nextState.document,
      footnotes,
    },
    editingMode: "footnote" as const,
    editingFootnoteId: nextFootnoteId,
    selection: { anchor: fnPos, focus: fnPos },
  };
}

function handleInsertEndnote(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { text, newRunId, newBlockId } = op.payload;

  const nextEndnoteId = String((state.document.endnotes?.length || 0) + 1);

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
    let inserted = false;

    for (const run of block.children) {
      if (run.id === inlineId) {
        const before = run.text.slice(0, offset);
        const after = run.text.slice(offset);
        if (before) {
          nextChildren.push({ ...run, text: before, id: genId("run") });
        }
        const enRun: TextRun = {
          id: newRunId || genId("run"),
          text: "",
          marks: { ...run.marks },
          endnoteId: nextEndnoteId,
        };
        nextChildren.push(enRun);
        inserted = true;
        if (after) {
          nextChildren.push({ ...run, text: after, id: genId("run") });
        }
      } else {
        nextChildren.push(run);
      }
    }

    if (!inserted) {
      const enRun: TextRun = {
        id: newRunId || genId("run"),
        text: "",
        marks: {},
        endnoteId: nextEndnoteId,
      };
      nextChildren.push(enRun);
    }

    return { ...block, children: nextChildren };
  });

  const endnoteBlock = createParagraph(text);
  if (newBlockId) endnoteBlock.id = newBlockId;
  const endnotes = [...(nextState.document.endnotes || [])];
  endnotes.push({ id: nextEndnoteId, blocks: [endnoteBlock] });

  // Place cursor after the endnote reference: prefer the next run, else stay in endnote run
  let nextPosition = { ...selection.anchor, offset: 0 };
  const block = findBlockById(nextState.document, blockId);
  if (block && isTextBlock(block)) {
    let foundEn = false;
    for (const run of block.children) {
      if (run.endnoteId === nextEndnoteId) {
        foundEn = true;
        continue;
      }
      if (foundEn) {
        nextPosition = {
          ...selection.anchor,
          inlineId: run.id,
          offset: 0,
        };
        break;
      }
    }
  }

  return {
    ...nextState,
    document: {
      ...nextState.document,
      endnotes,
    },
    selection: { anchor: nextPosition, focus: nextPosition },
  };
}

function handleInsertComment(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { text, newRunId, newBlockId } = op.payload;

  const nextCommentId = String((state.document.comments?.length || 0) + 1);

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
    let inserted = false;

    for (const run of block.children) {
      if (run.id === inlineId) {
        const before = run.text.slice(0, offset);
        const after = run.text.slice(offset);
        if (before) {
          nextChildren.push({ ...run, text: before, id: genId("run") });
        }
        const commentRun: TextRun = {
          id: newRunId || genId("run"),
          text: "",
          marks: { ...run.marks },
          commentId: nextCommentId,
        };
        nextChildren.push(commentRun);
        inserted = true;
        if (after) {
          nextChildren.push({ ...run, text: after, id: genId("run") });
        }
      } else {
        nextChildren.push(run);
      }
    }

    if (!inserted) {
      const commentRun: TextRun = {
        id: newRunId || genId("run"),
        text: "",
        marks: {},
        commentId: nextCommentId,
      };
      nextChildren.push(commentRun);
    }

    return { ...block, children: nextChildren };
  });

  const commentBlock = createParagraph(text);
  if (newBlockId) commentBlock.id = newBlockId;
  const comments = [...(nextState.document.comments || [])];
  comments.push({ id: nextCommentId, author: "Author", date: Date.now(), blocks: [commentBlock] });

  // Place cursor after the comment reference: prefer the next run, else stay in comment run
  let nextPosition = { ...selection.anchor, offset: 0 };
  const block = findBlockById(nextState.document, blockId);
  if (block && isTextBlock(block)) {
    let foundComment = false;
    for (const run of block.children) {
      if (run.commentId === nextCommentId) {
        foundComment = true;
        continue;
      }
      if (foundComment) {
        nextPosition = {
          ...selection.anchor,
          inlineId: run.id,
          offset: 0,
        };
        break;
      }
    }
  }

  return {
    ...nextState,
    document: {
      ...nextState.document,
      comments,
    },
    selection: { anchor: nextPosition, focus: nextPosition },
  };
}

// --- Registration ---

export function registerTextHandlers(): void {
  registerHandler(OperationType.SET_SELECTION, handleSetSelection);
  registerHandler(OperationType.INSERT_TEXT, handleInsertText);
  registerHandler(OperationType.INSERT_PARAGRAPH, handleInsertParagraph);
  registerHandler(OperationType.DELETE_TEXT, handleDeleteText);
  registerHandler(OperationType.APPEND_PARAGRAPH, handleAppendParagraph);
  registerHandler(OperationType.INSERT_PAGE_BREAK, handleInsertPageBreak);
  registerHandler(OperationType.INSERT_FIELD, handleInsertField);
  registerHandler(OperationType.INSERT_EQUATION, handleInsertEquation);
  registerHandler(OperationType.INSERT_BOOKMARK, handleInsertBookmark);
  registerHandler(OperationType.INSERT_FOOTNOTE, handleInsertFootnote);
  registerHandler(OperationType.INSERT_ENDNOTE, handleInsertEndnote);
  registerHandler(OperationType.INSERT_COMMENT, handleInsertComment);
}
