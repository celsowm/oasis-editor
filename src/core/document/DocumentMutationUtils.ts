import { EditorState } from "../runtime/EditorState.js";
import { BlockNode, isTextBlock, TextRun, TextBlockNode } from "./BlockTypes.js";
import { transformBlocks } from "./BlockVisitor.js";
import { areMarksEqual } from "./MarkUtils.js";
import { LogicalPosition } from "../selection/SelectionTypes.js";

export function recalculateListSequences(blocks: BlockNode[]): BlockNode[] {
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

export function updateDocumentSections(
  state: EditorState,
  blockId: string,
  updater: (block: BlockNode) => BlockNode | BlockNode[] | null,
): EditorState {
  const zone = state.editingMode;

  if (zone === "footnote" && state.editingFootnoteId) {
    const footnote = state.document.footnotes?.find((f) => f.id === state.editingFootnoteId);
    if (footnote) {
      const transformed = transformBlocks(footnote.blocks, (block) => {
        if (block.id === blockId) {
          return updater(block);
        }
        return block;
      });
      const nextFootnotes = (state.document.footnotes || []).map((f) =>
        f.id === state.editingFootnoteId ? { ...f, blocks: transformed } : f,
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

export function tryMergeSiblings(
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

export function transformContainerDeepForMerge(
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
