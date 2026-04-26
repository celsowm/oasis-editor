import { StyleRegistry, StyleEntry } from "../../engine/ir/DocumentIR.js";
import { TextBlockNode, MarkSet, TextRun, BlockNode, isTextBlock, isTableNode } from "./BlockTypes.js";

export interface ResolvedStyle {
  align?: TextBlockNode["align"];
  indentation?: number;
  marks: MarkSet;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
}

export class StyleResolver {
  private registry: StyleRegistry;

  constructor(registry: StyleRegistry) {
    this.registry = registry;
  }

  resolve(styleId: string): ResolvedStyle {
    const chain = this.registry.resolveChain(styleId);
    const result: ResolvedStyle = { marks: {} };

    // Apply from base to derived (later overrides earlier)
    for (const entry of chain.reverse()) {
      if (entry.paragraphProps) {
        this.applyParagraphProps(result, entry.paragraphProps);
      }
      if (entry.runProps) {
        this.applyRunProps(result, entry.runProps);
      }
    }

    return result;
  }

  private applyParagraphProps(result: ResolvedStyle, props: Record<string, unknown>): void {
    const align = props.align as string | undefined;
    if (align) {
      result.align = align as TextBlockNode["align"];
    }
    const indentLeft = props.indentLeft as number | undefined;
    if (indentLeft !== undefined) {
      result.indentation = indentLeft;
    }
    const spaceBefore = props.spaceBefore as number | undefined;
    if (spaceBefore !== undefined) {
      // Could store this for rendering
    }
  }

  private applyRunProps(result: ResolvedStyle, props: Record<string, unknown>): void {
    if (props.bold) result.bold = true;
    if (props.italic) result.italic = true;
    if (props.underline) result.marks.underline = true;
    if (props.strike) result.marks.strike = true;
    if (props.color) result.marks.color = props.color as string;
    if (props.fontSize) result.fontSize = props.fontSize as number;
    if (props.fontFamily) result.marks.fontFamily = props.fontFamily as string;
    if (props.vertAlign) result.marks.vertAlign = props.vertAlign as any;
    if (props.highlight) result.marks.highlight = props.highlight as string;
  }
}

export function applyStyleToBlock(block: TextBlockNode, style: ResolvedStyle): TextBlockNode {
  const next = { ...block };

  // Only apply style align/indentation if block doesn't have explicit values
  if (style.align && (next.align === undefined || next.align === "left")) {
    next.align = style.align;
  }
  if (style.indentation !== undefined && next.indentation === undefined) {
    next.indentation = style.indentation;
  }

  // Merge style marks into each run (run marks take precedence)
  next.children = block.children.map((run) => ({
    ...run,
    marks: {
      ...style.marks,
      ...run.marks,
      bold: run.marks.bold ?? style.bold,
      italic: run.marks.italic ?? style.italic,
      fontSize: run.marks.fontSize ?? style.fontSize,
    },
  }));

  return next;
}

export function applyStylesToBlocks(blocks: BlockNode[], resolver: StyleResolver): BlockNode[] {
  return blocks.map((block) => {
    if (isTextBlock(block) && block.styleId) {
      const style = resolver.resolve(block.styleId);
      return applyStyleToBlock(block, style);
    }
    if (isTableNode(block)) {
      return {
        ...block,
        rows: block.rows.map((row) => ({
          ...row,
          cells: row.cells.map((cell) => ({
            ...cell,
            children: applyStylesToBlocks(cell.children, resolver),
          })),
        })),
      };
    }
    return block;
  });
}
