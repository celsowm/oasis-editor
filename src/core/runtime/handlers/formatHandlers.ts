import { registerHandler } from "../OperationHandlers.js";
import { OperationType } from "../../operations/OperationTypes.js";
import { isTextBlock, TextRun, MarkSet } from "../../document/BlockTypes.js";
import { updateDocumentSections } from "./sharedHelpers.js";
import { StyleResolver } from "../../document/StyleResolver.js";

function applyResolvedStyleToBlock(block: import("../../document/BlockTypes.js").BlockNode, styleId: string, styles: import("../../document/DocumentTypes.js").DocumentModel["styles"]): import("../../document/BlockTypes.js").BlockNode {
  if (!styles || styles.length === 0) return block;
  if (!isTextBlock(block)) return block;

  const registry = new StyleResolver({
    get: (id: string) => styles.find((s) => s.styleId === id),
    values: () => styles.values(),
    getDefault: (type: string) => styles.find((s) => s.type === type && s.isDefault),
    resolveChain: (id: string) => {
      const chain: any[] = [];
      const visited = new Set<string>();
      let current = styles.find((s) => s.styleId === id);
      while (current && !visited.has(current.styleId)) {
        visited.add(current.styleId);
        chain.push(current);
        current = current.basedOn ? styles.find((s) => s.styleId === current!.basedOn) : undefined;
      }
      return chain;
    },
  } as any);

  const resolved = registry.resolve(styleId);
  if (!resolved) return block;

  const nextBlock = { ...block };

  // Apply paragraph props
  if (resolved.align && nextBlock.align === "left") {
    nextBlock.align = resolved.align;
  }
  if (resolved.indentation !== undefined && !nextBlock.indentation) {
    nextBlock.indentation = resolved.indentation;
  }

  // Apply run props to children
  if (resolved.marks && Object.keys(resolved.marks).length > 0) {
    nextBlock.children = nextBlock.children.map((run: TextRun) => {
      const nextMarks: MarkSet = { ...resolved.marks, ...run.marks };
      // Explicit run marks take precedence over style defaults
      for (const key of Object.keys(run.marks)) {
        const markKey = key as keyof MarkSet;
        const value = run.marks[markKey];
        if (value !== undefined) {
          (nextMarks as any)[markKey] = value;
        }
      }
      return { ...run, marks: nextMarks };
    });
  }

  return nextBlock;
}

export function registerFormatHandlers(): void {
  registerHandler(OperationType.SET_ALIGNMENT, (state, op) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId } = selection.anchor;
    const { align } = op.payload;
    return updateDocumentSections(state, blockId, (block) => {
      if (!isTextBlock(block)) return block;
      if (block.kind === "heading" && align === "justify")
        return { ...block, align: "left" };
      return { ...block, align };
    });
  });

  registerHandler(OperationType.SET_STYLE, (state, op) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId } = selection.anchor;
    const { styleId } = op.payload;
    return updateDocumentSections(state, blockId, (block) => {
      if (!isTextBlock(block)) return block;
      const withStyleId = { ...block, styleId };
      return applyResolvedStyleToBlock(withStyleId, styleId, state.document.styles);
    });
  });
}
