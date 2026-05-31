import type { Accessor } from "solid-js";
import type { EditorLayoutParagraph, EditorState } from "../../core/model.js";
import { resolveCanvasSurfaceHitAtPoint, type SurfaceHit } from "../canvas/CanvasHitTestService.js";
import { buildCanvasLayoutSnapshot } from "../canvas/CanvasLayoutSnapshot.js";
import { recordCanvasDebugHit, recordCanvasDebugLayoutSnapshot } from "../canvas/CanvasDebug.js";

type CanvasSnapshotCache = {
  snapshot: ReturnType<typeof buildCanvasLayoutSnapshot>;
  documentRef: EditorState["document"];
  measuredBlockHeightsRef: Record<string, number>;
  measuredParagraphLayoutsRef: Record<string, EditorLayoutParagraph>;
  layoutModeValue: "fast" | "wordParity";
  surfaceRef: HTMLDivElement;
  viewportScrollTop: number;
  viewportScrollLeft: number;
  surfaceClientWidth: number;
  surfaceClientHeight: number;
  windowWidth: number;
  windowHeight: number;
};

export function createCanvasSurfaceHitResolver(deps: {
  state: Accessor<EditorState>;
  surfaceRef: Accessor<HTMLDivElement | null>;
  viewportRef: Accessor<HTMLElement | null>;
  measuredBlockHeights: Accessor<Record<string, number>>;
  measuredParagraphLayouts: Accessor<Record<string, EditorLayoutParagraph>>;
  layoutMode: Accessor<"fast" | "wordParity">;
}) {
  let canvasSnapshotCache: CanvasSnapshotCache | null = null;

  const resolveSurfaceHitAtPoint = (
    clientX: number,
    clientY: number,
    _context: { forDrag?: boolean } = {},
  ): SurfaceHit | null => {
    const currentSurfaceRef = deps.surfaceRef();
    const currentViewportRef = deps.viewportRef();
    if (!currentSurfaceRef) return null;

    const currentMeasuredBlockHeights = deps.measuredBlockHeights();
    const currentMeasuredParagraphLayouts = deps.measuredParagraphLayouts();
    const currentLayoutMode = deps.layoutMode();
    const currentState = deps.state();
    const viewportScrollTop = currentViewportRef?.scrollTop ?? 0;
    const viewportScrollLeft = currentViewportRef?.scrollLeft ?? 0;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const shouldReuseSnapshot =
      canvasSnapshotCache &&
      canvasSnapshotCache.documentRef === currentState.document &&
      canvasSnapshotCache.measuredBlockHeightsRef === currentMeasuredBlockHeights &&
      canvasSnapshotCache.measuredParagraphLayoutsRef === currentMeasuredParagraphLayouts &&
      canvasSnapshotCache.layoutModeValue === currentLayoutMode &&
      canvasSnapshotCache.surfaceRef === currentSurfaceRef &&
      canvasSnapshotCache.viewportScrollTop === viewportScrollTop &&
      canvasSnapshotCache.viewportScrollLeft === viewportScrollLeft &&
      canvasSnapshotCache.surfaceClientWidth === currentSurfaceRef.clientWidth &&
      canvasSnapshotCache.surfaceClientHeight === currentSurfaceRef.clientHeight &&
      canvasSnapshotCache.windowWidth === windowWidth &&
      canvasSnapshotCache.windowHeight === windowHeight;
    const snapshot = shouldReuseSnapshot
      ? canvasSnapshotCache!.snapshot
      : buildCanvasLayoutSnapshot({
          surface: currentSurfaceRef,
          state: currentState,
          measuredBlockHeights: currentMeasuredBlockHeights,
          measuredParagraphLayouts: currentMeasuredParagraphLayouts,
          layoutMode: currentLayoutMode,
        });
    if (!shouldReuseSnapshot) {
      canvasSnapshotCache = {
        snapshot,
        documentRef: currentState.document,
        measuredBlockHeightsRef: currentMeasuredBlockHeights,
        measuredParagraphLayoutsRef: currentMeasuredParagraphLayouts,
        layoutModeValue: currentLayoutMode,
        surfaceRef: currentSurfaceRef,
        viewportScrollTop,
        viewportScrollLeft,
        surfaceClientWidth: currentSurfaceRef.clientWidth,
        surfaceClientHeight: currentSurfaceRef.clientHeight,
        windowWidth,
        windowHeight,
      };
    }
    recordCanvasDebugLayoutSnapshot(snapshot);
    if (!snapshot) {
      recordCanvasDebugHit(null);
      return null;
    }

    const hit = resolveCanvasSurfaceHitAtPoint({
      snapshot,
      state: currentState,
      clientX,
      clientY,
    });
    recordCanvasDebugHit(hit);
    return hit;
  };

  return {
    resolveSurfaceHitAtPoint,
  };
}
