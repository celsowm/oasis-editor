import type {
  EditorBlockNode,
  EditorEndnote,
  EditorEndnotes,
  EditorFootnote,
  EditorFootnotes,
  EditorSection,
  EditorState,
} from "./model.js";

export function cloneBlock(block: EditorBlockNode): EditorBlockNode {
  return block.type === "paragraph"
    ? {
        ...block,
        runs: block.runs.map((run) => ({
          ...run,
          styles: run.styles ? { ...run.styles } : undefined,
          image: run.image ? { ...run.image } : undefined,
          field: run.field ? { ...run.field } : undefined,
          revision: run.revision ? { ...run.revision } : undefined,
          footnoteReference: run.footnoteReference
            ? { ...run.footnoteReference }
            : undefined,
          endnoteReference: run.endnoteReference
            ? { ...run.endnoteReference }
            : undefined,
        })),
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
              runs: paragraph.runs.map((run) => ({
                ...run,
                styles: run.styles ? { ...run.styles } : undefined,
                image: run.image ? { ...run.image } : undefined,
                field: run.field ? { ...run.field } : undefined,
                revision: run.revision ? { ...run.revision } : undefined,
                footnoteReference: run.footnoteReference
                  ? { ...run.footnoteReference }
                  : undefined,
                endnoteReference: run.endnoteReference
                  ? { ...run.endnoteReference }
                  : undefined,
              })),
              style: paragraph.style ? { ...paragraph.style } : undefined,
              list: paragraph.list ? { ...paragraph.list } : undefined,
            })),
          })),
        })),
      };
}

export const cloneDocumentBlock = cloneBlock;

export function cloneSection(section: EditorSection): EditorSection {
  return {
    ...section,
    blocks: section.blocks.map(cloneBlock),
    header: section.header?.map(cloneBlock),
    firstPageHeader: section.firstPageHeader?.map(cloneBlock),
    evenPageHeader: section.evenPageHeader?.map(cloneBlock),
    footer: section.footer?.map(cloneBlock),
    firstPageFooter: section.firstPageFooter?.map(cloneBlock),
    evenPageFooter: section.evenPageFooter?.map(cloneBlock),
  };
}

export function cloneFootnote(footnote: EditorFootnote): EditorFootnote {
  return {
    ...footnote,
    blocks: footnote.blocks.map(cloneBlock),
  };
}

export function cloneFootnotes(
  footnotes: EditorFootnotes | undefined,
): EditorFootnotes | undefined {
  if (!footnotes) return undefined;
  const nextItems: Record<string, EditorFootnote> = {};
  for (const [id, footnote] of Object.entries(footnotes.items)) {
    nextItems[id] = cloneFootnote(footnote);
  }
  return {
    items: nextItems,
    settings: footnotes.settings ? { ...footnotes.settings } : undefined,
    separator: footnotes.separator?.map(cloneBlock),
    continuationSeparator: footnotes.continuationSeparator?.map(cloneBlock),
  };
}

export function cloneEndnote(endnote: EditorEndnote): EditorEndnote {
  return {
    ...endnote,
    blocks: endnote.blocks.map(cloneBlock),
  };
}

export function cloneEndnotes(
  endnotes: EditorEndnotes | undefined,
): EditorEndnotes | undefined {
  if (!endnotes) return undefined;
  const nextItems: Record<string, EditorEndnote> = {};
  for (const [id, endnote] of Object.entries(endnotes.items)) {
    nextItems[id] = cloneEndnote(endnote);
  }
  return {
    items: nextItems,
    settings: endnotes.settings ? { ...endnotes.settings } : undefined,
    separator: endnotes.separator?.map(cloneBlock),
    continuationSeparator: endnotes.continuationSeparator?.map(cloneBlock),
  };
}

export function cloneEditorState(source: EditorState): EditorState {
  return {
    ...source,
    document: {
      ...source.document,
      sections: source.document.sections?.map(cloneSection),
      footnotes: cloneFootnotes(source.document.footnotes),
      endnotes: cloneEndnotes(source.document.endnotes),
    },
    selection: {
      anchor: { ...source.selection.anchor },
      focus: { ...source.selection.focus },
    },
    activeSectionIndex: source.activeSectionIndex ?? 0,
    activeZone: source.activeZone ?? "main",
    activeFootnoteId: source.activeFootnoteId,
  };
}
