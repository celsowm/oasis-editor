import type {
  Editor2BlockNode,
  Editor2Document,
  Editor2ParagraphNode,
  Editor2TableNode,
  Editor2TextRun,
} from "../../core/model.js";

function normalizeRun(run: Editor2TextRun) {
  return {
    text: run.text,
    styles: run.styles ?? undefined,
  };
}

function normalizeParagraph(paragraph: Editor2ParagraphNode) {
  return {
    type: paragraph.type,
    runs: paragraph.runs.map(normalizeRun),
    style: paragraph.style ?? undefined,
    list: paragraph.list ?? undefined,
  };
}

function normalizeTable(table: Editor2TableNode) {
  return {
    type: table.type,
    rows: table.rows.map((row) => ({
      cells: row.cells.map((cell) => ({
        colSpan: cell.colSpan ?? undefined,
        blocks: cell.blocks.map(normalizeParagraph),
      })),
    })),
  };
}

function normalizeBlock(block: Editor2BlockNode) {
  return block.type === "paragraph" ? normalizeParagraph(block) : normalizeTable(block);
}

export function normalizeEditor2Document(document: Editor2Document) {
  return {
    blocks: document.blocks.map(normalizeBlock),
  };
}
