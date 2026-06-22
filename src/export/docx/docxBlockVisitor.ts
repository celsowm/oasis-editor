import type { EditorBlockNode, EditorParagraphNode } from "@/core/model.js";
import { assertNever } from "@/core/assertNever.js";

/**
 * Depth-first paragraph traversal used by the DOCX export to register numbering
 * definitions and image/hyperlink relationships. Recurses into text-box bodies
 * and table cells so nested content participates too. Shared leaf so both the
 * numbering-context and part-context builders can use it.
 */
export function visitParagraphDeep(
  paragraph: EditorParagraphNode,
  callback: (paragraph: EditorParagraphNode) => void,
): void {
  callback(paragraph);
  for (const run of paragraph.runs) {
    if (run.kind === "textBox") {
      visitBlocks(run.textBox.blocks, callback);
    }
  }
}

export function visitBlocks(
  blocks: EditorBlockNode[],
  callback: (paragraph: EditorParagraphNode) => void,
): void {
  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        visitParagraphDeep(block, callback);
        break;
      case "table":
        for (const row of block.rows) {
          for (const cell of row.cells) {
            for (const paragraph of cell.blocks) {
              visitParagraphDeep(paragraph, callback);
            }
          }
        }
        break;
      default:
        assertNever(block, "block");
    }
  }
}
