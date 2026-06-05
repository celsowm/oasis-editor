import { createEffect, createMemo, Index, onCleanup, Show } from "solid-js";
import type { ITextMeasurer } from "../../core/engine.js";
import type { EditorSurfaceProps } from "../editorUiTypes.js";
import { type EditorLayoutPage, type EditorState } from "../../core/model.js";
import { domTextMeasurer } from "../textMeasurement.js";
import { projectDocumentLayout } from "../../layoutProjection/index.js";
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
        {
          layoutMode: props.layoutMode ?? "wordParity",
          measurer: canvasTextMeasurer,
        },
      ),
    ),
  );

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
  const renderer = createCanvasPageRenderer({
    getCanvas: () => canvasRef,
    getPage: () => props.page,
    getState: () => props.state,
  });

  createEffect(() => {
    props.page;
    props.state.document;
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
