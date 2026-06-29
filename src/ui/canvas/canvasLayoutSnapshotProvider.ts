import type { EditorLayoutDocument, EditorState } from "@/core/model.js";
import { buildCanvasLayoutSnapshot } from "./CanvasLayoutSnapshot.js";
import { roundTo } from "@/utils/round.js";
import type { CanvasLayoutSnapshot } from "./canvasSnapshotTypes.js";

export interface CanvasLayoutSnapshotProvider {
  getCanvasLayoutSnapshot(options: {
    surface: HTMLElement;
    state: EditorState;
    documentLayout: EditorLayoutDocument;
    zoomFactor?: number;
  }): CanvasLayoutSnapshot | null;
  clear(): void;
}

type SnapshotCacheEntry = {
  surface: HTMLElement;
  documentLayout: EditorLayoutDocument;
  zoomFactor: number;
  domRectSignature: string;
  snapshot: CanvasLayoutSnapshot | null;
};

function rounded(value: number): number {
  return roundTo(value, 2);
}

export function getCanvasPageRectSignature(surface: HTMLElement): string {
  const surfaceRect = surface.getBoundingClientRect();
  const pages = Array.from(
    surface.querySelectorAll<HTMLElement>(
      '[data-renderer="canvas"][data-page-index]',
    ),
  ).sort((left, right) => {
    return (
      Number(left.dataset.pageIndex ?? "0") -
      Number(right.dataset.pageIndex ?? "0")
    );
  });
  const parts = [
    "surface",
    rounded(surfaceRect.left),
    rounded(surfaceRect.top),
    rounded(surfaceRect.width),
    rounded(surfaceRect.height),
  ];
  for (const page of pages) {
    const rect = page.getBoundingClientRect();
    parts.push(
      Number(page.dataset.pageIndex ?? "0"),
      rounded(rect.left),
      rounded(rect.top),
      rounded(rect.width),
      rounded(rect.height),
    );
  }
  return parts.join(":");
}

export function createCanvasLayoutSnapshotProvider(): CanvasLayoutSnapshotProvider {
  let cache: SnapshotCacheEntry | null = null;

  const getCanvasLayoutSnapshot: CanvasLayoutSnapshotProvider["getCanvasLayoutSnapshot"] =
    (options) => {
      const zoomFactor =
        options.zoomFactor && options.zoomFactor > 0 ? options.zoomFactor : 1;
      const domRectSignature = getCanvasPageRectSignature(options.surface);
      if (
        cache &&
        cache.surface === options.surface &&
        cache.documentLayout === options.documentLayout &&
        cache.zoomFactor === zoomFactor &&
        cache.domRectSignature === domRectSignature
      ) {
        return cache.snapshot;
      }

      const snapshot = buildCanvasLayoutSnapshot({
        surface: options.surface,
        state: options.state,
        documentLayout: options.documentLayout,
        zoomFactor,
      });
      cache = {
        surface: options.surface,
        documentLayout: options.documentLayout,
        zoomFactor,
        domRectSignature,
        snapshot,
      };
      return snapshot;
    };

  return {
    getCanvasLayoutSnapshot,
    clear: () => {
      cache = null;
    },
  };
}
