import { EditorState } from "../EditorState.js";
import { transformBlocks } from "../../document/BlockVisitor.js";
import { BlockNode, isListItemBlock } from "../../document/BlockTypes.js";

export function recalculateListSequences(blocks: BlockNode[]): BlockNode[] {
  const counters: number[] = [];
  let lastLevel = -1;
  let lastListKind: "list-item" | "ordered-list-item" | null = null;

  return blocks.map((block) => {
    if (block.kind === "ordered-list-item" || block.kind === "list-item") {
      const level = isListItemBlock(block) ? (block.level ?? 0) : 0;

      if (lastListKind !== block.kind) {
        counters.length = 0;
        lastListKind = block.kind;
      }

      if (level > lastLevel) {
        while (counters.length <= level) {
          counters.push(0);
        }
      } else if (level < lastLevel) {
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

  // Handle footnote editing mode
  if (zone === "footnote" && state.editingFootnoteId) {
    const footnotes = state.document.footnotes;
    if (!footnotes) return state;

    const nextFootnotes = footnotes.map((fn) => {
      if (fn.id !== state.editingFootnoteId) return fn;
      const transformed = transformBlocks(fn.blocks, (block) => {
        if (block.id === blockId) return updater(block);
        return block;
      });
      return { ...fn, blocks: recalculateListSequences(transformed) };
    });

    return {
      ...state,
      document: {
        ...state.document,
        revision: state.document.revision + 1,
        footnotes: nextFootnotes,
      },
    };
  }

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
