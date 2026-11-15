import type {
  EditorBlockNode,
  EditorState,
  EditorTableCellNode,
  EditorTableNode,
  EditorTableRowNode,
} from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";

/**
 * Structural or property revisions attached to a table, one of its rows, or
 * one of its cells (`w:tblPrChange`/`w:tblGridChange`, `w:trPrChange`,
 * `w:tcPr` insert/delete/merge and `w:tcPrChange`), plus section-level
 * `w:sectPrChange` property revisions. These live on the node's `style` (or the
 * section), not on any run, so every surface that lists, marks or navigates
 * changes needs these walkers. Pending merge state (`mergeRevisionState`) still
 * carries only an id — no author/date/type — so it remains preservation-only
 * and cannot become a Reviewing Pane row without new semantics.
 */
export type TableRevisionScope = "table" | "row" | "cell";

/** A `w:sectPrChange` property revision on a section. */
export interface SectionRevisionDescriptor {
  id: string;
  /** `w:sectPrChange` is a formatting change (Word's Formatting category). */
  type: "property";
  author: string;
  date: number;
  sectionId: string;
  sectionIndex: number;
  /** Every body paragraph id under the section (nested tables included). */
  paragraphIds: string[];
  /** Concatenated body text, used as the Reviewing Pane snippet. */
  snippet: string;
}

export interface TableRevisionDescriptor {
  id: string;
  type: "insert" | "delete" | "merge" | "property" | "grid";
  author: string;
  date: number;
  scope: TableRevisionScope;
  tableId: string;
  /** Document row index; absent for table-scoped revisions. */
  rowIndex?: number;
  /** Cell index; absent for row- and table-scoped revisions. */
  cellIndex?: number;
  /** Every paragraph id under this scope (nested tables included). */
  paragraphIds: string[];
  /** Concatenated text, used as the Reviewing Pane snippet. */
  snippet: string;
}

/** Backwards-compatible name for the cell-scoped subset. */
export type CellRevisionDescriptor = TableRevisionDescriptor;

interface RevisionMeta {
  id: string;
  type: TableRevisionDescriptor["type"];
  author: string;
  date: number;
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

function blockText(blocks: EditorBlockNode[] | undefined): string {
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

function rowBlocks(row: EditorTableRowNode): EditorBlockNode[] {
  return row.cells.flatMap((cell): EditorBlockNode[] => cell.blocks);
}

function tableBlocks(table: EditorTableNode): EditorBlockNode[] {
  return table.rows.flatMap(rowBlocks);
}

function structuralMeta(revision: {
  id: string;
  type: string;
  author: string;
  date: number;
}): RevisionMeta {
  return {
    id: revision.id,
    type: revision.type as RevisionMeta["type"],
    author: revision.author,
    date: revision.date,
  };
}

function propertyMeta(revision: {
  id: string;
  author: string;
  date: number;
}): RevisionMeta {
  // Any `w:*PrChange` belongs to Word's dedicated Formatting category.
  return {
    id: revision.id,
    type: "property",
    author: revision.author,
    date: revision.date,
  };
}

function cellRevisions(cell: EditorTableCellNode): RevisionMeta[] {
  const result: RevisionMeta[] = [];
  if (cell.style?.revision) result.push(structuralMeta(cell.style.revision));
  if (cell.style?.propertyRevision) {
    result.push(propertyMeta(cell.style.propertyRevision));
  }
  return result;
}

function rowRevisions(row: EditorTableRowNode): RevisionMeta[] {
  const result: RevisionMeta[] = [];
  if (row.style?.revision) result.push(structuralMeta(row.style.revision));
  if (row.style?.propertyRevision) {
    result.push(propertyMeta(row.style.propertyRevision));
  }
  if (row.propertyExceptionsRevision) {
    result.push(propertyMeta(row.propertyExceptionsRevision));
  }
  return result;
}

function tableRevisions(table: EditorTableNode): RevisionMeta[] {
  const result: RevisionMeta[] = [];
  if (table.style?.revision) result.push(propertyMeta(table.style.revision));
  if (table.gridRevision) {
    result.push({
      id: table.gridRevision.id,
      type: "grid",
      author: table.gridRevision.author,
      date: table.gridRevision.date,
    });
  }
  return result;
}

/**
 * Every table-level revision in the document, in document order,
 * de-duplicated by id. Unfiltered by Show Markup: the Reviewing Pane and
 * navigation apply their own visibility rules, while painting and change bars
 * filter at the call site through `isRevisionMarkupShown`.
 */
export function collectTableRevisions(
  state: EditorState,
): TableRevisionDescriptor[] {
  const result: TableRevisionDescriptor[] = [];
  const seen = new Set<string>();

  const push = (
    meta: RevisionMeta,
    scope: TableRevisionScope,
    tableId: string,
    rowIndex: number | undefined,
    cellIndex: number | undefined,
    blocks: EditorBlockNode[],
  ): void => {
    if (seen.has(meta.id)) return;
    seen.add(meta.id);
    const paragraphIds: string[] = [];
    collectParagraphIds(blocks, paragraphIds);
    result.push({
      ...meta,
      scope,
      tableId,
      rowIndex,
      cellIndex,
      paragraphIds,
      snippet: blockText(blocks),
    });
  };

  const walkBlocks = (blocks: EditorBlockNode[] | undefined): void => {
    if (!blocks) return;
    for (const block of blocks) {
      if (block.type === "paragraph") continue;
      for (const meta of tableRevisions(block)) {
        push(meta, "table", block.id, undefined, undefined, tableBlocks(block));
      }
      block.rows.forEach((row, rowIndex) => {
        for (const meta of rowRevisions(row)) {
          push(meta, "row", block.id, rowIndex, undefined, rowBlocks(row));
        }
        row.cells.forEach((cell, cellIndex) => {
          for (const meta of cellRevisions(cell)) {
            push(meta, "cell", block.id, rowIndex, cellIndex, cell.blocks);
          }
          walkBlocks(cell.blocks);
        });
      });
    }
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
      walkBlocks(blocks);
    }
  }
  for (const footnote of Object.values(state.document.footnotes?.items ?? {})) {
    walkBlocks(footnote.blocks);
  }
  for (const endnote of Object.values(state.document.endnotes?.items ?? {})) {
    walkBlocks(endnote.blocks);
  }

  return result;
}

/** Cell-scoped revisions only (the Delivery 137 surface). */
export function collectCellRevisions(
  state: EditorState,
): TableRevisionDescriptor[] {
  return collectTableRevisions(state).filter(
    (entry): boolean => entry.scope === "cell",
  );
}

/**
 * Every section-level `w:sectPrChange` property revision, in document order,
 * de-duplicated by id. A section revision has no run to carry its id, so each
 * descriptor carries the section's body paragraph ids: the first anchors Next/
 * Previous Change and the Reviewing Pane row, while the whole set drives
 * Simple Markup change bars and the painted section outline. Unfiltered by Show
 * Markup; consumers apply `isRevisionMarkupShown` at the call site (the type is
 * `"property"`, so it follows the dedicated Formatting checkbox).
 */
export function collectSectionRevisions(
  state: EditorState,
): SectionRevisionDescriptor[] {
  const result: SectionRevisionDescriptor[] = [];
  const seen = new Set<string>();
  getDocumentSections(state.document).forEach((section, sectionIndex) => {
    const revision = section.propertyRevision;
    if (!revision || seen.has(revision.id)) return;
    seen.add(revision.id);
    const paragraphIds: string[] = [];
    collectParagraphIds(section.blocks, paragraphIds);
    const text = blockText(section.blocks);
    result.push({
      id: revision.id,
      type: "property",
      author: revision.author,
      date: revision.date,
      sectionId: section.id,
      sectionIndex,
      paragraphIds,
      snippet: text.length > 96 ? `${text.slice(0, 93)}…` : text,
    });
  });
  return result;
}
