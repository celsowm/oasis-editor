import {
  createEffect,
  createMemo,
  createSignal,
  Index,
  on,
  onCleanup,
  Show,
} from "solid-js";
import type { ITextMeasurer } from "../../core/engine.js";
import type { EditorSurfaceProps } from "../editorUiTypes.js";
import { type EditorLayoutPage, type EditorState } from "../../core/model.js";
import { clearTextMeasureCache, domTextMeasurer } from "../textMeasurement.js";
import { preloadLayoutFonts } from "../../text/fonts/FontMetricsProvider.js";
import { collectPdfFontFamilies } from "../../export/pdf/fonts/collectPdfFontFamilies.js";
import { resolveMetricCompatibleFamily } from "../../export/pdf/fonts/officeFontAssets.js";
import {
  clearProjectedParagraphLayoutCache,
  projectDocumentLayout,
} from "../../layoutProjection/index.js";
import { createEditorLogger } from "../../utils/logger.js";
import { createLayoutIdentityStabilizer } from "../layoutIdentity.js";
import { PageBreak } from "../components/PageBreak.js";
import {
  createCanvasPageRenderer,
  resolveCanvasFooterZoneTop,
} from "../canvas/canvasPageRenderer.js";
export { resolveCanvasTextRenderMetrics } from "../canvas/canvasParagraphPainter.js";
export { resolveCanvasFooterZoneTop } from "../canvas/canvasPageRenderer.js";

const canvasTextMeasurer: ITextMeasurer = {
  composeMeasuredParagraphLines: (options) =>
    domTextMeasurer.composeMeasuredParagraphLines(options),
  resolveRenderedLineHeightPx: (styles, lineHeightMultiple) =>
    domTextMeasurer.resolveRenderedLineHeightPx(styles, lineHeightMultiple),
};
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
  // Preserves object identity for unchanged pages/blocks across re-projections.
  // Without this, every state change produces brand-new page objects and every
  // CanvasPage repaints — even pages the user did not touch.
  const stabilize = createLayoutIdentityStabilizer();
  // In the browser, font advance-width metrics load asynchronously. Until they
  // resolve, measurement falls back to a heuristic; once they do, recompute the
  // layout with real metrics. This must react to the *current* document's font
  // set — not just the one present at mount — so that fonts introduced later
  // (e.g. Times New Roman from a DOCX import) get their metric bytes ingested
  // and their FontFace registered. In Node/tests metrics load synchronously, so
  // this simply settles with no visible change.
  const [fontsGeneration, setFontsGeneration] = createSignal(0);
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
    on(fontFamiliesKey, () => {
      const families = documentFontFamilies();
      surfaceLogger.info("fonts:collect", {
        families,
        checksBefore: checkBrowserFonts(families),
      });
      void preloadLayoutFonts(families).then(() => {
        clearTextMeasureCache();
        clearProjectedParagraphLayoutCache();
        surfaceLogger.info("fonts:ready", {
          families,
          checksAfter: checkBrowserFonts(families),
        });
        setFontsGeneration((generation) => generation + 1);
      });
    }),
  );
  const documentLayout = createMemo(() => {
    const generation = fontsGeneration(); // recompute once real font metrics become available
    const layout = stabilize(
      projectDocumentLayout(
        props.state().document,
        undefined,
        props.measuredBlockHeights?.(),
        props.measuredParagraphLayouts?.(),
        {
          measurer: canvasTextMeasurer,
        },
      ),
    );
    surfaceLogger.debug("layout:projected", {
      fontsGeneration: generation,
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
              paintGeneration={fontsGeneration()}
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
  paintGeneration: number;
  onSurfaceMouseDown: (event: MouseEvent) => void;
  onSurfaceClick?: (event: MouseEvent) => void;
  onSurfaceMouseMove?: (event: MouseEvent) => void;
  onSurfaceDblClick: (event: MouseEvent) => void;
}) {
  let canvasRef: HTMLCanvasElement | undefined;
  const renderer = createCanvasPageRenderer({
    getCanvas: () => canvasRef,
    getPage: () => props.page,
    getState: () => props.state,
  });

  createEffect(() => {
    props.page;
    props.state.document;
    props.paintGeneration;
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
    </div>
  );
}
