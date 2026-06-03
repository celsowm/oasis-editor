import { createEffect, createMemo, Index, Show } from "solid-js";
import type { ITextMeasurer } from "../../core/engine.js";
import type { EditorSurfaceProps } from "../editorUiTypes.js";
import {
  type EditorDocument,
  type EditorEditingZone,
  type EditorLayoutBlock,
  type EditorLayoutLine,
  type EditorLayoutPage,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableNode,
  getPageBodyTop,
  getPageBodyBottom,
  getPageContentWidth,
  getPageHeaderZoneTop,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
  resolveImageSrc,
} from "../../core/model.js";
import { buildSegmentTable } from "../../core/tableLayout.js";
import { domTextMeasurer } from "../textMeasurement.js";
import { projectDocumentLayout } from "../../layoutProjection/index.js";
import { createLayoutIdentityStabilizer } from "../layoutIdentity.js";
import { PageBreak } from "../components/PageBreak.js";
import { renderBlockList, renderFootnoteBlockList } from "../canvas/canvasBlockPainter.js";
export { resolveCanvasTextRenderMetrics } from "../canvas/canvasParagraphPainter.js";

const canvasTextMeasurer: ITextMeasurer = {
  composeMeasuredParagraphLines: (options) => domTextMeasurer.composeMeasuredParagraphLines(options),
  resolveRenderedLineHeightPx: (styles, lineHeightMultiple) =>
    domTextMeasurer.resolveRenderedLineHeightPx(styles, lineHeightMultiple),
};

export function resolveCanvasFooterZoneTop(
  page: Pick<EditorLayoutPage, "pageSettings" | "bodyTop" | "footerTop">,
): number {
  const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
  const staticBodyBottom = getPageBodyBottom(page.pageSettings);
  const footerContentTop = page.footerTop ?? staticBodyBottom;
  return Math.max(bodyTop, Math.min(staticBodyBottom, footerContentTop));
}

export function CanvasEditorSurface(props: EditorSurfaceProps) {
  // Preserves object identity for unchanged pages/blocks across re-projections.
  // Without this, every state change produces brand-new page objects and every
  // CanvasPage repaints — even pages the user did not touch.
  const stabilize = createLayoutIdentityStabilizer();
  const documentLayout = createMemo(() =>
    stabilize(
      projectDocumentLayout(
        props.state().document,
        undefined,
        props.measuredBlockHeights?.(),
        props.measuredParagraphLayouts?.(),
        { layoutMode: props.layoutMode ?? "wordParity", measurer: canvasTextMeasurer },
      ),
    ),
  );

  return (
    <div class="oasis-editor-paper-stack oasis-editor-canvas-stack" style={{ position: "relative" }}>
      <Index each={documentLayout().pages}>
        {(page, index) => (
          // Each Index slot must be a single, stable root element. Returning a
          // Fragment (with a conditional <Show> sibling) confuses Solid's
          // reconcileArrays when the page list grows/shrinks (e.g. after
          // inserting an image that triggers re-pagination in a narrow viewport),
          // causing "Failed to execute 'insertBefore'" errors.
          <div class="oasis-editor-canvas-page-slot" style={{ position: "relative" }}>
            <Show when={index > 0}>
              <PageBreak pageIndex={index} />
            </Show>
            <CanvasPage
              page={page()}
              index={index}
              state={props.state()}
              onSurfaceMouseDown={props.onSurfaceMouseDown}
              onSurfaceClick={props.onSurfaceClick}
              onSurfaceMouseMove={props.onSurfaceMouseMove}
              onSurfaceDblClick={props.onSurfaceDblClick}
            />
          </div>
        )}
      </Index>
    </div>
  );
}

function CanvasPage(props: {
  page: EditorLayoutPage;
  index: number;
  state: EditorState;
  onSurfaceMouseDown: (event: MouseEvent) => void;
  onSurfaceClick?: (event: MouseEvent) => void;
  onSurfaceMouseMove?: (event: MouseEvent) => void;
  onSurfaceDblClick: (event: MouseEvent) => void;
}) {
  let canvasRef: HTMLCanvasElement | undefined;
  // Skip repaints when neither the projected page nor the document styles
  // (which drive resolved text rendering) actually changed. The Solid
  // reactive system would otherwise re-run this effect for every page on
  // every keystroke.
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

  const paint = () => {
    rafHandle = null;
    const canvas = canvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const page = props.page;
    const state = props.state;
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

    const marginX = page.pageSettings.margins.left + page.pageSettings.margins.gutter;
    const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
    const headerTop = page.headerTop ?? getPageHeaderZoneTop(page.pageSettings);
    const footerTop = page.footerTop ?? page.bodyBottom ?? getPageBodyBottom(page.pageSettings);
    const footerZoneTop = resolveCanvasFooterZoneTop(page);
    const bodyWidth = getPageContentWidth(page.pageSettings);
    const zoneBodyBottom = page.bodyBottom ?? height;

    if (activeZone === "main") {
      // Word-like idle hint: paint the non-body regions as a background so
      // header/footer/footnote text is not washed out by an overlay.
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

    if (state.showMargins) {
      const contentHeight = Math.max(24, Math.floor(zoneBodyBottom - bodyTop));
      ctx.save();
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(marginX, bodyTop, bodyWidth, contentHeight);
      ctx.restore();
    }

    const inHeaderFooterMode = activeZone === "header" || activeZone === "footer";
    const bodyAlpha = inHeaderFooterMode || activeZone === "footnote" ? 0.5 : 1;
    const headerAlpha = activeZone === "main" ? 0.42 : activeZone === "header" ? 1 : 0.42;
    const footerAlpha = activeZone === "main" ? 0.42 : activeZone === "footer" ? 1 : 0.42;
    const footnoteAlpha = activeZone === "footnote" ? 1 : activeZone === "main" ? 0.86 : 0.42;

    ctx.save();
    ctx.globalAlpha = headerAlpha;
    renderBlockList(ctx, state, page.headerBlocks ?? [], marginX, headerTop, bodyWidth, page.index, () => {
      lastPaintedPage = undefined;
      rafHandle = requestAnimationFrame(paint);
    });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = bodyAlpha;
    renderBlockList(ctx, state, page.blocks, marginX, bodyTop, bodyWidth, page.index, () => {
      lastPaintedPage = undefined;
      rafHandle = requestAnimationFrame(paint);
    });
    ctx.restore();

    if (page.footnoteBlocks && page.footnoteBlocks.length > 0 && page.footnoteTop !== undefined) {
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
        ctx.lineTo(marginX + Math.min(180, bodyWidth * 0.35), page.footnoteSeparatorTop + 0.5);
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
        () => {
          lastPaintedPage = undefined;
          rafHandle = requestAnimationFrame(paint);
        },
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
        () => {
          lastPaintedPage = undefined;
          rafHandle = requestAnimationFrame(paint);
        },
      );
      ctx.restore();
    }

    if (activeZone !== "main") {
      // Word-like editing mode guides for header/footer.
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

  createEffect(() => {
    // Track reactive dependencies eagerly, then defer the actual paint to a
    // single requestAnimationFrame so multiple synchronous state updates
    // coalesce into one repaint per page.
    props.page;
    props.state.document;
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(paint);
  });

  // showMargins toggle doesn't change page/styles, so we need a dedicated
  // effect that forces an immediate repaint bypassing the RAF deduplication.
  createEffect(() => {
    // Reading showMargins here creates the reactive dependency.
    const _ = props.state.showMargins;
    // Reset the cache so paint() does not short-circuit.
    lastShowMargins = undefined;
    lastShowParagraphMarks = undefined;
    // Cancel any pending RAF and repaint synchronously on next frame.
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    rafHandle = requestAnimationFrame(paint);
  });

  createEffect(() => {
    const _ = props.state.showParagraphMarks;
    lastShowParagraphMarks = undefined;
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    rafHandle = requestAnimationFrame(paint);
  });

  createEffect(() => {
    const _ = props.state.activeZone;
    const __ = props.state.activeFootnoteId;
    void __;
    lastActiveZone = undefined;
    lastActiveFootnoteId = undefined;
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    rafHandle = requestAnimationFrame(paint);
  });

  return (
    <div
      class="oasis-editor-paper"
      data-renderer="canvas"
      data-page-index={props.index}
      data-testid="editor-page"
      style={{
        position: "relative",
        "z-index": 1,
        width: `${props.page.pageSettings.width}px`,
        "min-height": `${props.page.pageSettings.height}px`,
      }}
      onMouseDown={props.onSurfaceMouseDown}
      onClick={props.onSurfaceClick}
      onMouseMove={props.onSurfaceMouseMove}
      onDblClick={props.onSurfaceDblClick}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}


