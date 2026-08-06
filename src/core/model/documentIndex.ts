/**
 * Document paragraph index: maps paragraph id → (paragraph, location) where
 * location encodes the section, editing zone, paragraph index, and optional
 * footnote id. The original implementation had three nearly identical loops
 * (header / main / footer) duplicated 80+ lines each. This builder turns
 * "add a new editing zone" into a one-line change in `build()`.
 *
 * Caching: WeakMap-based memoization keyed on the EditorDocument object,
 * matching the previous behaviour. The cache is exposed as an interface so
 * tests can swap in an in-memory variant.
 */
import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorTableCellNode,
  EditorTableNode,
} from "./types/nodes.js";
import type { EditorDocument } from "./types/document.js";
import type { EditorEditingZone } from "./types/selection.js";
import { getDocumentSections } from "./documentSections.js";
import {
  collectSectionParagraphs,
  getBlockParagraphs,
} from "./paragraphWalker.js";
import { assertNever } from "../assertNever.js";

export interface EditorParagraphLocation {
  sectionIndex: number;
  zone: EditorEditingZone;
  paragraphIndexInSection: number;
  /** When `zone === "footnote"`, identifies which footnote owns the paragraph. */
  footnoteId?: string;
}

/**
 * One table hop from a block story into a cell. `tableBlockIndex` is relative
 * to the story that contains that table: a section/header/footer story for the
 * first hop, then the parent cell's `blocks` array for every nested hop.
 */
export interface TablePathSegment {
  tableBlockIndex: number;
  rowIndex: number;
  cellIndex: number;
}

export interface TableLocation {
  /** Top-level table block index. Retained for legacy one-level consumers. */
  blockIndex: number;
  /** Top-level row index. Retained for legacy one-level consumers. */
  rowIndex: number;
  /** Top-level cell index. Retained for legacy one-level consumers. */
  cellIndex: number;
  /** Paragraph block index inside the innermost cell story. */
  paragraphIndex: number;
  /** Complete outer-to-inner path. One entry means a legacy direct table. */
  tablePath: TablePathSegment[];
}

export interface ResolvedTablePath {
  table: EditorTableNode;
  cell: EditorTableCellNode;
  segment: TablePathSegment;
  depth: number;
}

export interface DocumentParagraphIndexEntry {
  paragraph: EditorParagraphNode;
  location: EditorParagraphLocation;
  tableLocation: TableLocation | null;
}

interface ZoneBlockSource {
  zone: EditorEditingZone;
  blocks: EditorBlockNode[] | undefined;
  footnoteId?: string;
}

interface IndexBlockContext {
  sectionIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  startIndex: number;
}

interface TableIndexContext {
  currentTableBlockIndex: number;
  tablePath: TablePathSegment[];
}

export class DocumentIndexBuilder {
  private readonly index = new Map<string, DocumentParagraphIndexEntry>();

  constructor(private readonly document: EditorDocument) {}

  build(): Map<string, DocumentParagraphIndexEntry> {
    const sections = getDocumentSections(this.document);
    sections.forEach((section, sectionIndex): void => {
      this.indexZone({ zone: "header", blocks: section.header }, sectionIndex);
      this.indexZone(
        { zone: "header", blocks: section.firstPageHeader },
        sectionIndex,
      );
      this.indexZone(
        { zone: "header", blocks: section.evenPageHeader },
        sectionIndex,
      );
      this.indexZone({ zone: "main", blocks: section.blocks }, sectionIndex);
      this.indexZone({ zone: "footer", blocks: section.footer }, sectionIndex);
      this.indexZone(
        { zone: "footer", blocks: section.firstPageFooter },
        sectionIndex,
      );
      this.indexZone(
        { zone: "footer", blocks: section.evenPageFooter },
        sectionIndex,
      );
    });
    this.indexFootnotes();
    return this.index;
  }

  private indexZone(src: ZoneBlockSource, sectionIndex: number): void {
    if (!src.blocks) return;
    let paraIndex = 0;
    src.blocks.forEach((block, blockIndex): void => {
      paraIndex = this.indexTopLevelBlock(block, blockIndex, {
        sectionIndex,
        zone: src.zone,
        footnoteId: src.footnoteId,
        startIndex: paraIndex,
      });
    });
  }

  private indexTable(
    table: EditorTableNode,
    ctx: IndexBlockContext,
    tableCtx: TableIndexContext,
  ): number {
    let paraIndex = ctx.startIndex;
    table.rows.forEach((row, rowIndex): void => {
      row.cells.forEach((cell, cellIndex): void => {
        const segment: TablePathSegment = {
          tableBlockIndex: tableCtx.currentTableBlockIndex,
          rowIndex,
          cellIndex,
        };
        const currentPath = [...tableCtx.tablePath, segment];
        cell.blocks.forEach((child, childIndex): void => {
          if (child.type === "paragraph") {
            const first = currentPath[0]!;
            this.recordParagraph(
              child,
              {
                sectionIndex: ctx.sectionIndex,
                zone: ctx.zone,
                paragraphIndexInSection: paraIndex,
                footnoteId: ctx.footnoteId,
              },
              {
                blockIndex: first.tableBlockIndex,
                rowIndex: first.rowIndex,
                cellIndex: first.cellIndex,
                paragraphIndex: childIndex,
                tablePath: currentPath,
              },
            );
            paraIndex += 1;
            return;
          }

          paraIndex = this.indexTable(
            child,
            { ...ctx, startIndex: paraIndex },
            {
              currentTableBlockIndex: childIndex,
              tablePath: currentPath,
            },
          );
        });
      });
    });
    return paraIndex;
  }

  private indexTopLevelBlock(
    block: EditorBlockNode,
    blockIndex: number,
    ctx: IndexBlockContext,
  ): number {
    switch (block.type) {
      case "paragraph":
        this.recordParagraph(
          block,
          {
            sectionIndex: ctx.sectionIndex,
            zone: ctx.zone,
            paragraphIndexInSection: ctx.startIndex,
            footnoteId: ctx.footnoteId,
          },
          null,
        );
        return ctx.startIndex + 1;
      case "table":
        return this.indexTable(block, ctx, {
          currentTableBlockIndex: blockIndex,
          tablePath: [],
        });
      default:
        return assertNever(block, "block");
    }
  }

  private recordParagraph(
    paragraph: EditorParagraphNode,
    location: EditorParagraphLocation,
    tableLocation: TableLocation | null,
  ): void {
    this.index.set(paragraph.id, { paragraph, location, tableLocation });
  }

  private indexFootnotes(): void {
    const items = this.document.footnotes?.items;
    if (!items) return;
    for (const footnoteId of Object.keys(items)) {
      const footnote = items[footnoteId];
      if (!footnote) continue;
      // Footnote navigation uses `footnoteId`; `sectionIndex` is left as 0
      // for backwards compatibility with the previous implementation.
      this.indexZone(
        { zone: "footnote", blocks: footnote.blocks, footnoteId },
        0,
      );
    }
  }
}

/**
 * Cache abstraction so tests can deterministically seed or inspect the
 * document index without going through WeakMap semantics.
 */
export interface DocumentIndexCache {
  getIndex(
    document: EditorDocument,
  ): Map<string, DocumentParagraphIndexEntry> | undefined;
  setIndex(
    document: EditorDocument,
    index: Map<string, DocumentParagraphIndexEntry>,
  ): void;
  getParagraphs(document: EditorDocument): EditorParagraphNode[] | undefined;
  setParagraphs(
    document: EditorDocument,
    paragraphs: EditorParagraphNode[],
  ): void;
}

export class WeakMapDocumentIndexCache implements DocumentIndexCache {
  private readonly indexMap = new WeakMap<
    EditorDocument,
    Map<string, DocumentParagraphIndexEntry>
  >();
  private readonly paragraphsMap = new WeakMap<
    EditorDocument,
    EditorParagraphNode[]
  >();

  getIndex(
    document: EditorDocument,
  ): Map<string, DocumentParagraphIndexEntry> | undefined {
    return this.indexMap.get(document);
  }
  setIndex(
    document: EditorDocument,
    index: Map<string, DocumentParagraphIndexEntry>,
  ): void {
    this.indexMap.set(document, index);
  }
  getParagraphs(document: EditorDocument): EditorParagraphNode[] | undefined {
    return this.paragraphsMap.get(document);
  }
  setParagraphs(
    document: EditorDocument,
    paragraphs: EditorParagraphNode[],
  ): void {
    this.paragraphsMap.set(document, paragraphs);
  }
}

const defaultCache: DocumentIndexCache = new WeakMapDocumentIndexCache();

export function getDocumentParagraphIndex(
  document: EditorDocument,
): Map<string, DocumentParagraphIndexEntry> {
  const cached = defaultCache.getIndex(document);
  if (cached) {
    return cached;
  }
  const index = new DocumentIndexBuilder(document).build();
  defaultCache.setIndex(document, index);
  return index;
}

export function getDocumentParagraphsCanonical(
  document: EditorDocument,
): EditorParagraphNode[] {
  const cached = defaultCache.getParagraphs(document);
  if (cached) {
    return cached;
  }
  const sections = getDocumentSections(document);
  const sectionParagraphs = sections.flatMap((section): EditorParagraphNode[] =>
    collectSectionParagraphs(section),
  );

  const footnoteItems = document.footnotes?.items;
  const footnoteParagraphs: EditorParagraphNode[] = footnoteItems
    ? Object.values(footnoteItems).flatMap((footnote): EditorParagraphNode[] =>
        footnote.blocks.flatMap(getBlockParagraphs),
      )
    : [];

  const paragraphs = [...sectionParagraphs, ...footnoteParagraphs];
  defaultCache.setParagraphs(document, paragraphs);
  return paragraphs;
}

export function getDocumentParagraphs(
  document: EditorDocument,
): EditorParagraphNode[] {
  return getDocumentParagraphsCanonical(document);
}

export function getParagraphById(
  document: EditorDocument,
  paragraphId: string,
): EditorParagraphNode | undefined {
  return getDocumentParagraphIndex(document).get(paragraphId)?.paragraph;
}

export function findParagraphLocation(
  document: EditorDocument,
  paragraphId: string,
): EditorParagraphLocation | null {
  const entry = getDocumentParagraphIndex(document).get(paragraphId);
  return entry ? entry.location : null;
}

/** Returns the complete path, including nested tables. */
export function findParagraphTablePathLocation(
  document: EditorDocument,
  paragraphId: string,
  activeSectionIndex: number = 0,
): (TableLocation & { zone: EditorEditingZone }) | null {
  const entry = getDocumentParagraphIndex(document).get(paragraphId);
  if (!entry || !entry.tableLocation) return null;

  if (document.sections && document.sections.length > 0) {
    if (entry.location.sectionIndex !== activeSectionIndex) return null;
  }

  return { ...entry.tableLocation, zone: entry.location.zone };
}

/**
 * Legacy one-level lookup. Nested table paragraphs intentionally return null so
 * older merge/split callers cannot accidentally mutate the outer table.
 */
export function findParagraphTableLocation(
  document: EditorDocument,
  paragraphId: string,
  activeSectionIndex: number = 0,
): (TableLocation & { zone: EditorEditingZone }) | null {
  const location = findParagraphTablePathLocation(
    document,
    paragraphId,
    activeSectionIndex,
  );
  return location?.tablePath.length === 1 ? location : null;
}

/** Resolve every table/cell hop from a zone block story. */
export function resolveTablePath(
  blocks: EditorBlockNode[],
  tablePath: readonly TablePathSegment[],
): ResolvedTablePath[] | null {
  const resolved: ResolvedTablePath[] = [];
  let story = blocks;
  for (let depth = 0; depth < tablePath.length; depth += 1) {
    const segment = tablePath[depth]!;
    const table = story[segment.tableBlockIndex];
    if (!table || table.type !== "table") return null;
    const cell = table.rows[segment.rowIndex]?.cells[segment.cellIndex];
    if (!cell) return null;
    resolved.push({ table, cell, segment, depth });
    story = cell.blocks;
  }
  return resolved;
}
