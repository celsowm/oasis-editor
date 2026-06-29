import type { Accessor } from "solid-js";
import type { EditorLayoutDocument, EditorState } from "@/core/model.js";
import {
  resolveCanvasSurfaceHitAtPoint,
  type SurfaceHit,
} from "@/ui/canvas/CanvasHitTestService.js";
import type { CanvasLayoutSnapshotProvider } from "@/ui/canvas/canvasLayoutSnapshotProvider.js";
import {
  recordCanvasDebugHit,
  recordCanvasDebugLayoutSnapshot,
} from "@/ui/canvas/CanvasDebug.js";

export function createCanvasSurfaceHitResolver(deps: {
  state: Accessor<EditorState>;
  surfaceRef: Accessor<HTMLDivElement | null>;
  viewportRef: Accessor<HTMLElement | null>;
  documentLayout: Accessor<EditorLayoutDocument>;
  canvasSnapshotProvider: CanvasLayoutSnapshotProvider;
  zoomFactor: Accessor<number>;
}): {
  resolveSurfaceHitAtPoint: (
    clientX: number,
    clientY: number,
    context?: { forDrag?: boolean; pierce?: boolean },
  ) => SurfaceHit | null;
} {
  return createCanvasSurfaceHitResolverImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createCanvasSurfaceHitResolverImpl(deps: {
  state: Accessor<EditorState>;
  surfaceRef: Accessor<HTMLDivElement | null>;
  viewportRef: Accessor<HTMLElement | null>;
  documentLayout: Accessor<EditorLayoutDocument>;
  canvasSnapshotProvider: CanvasLayoutSnapshotProvider;
  zoomFactor: Accessor<number>;
}) {
  const resolveSurfaceHitAtPoint = (
    clientX: number,
    clientY: number,
    context: { forDrag?: boolean; pierce?: boolean } = {},
  ): SurfaceHit | null => {
    const currentSurfaceRef = deps.surfaceRef();
    if (!currentSurfaceRef) return null;

    const currentState = deps.state();
    const zoomFactor = deps.zoomFactor();
    const snapshot = deps.canvasSnapshotProvider.getCanvasLayoutSnapshot({
      surface: currentSurfaceRef,
      state: currentState,
      documentLayout: deps.documentLayout(),
      zoomFactor,
    });
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
      pierce: context.pierce ?? false,
      zoomFactor,
    });
    recordCanvasDebugHit(hit);
    return hit;
  };

  return {
    resolveSurfaceHitAtPoint,
  };
}
