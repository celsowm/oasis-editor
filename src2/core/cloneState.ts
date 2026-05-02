import type {
  Editor2BlockNode,
  Editor2Section,
  Editor2State,
} from "./model.js";

export function cloneBlock(block: Editor2BlockNode): Editor2BlockNode {
  return block.type === "paragraph"
    ? {
        ...block,
        runs: block.runs.map((run) => ({ ...run })),
        style: block.style ? { ...block.style } : undefined,
        list: block.list ? { ...block.list } : undefined,
      }
    : {
        ...block,
        rows: block.rows.map((row) => ({
          ...row,
          cells: row.cells.map((cell) => ({
            ...cell,
            colSpan: cell.colSpan ?? undefined,
            rowSpan: cell.rowSpan ?? undefined,
            vMerge: cell.vMerge ?? undefined,
            blocks: cell.blocks.map((paragraph) => ({
              ...paragraph,
              runs: paragraph.runs.map((run) => ({ ...run })),
              style: paragraph.style ? { ...paragraph.style } : undefined,
              list: paragraph.list ? { ...paragraph.list } : undefined,
            })),
          })),
        })),
      };
}

export const cloneDocumentBlock = cloneBlock;

export function cloneSection(section: Editor2Section): Editor2Section {
  return {
    ...section,
    blocks: section.blocks.map(cloneBlock),
    header: section.header?.map(cloneBlock),
    footer: section.footer?.map(cloneBlock),
  };
}

export function cloneEditor2State(source: Editor2State): Editor2State {
  return {
    ...source,
    document: {
      ...source.document,
      blocks: source.document.blocks.map(cloneBlock),
      sections: source.document.sections?.map(cloneSection),
    },
    selection: {
      anchor: { ...source.selection.anchor },
      focus: { ...source.selection.focus },
    },
    activeSectionIndex: source.activeSectionIndex ?? 0,
    activeZone: source.activeZone ?? "main",
  };
}
