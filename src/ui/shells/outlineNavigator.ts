import { getParagraphEntries } from "@/ui/canvas/CanvasGeometry.js";
import type {
  EditorLayoutDocument,
  EditorState,
} from "@/core/model.js";
import type { CanvasLayoutSnapshotProvider } from "@/ui/canvas/canvasLayoutSnapshotProvider.js";

/**
 * Scroll the outcome of an outline click into view using the canvas snapshot.
 * Shared between the composed shell and the bare editor surface.
 */
export function createOutlineNavigator(deps: {
  state: () => EditorState;
  documentLayout: () => EditorLayoutDocument;
  surfaceRef: () => HTMLDivElement | undefined;
  viewportRef: () => HTMLDivElement | undefined;
  zoomFactor?: () => number | undefined;
  snapshotProvider: CanvasLayoutSnapshotProvider;
}): (anchorId: string) => void {
  return (anchorId: string): void => {
    const surface = deps.surfaceRef();
    if (!surface) return;
    const snapshot = deps.snapshotProvider.getCanvasLayoutSnapshot({
      surface,
      state: deps.state(),
      documentLayout: deps.documentLayout(),
      zoomFactor: deps.zoomFactor?.(),
    });
    if (!snapshot) return;
    const entries = getParagraphEntries(snapshot, anchorId);
    const entry = entries[0];
    if (!entry) return;
    const viewport = deps.viewportRef();
    if (viewport) {
      const viewportRect = viewport.getBoundingClientRect();
      viewport.scrollTo({
        top: viewport.scrollTop + (entry.top - viewportRect.top) - 24,
        behavior: "smooth",
      });
      return;
    }
    window.scrollTo({
      top: window.scrollY + entry.top - 24,
      behavior: "smooth",
    });
  };
}
