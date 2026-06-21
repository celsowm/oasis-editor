/**
 * Helpers that flatten the document tree (sections / blocks / rows / cells)
 * into a single paragraph stream. Used by the indexer and by callers that
 * just need every paragraph in document order.
 */
import type { EditorBlockNode, EditorParagraphNode } from "./types/nodes.js";
import type { EditorSection } from "./types/document.js";
import { assertNever } from "../assertNever.js";

export function getBlockParagraphs(
  block: EditorBlockNode,
): EditorParagraphNode[] {
  switch (block.type) {
    case "paragraph":
      return [block];
    case "table":
      return block.rows.flatMap((row) =>
        row.cells.flatMap((cell) => cell.blocks),
      );
    default:
      return assertNever(block, "block");
  }
}

function flattenSectionZone(
  blocks: EditorBlockNode[] | undefined,
): EditorParagraphNode[] {
  return blocks ? blocks.flatMap(getBlockParagraphs) : [];
}

export function collectSectionParagraphs(
  section: EditorSection,
): EditorParagraphNode[] {
  return [
    ...flattenSectionZone(section.header),
    ...flattenSectionZone(section.firstPageHeader),
    ...flattenSectionZone(section.evenPageHeader),
    ...section.blocks.flatMap(getBlockParagraphs),
    ...flattenSectionZone(section.footer),
    ...flattenSectionZone(section.firstPageFooter),
    ...flattenSectionZone(section.evenPageFooter),
  ];
}
