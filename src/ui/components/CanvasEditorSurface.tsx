import {
  createEffect,
  createMemo,
  Index,
  For,
  on,
  onCleanup,
  Show,
} from "solid-js";
import type { EditorSurfaceProps } from "@/ui/editorUiTypes.js";
import {
  getPageColumnRects,
  type EditorLayoutPage,
  type EditorState,
} from "@/core/model.js";
import { buildSegmentTable } from "@/core/tableLayout.js";
import {
  clearNormalLineHeightCache,
  clearTextMeasureCache,
} from "@/ui/textMeasurement.js";
import { preloadLayoutFonts } from "@/text/fonts/FontMetricsProvider.js";
import { preciseFontModeVersion } from "@/text/fonts/preciseFontMode.js";
import { loadPreciseFontProgramsForFamilies } from "@/ui/app/localFontAccess.js";
import { collectPdfFontFamilies } from "@/export/pdf/fonts/collectPdfFontFamilies.js";
import { resolveMetricCompatibleFamily } from "@/export/pdf/fonts/officeFontAssets.js";
import {
  bumpLayoutMetricsEpoch,
  clearProjectedParagraphLayoutCache,
  layoutMetricsEpoch,
} from "@/layoutProjection/index.js";
import { resolveFloatingTableRect } from "@/layoutProjection/floatingObjects.js";
import {
  buildCanvasTableLayout,
  resolveCanvasTableWidth,
} from "@/ui/canvas/CanvasTableLayout.js";
import { createEditorLogger } from "@/utils/logger.js";
import { PageBreak } from "@/ui/components/PageBreak.js";
import {
  createCanvasPageRenderer,
  resolveCanvasFooterZoneTop,
} from "@/ui/canvas/canvasPageRenderer.js";
export { resolveCanvasTextRenderMetrics } from "@/ui/canvas/canvasParagraphPainter.js";
export { resolveCanvasFooterZoneTop } from "@/ui/canvas/canvasPageRenderer.js";

const surfaceLogger = createEditorLogger("canvas-surface");

function checkBrowserFonts(families: Array<string | null | undefined>) {
  if (typeof document === "undefined" || !document.fonts) {
    return { status: "unavailable", checks: [] };
  }
  return {
    status: document.fonts.status,
    checks: families.map((family) => {
      const requested = family ?? null;
      const metricFamily = resolveMetricCompatibleFamily(family);
      return {
        requested,
        metricFamily,
        normal: document.fonts.check(`400 14px "${metricFamily}"`),
        bold: document.fonts.check(`700 14px "${metricFamily}"`),
        italic: document.fonts.check(`400 italic 14px "${metricFamily}"`),
        boldItalic: document.fonts.check(`700 italic 14px "${metricFamily}"`),
      };
    }),
  };
}

export function CanvasEditorSurface(props: EditorSurfaceProps) {
  // In the browser, font advance-width metrics load asynchronously. Until they
  // resolve, measurement falls back to a heuristic; once they do, recompute the
  // layout with real metrics. This must react to the *current* document's font
  // set — not just the one present at mount — so that fonts introduced later
  // (e.g. Times New Roman from a DOCX import) get their metric bytes ingested
  // and their FontFace registered. In Node/tests metrics load synchronously, so
  // this simply settles with no visible change.
  // The set of families used by the document. collectPdfFontFamilies walks every
  // paragraph/run, so we gate the preload effect on a stable key derived from it
  // to avoid re-preloading on unrelated edits (e.g. typing).
  const documentFontFamilies = createMemo(() =>
    Array.from(collectPdfFontFamilies(props.state().document)),
  );
  const fontFamiliesKey = createMemo(() =>
    documentFontFamilies()
      .map((family) => family ?? "<default>")
      .join("|"),
  );
  createEffect(
    on([fontFamiliesKey, preciseFontModeVersion], () => {
      const families = documentFontFamilies();
      surfaceLogger.info("fonts:collect", {
        families,
        checksBefore: checkBrowserFonts(families),
      });
      void (async () => {
        await preloadLayoutFonts(families);
        // In precise font mode, also pull the real installed faces so the layout
        // engine measures with them (not just paints them) — this is what makes
        // page breaks match Word for fonts whose substitute is not actually
        // metric-compatible (e.g. Aptos).
        await loadPreciseFontProgramsForFamilies(families);
        clearTextMeasureCache();
        clearNormalLineHeightCache();
        clearProjectedParagraphLayoutCache();
        bumpLayoutMetricsEpoch();
        surfaceLogger.info("fonts:ready", {
          families,
          checksAfter: checkBrowserFonts(families),
        });
      })();
    }),
  );
  const documentLayout = createMemo(() => {
    const layout = props.documentLayout();
    surfaceLogger.debug("layout:projected", {
      layoutMetricsEpoch: layoutMetricsEpoch(),
      pages: layout.pages.length,
      firstPageBlocks: layout.pages[0]?.blocks.length ?? 0,
      firstPageBodyTop: layout.pages[0]?.bodyTop,
      firstPageBodyBottom: layout.pages[0]?.bodyBottom,
    });
    return layout;
  });

  return (
    <div
      class="oasis-editor-paper-stack oasis-editor-canvas-stack"
      style={{ position: "relative" }}
    >
      <Index each={documentLayout().pages}>
        {(page, index) => (
          // Each Index slot must be a single, stable root element. Returning a
          // Fragment (with a conditional <Show> sibling) confuses Solid's
          // reconcileArrays when the page list grows/shrinks (e.g. after
          // inserting an image that triggers re-pagination in a narrow viewport),
          // causing "Failed to execute 'insertBefore'" errors.
          <div
            class="oasis-editor-canvas-page-slot"
            style={{ position: "relative" }}
          >
            <Show when={index > 0}>
              <PageBreak pageIndex={index} />
            </Show>
            <CanvasPage
              page={page()}
              index={index}
              state={props.state()}
              paintGeneration={layoutMetricsEpoch()}
              onSurfaceMouseDown={props.onSurfaceMouseDown}
              onSurfaceClick={props.onSurfaceClick}
              onSurfaceMouseMove={props.onSurfaceMouseMove}
              onSurfaceDblClick={props.onSurfaceDblClick}
              onRevisionMouseEnter={props.onRevisionMouseEnter}
              onRevisionMouseLeave={props.onRevisionMouseLeave}
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
  paintGeneration: number;
  onSurfaceMouseDown: (event: MouseEvent) => void;
  onSurfaceClick?: (event: MouseEvent) => void;
  onSurfaceMouseMove?: (event: MouseEvent) => void;
  onSurfaceDblClick: (event: MouseEvent) => void;
  onRevisionMouseEnter: (revisionId: string, event: MouseEvent) => void;
  onRevisionMouseLeave?: (revisionId: string, event: MouseEvent) => void;
}) {
  let canvasRef: HTMLCanvasElement | undefined;
  const renderer = createCanvasPageRenderer({
    getCanvas: () => canvasRef,
    getPage: () => props.page,
    getState: () => props.state,
  });
  const revisionCells = createMemo(() => {
    const result: Array<{
      id: string;
      left: number;
      top: number;
      width: number;
      height: number;
    }> = [];
    let cursorY = props.page.bodyTop ?? props.page.pageSettings.margins.top;
    const columns = getPageColumnRects(props.page.pageSettings);
    for (const block of props.page.blocks) {
      if (block.sourceBlock.type === "table") {
        const column = columns[block.columnIndex ?? 0] ?? columns[0]!;
        const sourceTable = block.tableSegment
          ? buildSegmentTable(block.sourceBlock, block.tableSegment)
          : block.sourceBlock;
        let originX = column.left;
        let originY = cursorY;
        const floating = sourceTable.style?.floating;
        if (floating) {
          const rect = resolveFloatingTableRect({
            floating,
            pageSettings: props.page.pageSettings,
            contentLeft: column.left,
            contentTop:
              props.page.bodyTop ?? props.page.pageSettings.margins.top,
            contentWidth: column.width,
            anchorTop: cursorY,
            width: resolveCanvasTableWidth(sourceTable, column.width),
            height: block.floatingTableHeight ?? 1,
            pageIndex: props.page.index,
          });
          originX = rect.x;
          originY = rect.y + (block.floatingTableOffsetY ?? 0);
        }
        const layout = buildCanvasTableLayout({
          table: sourceTable,
          state: props.state,
          pageIndex: props.page.index,
          originX,
          originY,
          contentWidth: column.width,
          estimatedHeight: block.floatingTableHeight ?? block.estimatedHeight,
        });
        for (const cell of layout.cells) {
          if (!cell.revision) continue;
          result.push({
            id: cell.revision.id,
            left: cell.left,
            top: cell.top,
            width: cell.width,
            height: cell.height,
          });
        }
      }
      cursorY += Math.max(0, block.estimatedHeight);
    }
    return result;
  });

  createEffect(() => {
    props.page;
    props.state.document;
    props.paintGeneration;
    // Repaint glyphs when precise font mode toggles (real font vs. substitute).
    // Any relayout (when real metrics differ from the substitute) is driven by
    // the surface-level fonts effect bumping fontsGeneration; this just ensures
    // the page repaints even when the layout object is unchanged.
    preciseFontModeVersion();
    renderer.invalidatePage();
    renderer.schedulePaint();
  });

  createEffect(() => {
    props.state.showMargins;
    renderer.invalidateDecorations();
    renderer.schedulePaint();
  });

  createEffect(() => {
    props.state.showParagraphMarks;
    renderer.invalidateDecorations();
    renderer.schedulePaint();
  });

  createEffect(() => {
    props.state.activeZone;
    props.state.activeFootnoteId;
    renderer.invalidateActiveZone();
    renderer.schedulePaint();
  });

  onCleanup(() => renderer.dispose());

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
      <For each={revisionCells()}>
        {(revision) => (
          <div
            class="oasis-editor-table-revision-hit"
            data-revision-id={revision.id}
            style={{
              position: "absolute",
              left: `${revision.left}px`,
              top: `${revision.top}px`,
              width: `${revision.width}px`,
              height: `${revision.height}px`,
              "pointer-events": "auto",
              background: "transparent",
            }}
            onMouseEnter={(event) =>
              props.onRevisionMouseEnter(revision.id, event)
            }
            onMouseLeave={(event) =>
              props.onRevisionMouseLeave?.(revision.id, event)
            }
            onMouseDown={props.onSurfaceMouseDown}
          />
        )}
      </For>
    </div>
  );
}
