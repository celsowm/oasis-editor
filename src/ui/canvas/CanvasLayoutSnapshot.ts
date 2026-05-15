import {
  getDocumentParagraphs,
  getPageBodyBottom,
  getPageBodyTop,
  getPageContentWidth,
  getParagraphText,
  paragraphOffsetToPosition,
  type EditorEditingZone,
  type EditorLayoutParagraph,
  type EditorParagraphNode,
  type EditorPosition,
  type EditorState,
  type EditorTableNode,
} from "../../core/model.js";
import { projectDocumentLayout, projectParagraphLayout } from "../layoutProjection.js";

export interface CanvasSnapshotSlot {
  offset: number;
  left: number;
  top: number;
  height: number;
}

export interface CanvasSnapshotLine {
  startOffset: number;
  endOffset: number;
  top: number;
  height: number;
  slots: CanvasSnapshotSlot[];
}

export interface CanvasSnapshotTableCellInfo {
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
  anchorPosition: EditorPosition;
}

export interface CanvasSnapshotParagraph {
  paragraph: EditorParagraphNode;
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  textLength: number;
  left: number;
  top: number;
  width: number;
  height: number;
  lines: CanvasSnapshotLine[];
  tableCell?: CanvasSnapshotTableCellInfo;
}

export interface CanvasSnapshotPage {
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
  bodyTop: number;
  bodyBottom: number;
}

export interface CanvasLayoutSnapshot {
  surfaceRect: DOMRect;
  pages: CanvasSnapshotPage[];
  paragraphs: CanvasSnapshotParagraph[];
  paragraphsById: Map<string, CanvasSnapshotParagraph[]>;
}

export interface BuildCanvasLayoutSnapshotOptions {
  surface: HTMLElement;
  state: EditorState;
  measuredBlockHeights?: Record<string, number>;
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>;
  layoutMode?: "fast" | "wordParity";
}

interface TableCellLayoutEntry {
  paragraph: EditorParagraphNode;
  lines: CanvasSnapshotLine[];
  left: number;
  top: number;
  width: number;
  height: number;
  rowIndex: number;
  cellIndex: number;
  tableId: string;
  anchorPosition: EditorPosition;
}

function resolveTableWidth(table: EditorTableNode, contentWidth: number): number {
  const raw = table.style?.width;
  if (typeof raw === "number") return Math.max(24, raw);
  if (typeof raw === "string" && raw.trim().endsWith("%")) {
    const value = Number.parseFloat(raw.trim().slice(0, -1));
    if (Number.isFinite(value)) return Math.max(24, contentWidth * (value / 100));
  }
  return contentWidth;
}

function createTableCellLayouts(
  table: EditorTableNode,
  state: EditorState,
  pageIndex: number,
  layoutMode: "fast" | "wordParity",
  originX: number,
  originY: number,
  contentWidth: number,
  estimatedHeight: number,
): TableCellLayoutEntry[] {
  const entries: TableCellLayoutEntry[] = [];
  const tableWidth = resolveTableWidth(table, contentWidth);
  const rowCount = Math.max(1, table.rows.length);
  const rowHeight = estimatedHeight > 0 ? estimatedHeight / rowCount : 28;
  let y = originY;

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex]!;
    const columns = Math.max(1, row.cells.length);
    const baseCellWidth = tableWidth / columns;
    let x = originX;

    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      const cell = row.cells[cellIndex]!;
      const colSpan = Math.max(1, cell.colSpan ?? 1);
      const cellWidth = baseCellWidth * colSpan;
      const cellLeft = x;
      const cellTop = y;
      const cellHeight = rowHeight;
      const contentLeft = cellLeft + 6;
      const contentTop = cellTop + 4;
      const contentWidthPx = Math.max(24, cellWidth - 12);
      let paragraphCursorY = 0;
      const firstParagraph = cell.blocks[0];
      const anchorPosition = firstParagraph
        ? paragraphOffsetToPosition(firstParagraph, 0)
        : paragraphOffsetToPosition(
            {
              id: `table:${table.id}:r${rowIndex}:c${cellIndex}:empty`,
              type: "paragraph",
              runs: [{ id: "run:empty", text: "" }],
            },
            0,
          );

      for (const paragraph of cell.blocks) {
        const projected = projectParagraphLayout(
          paragraph,
          pageIndex,
          undefined,
          state.document.styles,
          contentWidthPx,
          layoutMode,
        );
        const lines: CanvasSnapshotLine[] = projected.lines.map((line) => ({
          startOffset: line.startOffset,
          endOffset: line.endOffset,
          top: contentTop + paragraphCursorY + line.top,
          height: line.height,
          slots: line.slots.map((slot) => ({
            offset: slot.offset,
            left: contentLeft + slot.left,
            top: contentTop + paragraphCursorY + slot.top,
            height: slot.height,
          })),
        }));
        const linesBottom =
          lines.length > 0
            ? Math.max(...lines.map((line) => line.top + line.height))
            : contentTop + paragraphCursorY + 18;
        const paraTop = contentTop + paragraphCursorY;
        const paraHeight = Math.max(18, linesBottom - paraTop);
        entries.push({
          paragraph,
          lines,
          left: contentLeft,
          top: paraTop,
          width: contentWidthPx,
          height: paraHeight,
          rowIndex,
          cellIndex,
          tableId: table.id,
          anchorPosition,
        });
        paragraphCursorY += paraHeight + 4;
      }

      x += cellWidth;
    }

    y += rowHeight;
  }

  return entries;
}

function getCanvasPageElements(surface: HTMLElement): HTMLElement[] {
  const pages = Array.from(
    surface.querySelectorAll<HTMLElement>('[data-renderer="canvas"][data-page-index]'),
  );
  return pages.sort((a, b) => {
    const left = Number(a.dataset.pageIndex ?? "0");
    const right = Number(b.dataset.pageIndex ?? "0");
    return left - right;
  });
}

export function buildCanvasLayoutSnapshot(
  options: BuildCanvasLayoutSnapshotOptions,
): CanvasLayoutSnapshot | null {
  const { surface, state } = options;
  const layoutMode = options.layoutMode ?? "wordParity";
  const documentLayout = projectDocumentLayout(
    state.document,
    undefined,
    options.measuredBlockHeights,
    options.measuredParagraphLayouts,
    { layoutMode },
  );
  const canvasPages = getCanvasPageElements(surface);
  if (documentLayout.pages.length === 0 || canvasPages.length === 0) {
    return null;
  }

  const paragraphs = getDocumentParagraphs(state.document);
  const paragraphIndexById = new Map(
    paragraphs.map((paragraph, index) => [paragraph.id, index] as const),
  );
  const surfaceRect = surface.getBoundingClientRect();
  const snapshotPages: CanvasSnapshotPage[] = [];
  const snapshotParagraphs: CanvasSnapshotParagraph[] = [];

  for (const page of documentLayout.pages) {
    const pageElement =
      canvasPages.find(
        (candidate) => Number(candidate.dataset.pageIndex ?? "-1") === page.index,
      ) ?? null;
    if (!pageElement) {
      continue;
    }

    const pageRect = pageElement.getBoundingClientRect();
    const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
    const bodyBottom = page.bodyBottom ?? getPageBodyBottom(page.pageSettings);
    const snapshotPage: CanvasSnapshotPage = {
      index: page.index,
      left: pageRect.left,
      top: pageRect.top,
      width: pageRect.width,
      height: pageRect.height,
      bodyTop,
      bodyBottom,
    };
    snapshotPages.push(snapshotPage);

    const contentLeft =
      pageRect.left + page.pageSettings.margins.left + page.pageSettings.margins.gutter;
    const contentWidth = getPageContentWidth(page.pageSettings);

    const collectParagraphBlock = (
      zone: EditorEditingZone,
      blocks: typeof page.blocks,
      startTop: number,
    ) => {
      let cursorY = startTop;
      for (const block of blocks) {
        if (block.sourceBlock.type === "paragraph" && block.layout) {
          const paragraphNode = block.sourceBlock;
          const paragraphId = paragraphNode.id;
          snapshotParagraphs.push({
            paragraph: paragraphNode,
            paragraphId,
            paragraphIndex: paragraphIndexById.get(paragraphId) ?? 0,
            zone,
            pageIndex: page.index,
            startOffset: block.layout.startOffset ?? 0,
            endOffset: block.layout.endOffset ?? getParagraphText(paragraphNode).length,
            textLength: getParagraphText(paragraphNode).length,
            left: contentLeft,
            top: cursorY,
            width: contentWidth,
            height: Math.max(0, block.estimatedHeight),
            lines: block.layout.lines.map((line) => ({
              startOffset: line.startOffset,
              endOffset: line.endOffset,
              top: cursorY + line.top,
              height: line.height,
              slots: line.slots.map((slot) => ({
                offset: slot.offset,
                left: contentLeft + slot.left,
                top: cursorY + slot.top,
                height: slot.height,
              })),
            })),
          });
        } else if (block.sourceBlock.type === "table") {
          const tableCellLayouts = createTableCellLayouts(
            block.sourceBlock,
            state,
            page.index,
            layoutMode,
            contentLeft,
            cursorY,
            contentWidth,
            block.estimatedHeight,
          );
          for (const tableParagraph of tableCellLayouts) {
            const paragraphId = tableParagraph.paragraph.id;
            const textLength = getParagraphText(tableParagraph.paragraph).length;
            snapshotParagraphs.push({
              paragraph: tableParagraph.paragraph,
              paragraphId,
              paragraphIndex: paragraphIndexById.get(paragraphId) ?? 0,
              zone,
              pageIndex: page.index,
              startOffset: 0,
              endOffset: textLength,
              textLength,
              left: tableParagraph.left,
              top: tableParagraph.top,
              width: tableParagraph.width,
              height: tableParagraph.height,
              lines: tableParagraph.lines,
              tableCell: {
                tableId: tableParagraph.tableId,
                rowIndex: tableParagraph.rowIndex,
                cellIndex: tableParagraph.cellIndex,
                left: tableParagraph.left - 6,
                top: tableParagraph.top - 4,
                width: tableParagraph.width + 12,
                height: Math.max(18, tableParagraph.height + 8),
                anchorPosition: tableParagraph.anchorPosition,
              },
            });
          }
        }
        cursorY += Math.max(0, block.estimatedHeight);
      }
    };

    collectParagraphBlock("header", page.headerBlocks ?? [], pageRect.top);
    collectParagraphBlock("main", page.blocks, pageRect.top + bodyTop);
    collectParagraphBlock("footer", page.footerBlocks ?? [], pageRect.top + bodyBottom);
  }

  const paragraphsById = new Map<string, CanvasSnapshotParagraph[]>();
  for (const paragraph of snapshotParagraphs) {
    const current = paragraphsById.get(paragraph.paragraphId) ?? [];
    current.push(paragraph);
    paragraphsById.set(paragraph.paragraphId, current);
  }
  for (const [paragraphId, entries] of paragraphsById.entries()) {
    entries.sort((left, right) => {
      if (left.pageIndex !== right.pageIndex) return left.pageIndex - right.pageIndex;
      if (left.startOffset !== right.startOffset) return left.startOffset - right.startOffset;
      return left.top - right.top;
    });
    paragraphsById.set(paragraphId, entries);
  }

  return {
    surfaceRect,
    pages: snapshotPages,
    paragraphs: snapshotParagraphs,
    paragraphsById,
  };
}

