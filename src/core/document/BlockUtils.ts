import { DocumentModel } from "./DocumentTypes.js";
import {
  BlockNode,
  TableNode,
  isTextBlock,
  isTableNode,
  TableCellNode,
} from "./BlockTypes.js";

/**
 * Finds a block by ID in the document tree.
 */
export function findBlockById(
  doc: DocumentModel,
  blockId: string,
): BlockNode | null {
  for (const section of doc.sections) {
    const foundMain = findBlockInList(section.children, blockId);
    if (foundMain) return foundMain;
    
    if (section.header) {
      const foundHeader = findBlockInList(section.header, blockId);
      if (foundHeader) return foundHeader;
    }
    
    if (section.footer) {
      const foundFooter = findBlockInList(section.footer, blockId);
      if (foundFooter) return foundFooter;
    }
  }

  // Search footnote blocks
  if (doc.footnotes) {
    for (const fn of doc.footnotes) {
      const foundFn = findBlockInList(fn.blocks, blockId);
      if (foundFn) return foundFn;
    }
  }

  return null;
}

export function findBlockInList(
  blocks: BlockNode[],
  blockId: string,
): BlockNode | null {
  for (const block of blocks) {
    if (block.id === blockId) return block;
    if (isTableNode(block)) {
      for (const row of block.rows) {
        for (const cell of row.cells) {
          const found = findBlockInList(cell.children, blockId);
          if (found) return found;
        }
      }
    }
  }
  return null;
}

/**
 * Returns a flat list of all blocks in the document.
 */
export function getAllBlocks(doc: DocumentModel): BlockNode[] {
  const blocks: BlockNode[] = [];
  for (const section of doc.sections) {
    collectBlocks(section.children, blocks);
    if (section.header) collectBlocks(section.header, blocks);
    if (section.footer) collectBlocks(section.footer, blocks);
  }
  if (doc.footnotes) {
    for (const fn of doc.footnotes) {
      collectBlocks(fn.blocks, blocks);
    }
  }
  return blocks;
}

export function collectBlocks(list: BlockNode[], target: BlockNode[]) {
  for (const block of list) {
    target.push(block);
    if (isTableNode(block)) {
      for (const row of block.rows) {
        for (const cell of row.cells) {
          collectBlocks(cell.children, target);
        }
      }
    }
  }
}

/**
 * Returns a flat list of blocks from a single section's children list,
 * recursively descending into tables. Useful for header/footer/main zones.
 */
export function getAllBlocksInSection(blocks: BlockNode[]): BlockNode[] {
  const result: BlockNode[] = [];
  collectBlocks(blocks, result);
  return result;
}

/**
 * Finds the table that contains the given block ID.
 */
export function findParentTable(
  doc: DocumentModel,
  blockId: string,
): { table: TableNode; rowIdx: number; cellIdx: number } | null {
  for (const section of doc.sections) {
    const res = findTableInList(section.children, blockId);
    if (res) return res;

    if (section.header) {
      const resHeader = findTableInList(section.header, blockId);
      if (resHeader) return resHeader;
    }

    if (section.footer) {
      const resFooter = findTableInList(section.footer, blockId);
      if (resFooter) return resFooter;
    }
  }
  return null;
}

function findTableInList(
  blocks: BlockNode[],
  blockId: string,
): { table: TableNode; rowIdx: number; cellIdx: number } | null {
  for (const block of blocks) {
    if (isTableNode(block)) {
      for (let r = 0; r < block.rows.length; r++) {
        for (let c = 0; c < block.rows[r].cells.length; c++) {
          const cell = block.rows[r].cells[c];
          // If the block is the cell itself
          if (cell.id === blockId)
            return { table: block, rowIdx: r, cellIdx: c };
          // If the block is inside the cell
          const foundInside = findBlockInList(cell.children, blockId);
          if (foundInside) return { table: block, rowIdx: r, cellIdx: c };
        }
      }
    }
  }
  return null;
}
