import { registerHandler } from "../OperationHandlers.js";
import { OperationType, SetAlignmentOp, SetStyleOp } from "../../operations/OperationTypes.js";
import { isTextBlock, TextRun, MarkSet } from "../../document/BlockTypes.js";
import { updateDocumentSections } from "./sharedHelpers.js";
import { StyleResolver, ResolvedStyle } from "../../document/StyleResolver.js";
import { StyleRegistry, StyleEntry } from "../../../engine/ir/DocumentIR.js";

function applyResolvedStyleToBlock(block: import("../../document/BlockTypes.js").BlockNode, styleId: string, styles: import("../../document/DocumentTypes.js").DocumentModel["styles"]): import("../../document/BlockTypes.js").BlockNode {
  if (!styles || styles.length === 0) return block;
  if (!isTextBlock(block)) return block;

  // Build a proper StyleRegistry from the document styles
  const registry = new StyleRegistry();
  for (const style of styles) {
    registry.add(style as StyleEntry);
  }

  const resolver = new StyleResolver(registry);
  const resolved = resolver.resolve(styleId);
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
      const nextMarksRecord = nextMarks as Record<keyof MarkSet, unknown>;
      for (const key of Object.keys(run.marks) as Array<keyof MarkSet>) {
        const value = run.marks[key];
        if (value !== undefined) {
          nextMarksRecord[key] = value;
        }
      }
      return { ...run, marks: nextMarksRecord as MarkSet };
    });
  }

  return nextBlock;
}

export function registerFormatHandlers(): void {
  registerHandler(OperationType.SET_ALIGNMENT, (state, op: SetAlignmentOp) => {
    const { selection, selectedImageId } = state;
    const { align } = op.payload;

    if (selectedImageId) {
      return updateDocumentSections(state, selectedImageId, (block) => {
        if (block.kind === "image") {
          const safeAlign = align === "justify" ? "left" : align;
          return { ...block, align: safeAlign as any };
        }
        return block;
      });
    }

    if (!selection) return state;

    const { blockId } = selection.anchor;
    return updateDocumentSections(state, blockId, (block) => {
      if (!isTextBlock(block)) return block;
      if (block.kind === "heading" && align === "justify")
        return { ...block, align: "left" };
      return { ...block, align };
    });
  });

  registerHandler(OperationType.SET_STYLE, (state, op: SetStyleOp) => {
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
