import {
  getDocumentParagraphs,
  getPageBodyBottom,
  getPageBodyTop,
  getPageContentWidth,
  getParagraphText,
  type EditorEditingZone,
  type EditorLayoutParagraph,
  type EditorParagraphNode,
  type EditorPosition,
  type EditorState,
} from "../../core/model.js";
import { projectDocumentLayout } from "../layoutProjection.js";
import { buildCanvasTableLayout, type CanvasUnsupportedReason } from "./CanvasTableLayout.js";

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
  unsupportedRegions: Array<{
    pageIndex: number;
    zone: EditorEditingZone;
    left: number;
    top: number;
    width: number;
    height: number;
    reason: CanvasUnsupportedReason;
  }>;
}

export interface BuildCanvasLayoutSnapshotOptions {
  surface: HTMLElement;
  state: EditorState;
  measuredBlockHeights?: Record<string, number>;
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>;
  layoutMode?: "fast" | "wordParity";
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
  const unsupportedRegions: CanvasLayoutSnapshot["unsupportedRegions"] = [];

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
          const tableLayout = buildCanvasTableLayout({
            table: block.sourceBlock,
            state,
            pageIndex: page.index,
            layoutMode,
            originX: contentLeft,
            originY: cursorY,
            contentWidth,
            estimatedHeight: block.estimatedHeight,
          });
          for (const reason of tableLayout.unsupported) {
            unsupportedRegions.push({
              pageIndex: page.index,
              zone,
              left: tableLayout.left,
              top: tableLayout.top,
              width: tableLayout.width,
              height: tableLayout.height,
              reason,
            });
          }
          for (const cell of tableLayout.cells) {
            for (const paragraphLayout of cell.paragraphs) {
              const paragraphId = paragraphLayout.paragraph.id;
              const textLength = getParagraphText(paragraphLayout.paragraph).length;
              snapshotParagraphs.push({
                paragraph: paragraphLayout.paragraph,
              paragraphId,
              paragraphIndex: paragraphIndexById.get(paragraphId) ?? 0,
              zone,
              pageIndex: page.index,
              startOffset: 0,
              endOffset: textLength,
              textLength,
              left: paragraphLayout.originX,
              top: paragraphLayout.originY,
              width: paragraphLayout.width,
              height: paragraphLayout.height,
              lines: paragraphLayout.lines.map((line) => ({
                startOffset: line.startOffset,
                endOffset: line.endOffset,
                top: paragraphLayout.originY + line.top,
                height: line.height,
                slots: line.slots.map((slot) => ({
                  offset: slot.offset,
                  left: paragraphLayout.originX + slot.left,
                  top: paragraphLayout.originY + slot.top,
                  height: slot.height,
                })),
              })),
              tableCell: {
                tableId: cell.tableId,
                rowIndex: cell.rowIndex,
                cellIndex: cell.cellIndex,
                left: cell.left,
                top: cell.top,
                width: cell.width,
                height: cell.height,
                anchorPosition: cell.anchorPosition,
              },
              });
            }
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
    unsupportedRegions,
  };
}
