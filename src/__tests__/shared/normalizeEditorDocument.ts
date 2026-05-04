import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphNode,
  EditorTableNode,
  EditorTextRun,
} from "../../core/model.js";

function normalizeRun(run: EditorTextRun) {
  return {
    text: run.text,
    styles: run.styles ?? undefined,
    image: run.image ? { ...run.image } : undefined,
  };
}

function normalizeParagraph(paragraph: EditorParagraphNode) {
  return {
    type: paragraph.type,
    runs: paragraph.runs.map(normalizeRun),
    style: paragraph.style ?? undefined,
    list: paragraph.list ?? undefined,
  };
}

function normalizeTable(table: EditorTableNode) {
  return {
    type: table.type,
    rows: table.rows.map((row) => ({
      isHeader: row.isHeader ?? undefined,
      cells: row.cells.map((cell) => ({
        colSpan: cell.colSpan ?? undefined,
        rowSpan: cell.rowSpan ?? undefined,
        vMerge: cell.vMerge ?? undefined,
        blocks: cell.blocks.map(normalizeParagraph),
      })),
    })),
  };
}

function normalizeBlock(block: EditorBlockNode) {
  return block.type === "paragraph" ? normalizeParagraph(block) : normalizeTable(block);
}

export function normalizeEditorDocument(document: EditorDocument) {
  return {
    pageSettings: document.pageSettings
        ? {
            width: document.pageSettings.width,
            height: document.pageSettings.height,
            orientation: document.pageSettings.orientation,
            margins: { ...document.pageSettings.margins },
          }
        : undefined,
    blocks: document.blocks.map(normalizeBlock),
  };
}
