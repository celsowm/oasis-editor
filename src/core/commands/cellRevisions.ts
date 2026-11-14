import type {
  EditorBlockNode,
  EditorState,
  EditorTableCellNode,
} from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";

/**
 * A structural or formatting revision attached to a table cell
 * (`w:tcPr` insert/delete/merge or `w:tcPrChange`). Cell revisions live on the
 * cell's `style`, not on any run, so every surface that lists or marks changes
 * needs this walker. Grid (`w:tblGridChange`) and table/row-level revisions are
 * preservation-only here and deliberately excluded.
 */
export interface CellRevisionDescriptor {
  id: string;
  type: "insert" | "delete" | "merge" | "property";
  author: string;
  date: number;
  /** Every paragraph id inside the cell's block story (nested tables included). */
  paragraphIds: string[];
  /** Concatenated cell text, used as the Reviewing Pane snippet. */
  snippet: string;
}

function collectParagraphIds(
  blocks: EditorBlockNode[] | undefined,
  ids: string[],
): void {
  if (!blocks) return;
  for (const block of blocks) {
    if (block.type === "paragraph") {
      ids.push(block.id);
      continue;
    }
    for (const row of block.rows) {
      for (const cell of row.cells) collectParagraphIds(cell.blocks, ids);
    }
  }
}

function cellText(blocks: EditorBlockNode[] | undefined): string {
  const parts: string[] = [];
  const walk = (items: EditorBlockNode[] | undefined): void => {
    if (!items) return;
    for (const block of items) {
      if (block.type === "paragraph") {
        for (const run of block.runs) parts.push(run.text);
        continue;
      }
      for (const row of block.rows) {
        for (const cell of row.cells) walk(cell.blocks);
      }
    }
  };
  walk(blocks);
  return parts.join("").trim();
}

function cellRevisionMeta(
  cell: EditorTableCellNode,
): Omit<CellRevisionDescriptor, "paragraphIds" | "snippet">[] {
  const result: Omit<CellRevisionDescriptor, "paragraphIds" | "snippet">[] = [];
  const structural = cell.style?.revision;
  if (structural) {
    result.push({
      id: structural.id,
      type: structural.type,
      author: structural.author,
      date: structural.date,
    });
  }
  const property = cell.style?.propertyRevision;
  if (property) {
    // Match the painted overlay: any cell property change uses the dedicated
    // Formatting category (Word's Show Markup "Formatting" checkbox).
    result.push({
      id: property.id,
      type: "property",
      author: property.author,
      date: property.date,
    });
  }
  return result;
}

/**
 * Every cell-level revision in the document, in document order, de-duplicated
 * by id. Unfiltered by Show Markup: the Reviewing Pane and navigation apply
 * their own visibility rules, while change bars filter at the call site.
 */
export function collectCellRevisions(
  state: EditorState,
): CellRevisionDescriptor[] {
  const result: CellRevisionDescriptor[] = [];
  const seen = new Set<string>();

  const visitCell = (cell: EditorTableCellNode): void => {
    for (const meta of cellRevisionMeta(cell)) {
      if (seen.has(meta.id)) continue;
      seen.add(meta.id);
      const paragraphIds: string[] = [];
      collectParagraphIds(cell.blocks, paragraphIds);
      result.push({
        ...meta,
        paragraphIds,
        snippet: cellText(cell.blocks),
      });
    }
  };

  const walkBlocks = (blocks: EditorBlockNode[] | undefined): void => {
    if (!blocks) return;
    for (const block of blocks) {
      if (block.type === "paragraph") continue;
      for (const row of block.rows) {
        for (const cell of row.cells) {
          visitCell(cell);
          walkBlocks(cell.blocks);
        }
      }
    }
  };

  const walkStories = (blocks: EditorBlockNode[] | undefined): void => {
    walkBlocks(blocks);
  };

  for (const section of getDocumentSections(state.document)) {
    for (const blocks of [
      section.blocks,
      section.header,
      section.firstPageHeader,
      section.evenPageHeader,
      section.footer,
      section.firstPageFooter,
      section.evenPageFooter,
    ]) {
      walkStories(blocks);
    }
  }
  for (const footnote of Object.values(state.document.footnotes?.items ?? {})) {
    walkStories(footnote.blocks);
  }
  for (const endnote of Object.values(state.document.endnotes?.items ?? {})) {
    walkStories(endnote.blocks);
  }

  return result;
}
