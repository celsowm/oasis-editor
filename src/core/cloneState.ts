import type {
  EditorBlockNode,
  EditorEndnote,
  EditorEndnotes,
  EditorFootnote,
  EditorFootnotes,
  EditorParagraphNode,
  EditorSection,
  EditorState,
} from "./model.js";
import { assertNever } from "./assertNever.js";
import { cloneRun } from "./document/clone.js";

export function cloneBlock(block: EditorBlockNode): EditorBlockNode {
  switch (block.type) {
    case "paragraph":
      return {
        ...block,
        runs: block.runs.map(cloneRun),
        style: block.style ? { ...block.style } : undefined,
        list: block.list ? { ...block.list } : undefined,
      };
    case "table":
      return {
        ...block,
        style: block.style
          ? {
              ...block.style,
              defaultCellMargins: block.style.defaultCellMargins
                ? { ...block.style.defaultCellMargins }
                : undefined,
              floating: block.style.floating
                ? { ...block.style.floating }
                : undefined,
              revision: block.style.revision
                ? {
                    ...block.style.revision,
                    previous: { ...block.style.revision.previous },
                  }
                : undefined,
            }
          : undefined,
        gridRevision: block.gridRevision
          ? {
              ...block.gridRevision,
              previous: [...block.gridRevision.previous],
            }
          : undefined,
        rows: block.rows.map((row) => ({
          ...row,
          conditionalStyle: row.conditionalStyle
            ? { ...row.conditionalStyle }
            : undefined,
          style: row.style
            ? {
                ...row.style,
                revision: row.style.revision
                  ? { ...row.style.revision }
                  : undefined,
                propertyRevision: row.style.propertyRevision
                  ? {
                      ...row.style.propertyRevision,
                      previous: { ...row.style.propertyRevision.previous },
                    }
                  : undefined,
              }
            : undefined,
          cells: row.cells.map((cell) => ({
            ...cell,
            conditionalStyle: cell.conditionalStyle
              ? { ...cell.conditionalStyle }
              : undefined,
            mergeRevisionState: cell.mergeRevisionState
              ? {
                  ...cell.mergeRevisionState,
                  previousCells: cell.mergeRevisionState.previousCells.map(
                    (previousCell) => ({
                      ...previousCell,
                      mergeRevisionState: undefined,
                      style: previousCell.style
                        ? { ...previousCell.style }
                        : undefined,
                      blocks: previousCell.blocks.map(
                        (paragraph): EditorBlockNode => cloneBlock(paragraph),
                      ) as EditorParagraphNode[],
                    }),
                  ),
                }
              : undefined,
            colSpan: cell.colSpan ?? undefined,
            rowSpan: cell.rowSpan ?? undefined,
            vMerge: cell.vMerge ?? undefined,
            style: cell.style
              ? {
                  ...cell.style,
                  revision: cell.style.revision
                    ? { ...cell.style.revision }
                    : undefined,
                  propertyRevision: cell.style.propertyRevision
                    ? {
                        ...cell.style.propertyRevision,
                        previous: {
                          ...cell.style.propertyRevision.previous,
                        },
                      }
                    : undefined,
                }
              : undefined,
            blocks: cell.blocks.map((paragraph) => ({
              ...paragraph,
              runs: paragraph.runs.map(cloneRun),
              style: paragraph.style ? { ...paragraph.style } : undefined,
              list: paragraph.list ? { ...paragraph.list } : undefined,
            })),
          })),
        })),
      };
    default:
      return assertNever(block, "block");
  }
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
