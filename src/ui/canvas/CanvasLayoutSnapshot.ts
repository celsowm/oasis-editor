import {
  getDocumentParagraphs,
  getPageBodyBottom,
  getPageBodyTop,
  getPageContentWidth,
  getPageColumnRects,
  getPageHeaderZoneTop,
  type EditorEditingZone,
} from "@/core/model.js";
import { FOOTNOTE_MARKER_GUTTER_PX } from "@/layoutProjection/index.js";
import {
  collectSnapshotParagraph,
  collectSnapshotTable,
  type SnapshotWalkContext,
} from "./canvasSnapshotWalkers.js";

import type {
  CanvasSnapshotParagraph,
  CanvasSnapshotInlineImage,
  CanvasSnapshotFloatingTextBox,
  CanvasSnapshotFloatingImage,
  CanvasSnapshotInlineTextBox,
  CanvasSnapshotFloatingTable,
  CanvasSnapshotPage,
  CanvasLayoutSnapshot,
  BuildCanvasLayoutSnapshotOptions,
} from "./canvasSnapshotTypes.js";
export type {
  ResolveTextBoxRenderHeight,
  CanvasSnapshotSlot,
  CanvasSnapshotLine,
  CanvasSnapshotTableCellInfo,
  CanvasSnapshotParagraph,
  CanvasSnapshotInlineImage,
  CanvasSnapshotFloatingTextBox,
  CanvasSnapshotFloatingImage,
  CanvasSnapshotInlineTextBox,
  CanvasSnapshotFloatingTable,
  CanvasSnapshotPage,
  CanvasLayoutSnapshot,
  BuildCanvasLayoutSnapshotOptions,
} from "./canvasSnapshotTypes.js";

function getCanvasPageElements(surface: HTMLElement): HTMLElement[] {
  const pages = Array.from(
    surface.querySelectorAll<HTMLElement>(
      '[data-renderer="canvas"][data-page-index]',
    ),
  );
  return pages.sort((a, b): number => {
    const left = Number(a.dataset.pageIndex ?? "0");
    const right = Number(b.dataset.pageIndex ?? "0");
    return left - right;
  });
}

/**
 * Coordinate contract ("screen-anchored local" space)
 * ----------------------------------------------------
 * The document layer (`.oasis-editor-editor-scroll-content`) is scaled with a
 * CSS `transform: scale(z)` and `transform-origin: top left`, so the layer's
 * local origin (0,0) maps to `surfaceRect.{left,top}` on screen and a child at
 * screen distance `d` from that origin sits at local `d / z`.
 *
 * Every coordinate in this snapshot is emitted as `surfaceRect.origin +
 * offsetLocal`, where `offsetLocal` is in unscaled (pre-transform) CSS px — the
 * same units the canvas draws in and the same units overlays use inside the
 * scaled layer. To achieve this we divide the only zoom-affected input (the page
 * element's `getBoundingClientRect`, which already reflects the transform) by
 * `z` relative to the surface origin; the model offsets added on top are already
 * unscaled. The result is invariant under zoom.
 *
 * Consumers:
 *  - Overlays (children of the scaled layer) use `value - surfaceRect` to get
 *    `offsetLocal` and let the transform do the visual scaling — no change.
 *  - Hit-testing receives screen-space pointer coords and converts them into
 *    this space at the single entry point (resolveCanvasSurfaceHitAtPoint).
 */
export function buildCanvasLayoutSnapshot(
  options: BuildCanvasLayoutSnapshotOptions,
): CanvasLayoutSnapshot | null {
  const { surface, state, documentLayout } = options;
  const zoomFactor =
    options.zoomFactor && options.zoomFactor > 0 ? options.zoomFactor : 1;
  const canvasPages = getCanvasPageElements(surface);
  if (documentLayout.pages.length === 0 || canvasPages.length === 0) {
    return null;
  }

  const paragraphs = getDocumentParagraphs(state.document);
  const paragraphIndexById = new Map(
    paragraphs.map(
      (paragraph, index): readonly [string, number] =>
        [paragraph.id, index] as const,
    ),
  );
  const surfaceRect = surface.getBoundingClientRect();
  const snapshotPages: CanvasSnapshotPage[] = [];
  const snapshotParagraphs: CanvasSnapshotParagraph[] = [];
  const inlineImages: CanvasSnapshotInlineImage[] = [];
  const floatingImages: CanvasSnapshotFloatingImage[] = [];
  const inlineTextBoxes: CanvasSnapshotInlineTextBox[] = [];
  const floatingTextBoxes: CanvasSnapshotFloatingTextBox[] = [];
  const floatingTables: CanvasSnapshotFloatingTable[] = [];
  const unsupportedRegions: CanvasLayoutSnapshot["unsupportedRegions"] = [];

  for (const page of documentLayout.pages) {
    const pageElement =
      canvasPages.find(
        (candidate): boolean =>
          Number(candidate.dataset.pageIndex ?? "-1") === page.index,
      ) ?? null;
    if (!pageElement) {
      continue;
    }

    // The DOM rect already reflects the CSS `transform: scale(z)`. Re-express it
    // in unscaled local space anchored at the surface origin so the model offsets
    // added downstream (which are unscaled) compose correctly. At z=1 this is a
    // no-op; see the coordinate contract above.
    const rawPageRect = pageElement.getBoundingClientRect();
    const pageRect = {
      left:
        surfaceRect.left + (rawPageRect.left - surfaceRect.left) / zoomFactor,
      top: surfaceRect.top + (rawPageRect.top - surfaceRect.top) / zoomFactor,
      width: rawPageRect.width / zoomFactor,
      height: rawPageRect.height / zoomFactor,
    };
    const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
    const bodyBottom = page.bodyBottom ?? getPageBodyBottom(page.pageSettings);
    const headerTop = page.headerTop ?? getPageHeaderZoneTop(page.pageSettings);
    const footerTop =
      page.footerTop ?? page.bodyBottom ?? getPageBodyBottom(page.pageSettings);
    const snapshotPage: CanvasSnapshotPage = {
      index: page.index,
      left: pageRect.left,
      top: pageRect.top,
      width: pageRect.width,
      height: pageRect.height,
      bodyTop,
      bodyBottom,
      footerTop,
      footnoteTop: page.footnoteTop,
      footnoteSeparatorTop: page.footnoteSeparatorTop,
    };
    snapshotPages.push(snapshotPage);

    const contentLeft =
      pageRect.left +
      page.pageSettings.margins.left +
      page.pageSettings.margins.gutter;
    const contentWidth = getPageContentWidth(page.pageSettings);

    const walkContext: SnapshotWalkContext = {
      state,
      page,
      pageRect,
      paragraphIndexById,
      snapshotParagraphs,
      inlineImages,
      floatingImages,
      inlineTextBoxes,
      floatingTextBoxes,
      floatingTables,
      unsupportedRegions,
    };

    const collectParagraphBlock = (
      zone: EditorEditingZone,
      blocks: typeof page.blocks,
      startTop: number,
      options: {
        footnoteId?: string;
        footnoteIdForBlock?: (
          block: (typeof page.blocks)[number],
        ) => string | undefined;
        contentLeft?: number;
        contentWidth?: number;
        blockGap?: number;
      } = {},
    ): void => {
      let cursorY = startTop;
      let blockContentLeft = options.contentLeft ?? contentLeft;
      let blockContentWidth = options.contentWidth ?? contentWidth;
      // Multi-column body: each block carries its column index; when it changes
      // we restart the vertical cursor at the body top and shift X to that
      // column's rect. All downstream geometry (caret slots, hit-testing,
      // images, tables) is derived from blockContentLeft/Width, so columns work
      // through this single placement change.
      const columnRects = getPageColumnRects(page.pageSettings);
      let lastColumnIndex: number | undefined;
      for (const block of blocks) {
        if (
          block.columnIndex !== undefined &&
          block.columnIndex !== lastColumnIndex
        ) {
          lastColumnIndex = block.columnIndex;
          const rect = columnRects[block.columnIndex] ?? columnRects[0]!;
          blockContentLeft = pageRect.left + rect.left;
          blockContentWidth = rect.width;
          cursorY = startTop;
        }
        const blockFootnoteId =
          options.footnoteIdForBlock?.(block) ?? options.footnoteId;
        const walkArgs = {
          zone,
          block,
          blockContentLeft,
          blockContentWidth,
          cursorY,
          startTop,
          blockFootnoteId,
        };
        if (block.sourceBlock.type === "paragraph" && block.layout) {
          collectSnapshotParagraph(walkContext, walkArgs);
        } else if (block.sourceBlock.type === "table") {
          collectSnapshotTable(walkContext, walkArgs);
        }
        cursorY += Math.max(0, block.estimatedHeight) + (options.blockGap ?? 0);
      }
    };

    collectParagraphBlock(
      "header",
      page.headerBlocks ?? [],
      pageRect.top + headerTop,
    );
    collectParagraphBlock("main", page.blocks, pageRect.top + bodyTop);
    if (page.footnoteBlocks && page.footnoteTop !== undefined) {
      const footnoteReferenceIds = page.footnoteReferenceIds ?? [];
      collectParagraphBlock(
        "footnote",
        page.footnoteBlocks,
        pageRect.top + page.footnoteTop,
        {
          footnoteIdForBlock: (block): string | undefined =>
            footnoteReferenceIds.find((footnoteId): boolean =>
              block.blockId.startsWith(`${footnoteId}:`),
            ),
          contentLeft: contentLeft + FOOTNOTE_MARKER_GUTTER_PX,
          contentWidth: Math.max(24, contentWidth - FOOTNOTE_MARKER_GUTTER_PX),
          blockGap: 2,
        },
      );
    }
    collectParagraphBlock(
      "footer",
      page.footerBlocks ?? [],
      pageRect.top + footerTop,
    );
  }

  const paragraphsById = new Map<string, CanvasSnapshotParagraph[]>();
  for (const paragraph of snapshotParagraphs) {
    const current = paragraphsById.get(paragraph.paragraphId) ?? [];
    current.push(paragraph);
    paragraphsById.set(paragraph.paragraphId, current);
  }
  for (const [paragraphId, entries] of paragraphsById.entries()) {
    entries.sort((left, right): number => {
      if (left.pageIndex !== right.pageIndex)
        return left.pageIndex - right.pageIndex;
      if (left.startOffset !== right.startOffset)
        return left.startOffset - right.startOffset;
      return left.top - right.top;
    });
    paragraphsById.set(paragraphId, entries);
  }

  return {
    surfaceRect,
    pages: snapshotPages,
    paragraphs: snapshotParagraphs,
    paragraphsById,
    inlineImages,
    floatingImages,
    inlineTextBoxes,
    floatingTextBoxes,
    floatingTables,
    unsupportedRegions,
  };
}
