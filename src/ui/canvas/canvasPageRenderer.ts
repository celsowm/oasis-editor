import type {
  EditorEditingZone,
  EditorLayoutPage,
  EditorState,
} from "@/core/model.js";
import {
  getPageBodyBottom,
  getPageBodyTop,
  getPageContentWidth,
  getPageColumnRects,
  getPageHeaderZoneTop,
} from "@/core/model.js";
import {
  renderBlockList,
  renderFootnoteBlockList,
} from "./canvasBlockPainter.js";

export function resolveCanvasFooterZoneTop(
  page: Pick<EditorLayoutPage, "pageSettings" | "bodyTop" | "footerTop">,
): number {
  const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
  const staticBodyBottom = getPageBodyBottom(page.pageSettings);
  const footerContentTop = page.footerTop ?? staticBodyBottom;
  return Math.max(bodyTop, Math.min(staticBodyBottom, footerContentTop));
}

type CanvasGetter = () => HTMLCanvasElement | undefined;
type PageGetter = () => EditorLayoutPage;
type StateGetter = () => EditorState;

export function createCanvasPageRenderer(options: {
  getCanvas: CanvasGetter;
  getPage: PageGetter;
  getState: StateGetter;
}) {
  let lastPaintedPage: EditorLayoutPage | undefined;
  let lastStyles: unknown;
  let lastShowMargins: boolean | undefined;
  let lastShowParagraphMarks: boolean | undefined;
  let lastActiveZone: EditorEditingZone | undefined;
  let lastActiveFootnoteId: string | undefined;
  let lastWidth = 0;
  let lastHeight = 0;
  let lastDpr = 0;
  let rafHandle: number | null = null;

  const schedulePaint = (): void => {
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(paint);
  };

  const invalidatePage = (): void => {
    lastPaintedPage = undefined;
  };

  const invalidateDecorations = (): void => {
    lastShowMargins = undefined;
    lastShowParagraphMarks = undefined;
  };

  const invalidateActiveZone = (): void => {
    lastActiveZone = undefined;
    lastActiveFootnoteId = undefined;
  };

  const paint = (): void => {
    rafHandle = null;
    const canvas = options.getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const page = options.getPage();
    const state = options.getState();
    const styles = state.document.styles;
    const showMargins = state.showMargins;
    const showParagraphMarks = state.showParagraphMarks;
    const activeZone = state.activeZone ?? "main";
    const activeFootnoteId = state.activeFootnoteId;
    if (
      page === lastPaintedPage &&
      styles === lastStyles &&
      showMargins === lastShowMargins &&
      showParagraphMarks === lastShowParagraphMarks &&
      activeZone === lastActiveZone &&
      activeFootnoteId === lastActiveFootnoteId
    ) {
      return;
    }
    lastPaintedPage = page;
    lastStyles = styles;
    lastShowMargins = showMargins;
    lastShowParagraphMarks = showParagraphMarks;
    lastActiveZone = activeZone;
    lastActiveFootnoteId = activeFootnoteId;

    const dpr = window.devicePixelRatio || 1;
    const width = page.pageSettings.width;
    const height = page.pageSettings.height;
    if (lastWidth !== width || lastHeight !== height || lastDpr !== dpr) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      lastWidth = width;
      lastHeight = height;
      lastDpr = dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const marginX =
      page.pageSettings.margins.left + page.pageSettings.margins.gutter;
    const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
    const headerTop = page.headerTop ?? getPageHeaderZoneTop(page.pageSettings);
    const footerTop =
      page.footerTop ?? page.bodyBottom ?? getPageBodyBottom(page.pageSettings);
    const footerZoneTop = resolveCanvasFooterZoneTop(page);
    const bodyWidth = getPageContentWidth(page.pageSettings);
    const zoneBodyBottom = page.bodyBottom ?? height;
    const onUpdate = (): void => {
      invalidatePage();
      schedulePaint();
    };

    if (activeZone === "main") {
      ctx.save();
      ctx.fillStyle = "rgba(148, 163, 184, 0.08)";
      if (bodyTop > 0) {
        ctx.fillRect(0, 0, width, bodyTop);
      }
      if (footerZoneTop < height) {
        ctx.fillRect(0, footerZoneTop, width, height - footerZoneTop);
      }
      ctx.restore();
    }

    const columns = page.pageSettings.columns;
    const columnRects =
      columns && columns.count > 1
        ? getPageColumnRects(page.pageSettings)
        : null;

    if (state.showMargins) {
      const contentHeight = Math.max(24, Math.floor(zoneBodyBottom - bodyTop));
      ctx.save();
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      if (columnRects) {
        for (const rect of columnRects) {
          ctx.strokeRect(rect.left, bodyTop, rect.width, contentHeight);
        }
      } else {
        ctx.strokeRect(marginX, bodyTop, bodyWidth, contentHeight);
      }
      ctx.restore();
    }

    // Vertical rule between columns (`w:sep`).
    if (columnRects && columns?.separator) {
      const contentHeight = Math.max(24, Math.floor(zoneBodyBottom - bodyTop));
      ctx.save();
      ctx.strokeStyle = "#9ca3af";
      ctx.lineWidth = 1;
      for (let i = 0; i < columnRects.length - 1; i += 1) {
        const rect = columnRects[i]!;
        const next = columnRects[i + 1]!;
        const ruleX =
          Math.round((rect.left + rect.width + next.left) / 2) + 0.5;
        ctx.beginPath();
        ctx.moveTo(ruleX, bodyTop);
        ctx.lineTo(ruleX, bodyTop + contentHeight);
        ctx.stroke();
      }
      ctx.restore();
    }

    const inHeaderFooterMode =
      activeZone === "header" || activeZone === "footer";
    const bodyAlpha = inHeaderFooterMode || activeZone === "footnote" ? 0.5 : 1;
    const headerAlpha =
      activeZone === "main" ? 0.42 : activeZone === "header" ? 1 : 0.42;
    const footerAlpha =
      activeZone === "main" ? 0.42 : activeZone === "footer" ? 1 : 0.42;
    const footnoteAlpha =
      activeZone === "footnote" ? 1 : activeZone === "main" ? 0.86 : 0.42;

    ctx.save();
    ctx.globalAlpha = headerAlpha;
    renderBlockList(
      ctx,
      state,
      page.headerBlocks ?? [],
      marginX,
      headerTop,
      bodyWidth,
      page.index,
      onUpdate,
      page.pageSettings,
    );
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = bodyAlpha;
    if (columnRects && page.blocks.some((b): boolean => b.columnIndex !== undefined)) {
      // Newspaper columns: paint each column's blocks from the body top at its
      // own X/width. renderBlockList accumulates its cursor from originY per
      // call, so per-column invocation restarts each column at the top.
      const byColumn = new Map<number, typeof page.blocks>();
      for (const block of page.blocks) {
        const column = block.columnIndex ?? 0;
        const bucket = byColumn.get(column) ?? [];
        bucket.push(block);
        byColumn.set(column, bucket);
      }
      for (const [column, columnBlocks] of byColumn) {
        const rect = columnRects[column] ?? columnRects[0]!;
        renderBlockList(
          ctx,
          state,
          columnBlocks,
          rect.left,
          bodyTop,
          rect.width,
          page.index,
          onUpdate,
          page.pageSettings,
        );
      }
    } else {
      renderBlockList(
        ctx,
        state,
        page.blocks,
        marginX,
        bodyTop,
        bodyWidth,
        page.index,
        onUpdate,
        page.pageSettings,
      );
    }
    ctx.restore();

    if (
      page.footnoteBlocks &&
      page.footnoteBlocks.length > 0 &&
      page.footnoteTop !== undefined
    ) {
      ctx.save();
      ctx.globalAlpha = footnoteAlpha;
      const clipTop = page.footnoteSeparatorTop ?? page.footnoteTop;
      const clipBottom = Math.max(clipTop, footerZoneTop);
      ctx.beginPath();
      ctx.rect(0, clipTop, width, clipBottom - clipTop);
      ctx.clip();
      if (page.footnoteSeparatorTop !== undefined) {
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(marginX, page.footnoteSeparatorTop + 0.5);
        ctx.lineTo(
          marginX + Math.min(180, bodyWidth * 0.35),
          page.footnoteSeparatorTop + 0.5,
        );
        ctx.stroke();
      }
      renderFootnoteBlockList(
        ctx,
        state,
        page.footnoteBlocks,
        page.footnoteReferenceIds ?? [],
        marginX,
        page.footnoteTop,
        bodyWidth,
        page.index,
        onUpdate,
      );
      ctx.restore();
    }

    if (page.bodyBottom !== undefined) {
      ctx.save();
      ctx.globalAlpha = footerAlpha;
      renderBlockList(
        ctx,
        state,
        page.footerBlocks ?? [],
        marginX,
        footerTop,
        bodyWidth,
        page.index,
        onUpdate,
        page.pageSettings,
      );
      ctx.restore();
    }

    if (activeZone !== "main") {
      ctx.save();
      ctx.strokeStyle = "rgba(71, 85, 105, 0.55)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      const guideLeft = Math.max(0, marginX - 10);
      const guideRight = Math.min(width, marginX + bodyWidth + 10);
      ctx.beginPath();
      ctx.moveTo(guideLeft, bodyTop + 0.5);
      ctx.lineTo(guideRight, bodyTop + 0.5);
      ctx.moveTo(guideLeft, zoneBodyBottom + 0.5);
      ctx.lineTo(guideRight, zoneBodyBottom + 0.5);
      ctx.stroke();
      ctx.restore();
    }
  };

  return {
    schedulePaint,
    invalidatePage,
    invalidateDecorations,
    invalidateActiveZone,
    dispose(): void {
      if (rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
    },
  };
}
