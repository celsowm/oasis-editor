import { EditorState } from "../EditorState.js";
import { transformBlocks } from "../../document/BlockVisitor.js";
import { BlockNode } from "../../document/BlockTypes.js";

export function recalculateListSequences(blocks: BlockNode[]): BlockNode[] {
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
