import { createMemo, createSignal, type Accessor } from "solid-js";

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 200;
export const ZOOM_STEP = 10;
export const ZOOM_DEFAULT = 100;

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return ZOOM_DEFAULT;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value)));
}

export interface EditorZoomController {
  /** Current zoom level as a percentage (clamped to [ZOOM_MIN, ZOOM_MAX]). */
  zoomPercent: Accessor<number>;
  /** Set the zoom level (input is clamped). */
  setZoomPercent: (value: number) => void;
  /** Nudge the zoom level by `delta` percent (result is clamped). */
  adjustZoom: (delta: number) => void;
  /** Visual scale factor `z = zoomPercent / 100` applied to the document layer. */
  zoomFactor: Accessor<number>;
}

/**
 * Single source of truth for the document zoom. The factor `z` is the CSS
 * `transform: scale(z)` applied to the shared `.oasis-editor-editor-scroll-content`
 * layer (canvas + every overlay). Geometry consumers divide screen-space pointer
 * coordinates by `z` to map back into the unscaled layout space the canvas draws
 * in — see the coordinate contract in CanvasLayoutSnapshot.ts.
 */
export function createEditorZoom(initial = ZOOM_DEFAULT): EditorZoomController {
  const [zoomPercent, setZoomPercentRaw] = createSignal(clampZoom(initial));
  const setZoomPercent = (value: number): number =>
    setZoomPercentRaw(clampZoom(value));
  const adjustZoom = (delta: number): number =>
    setZoomPercentRaw((current): number => clampZoom(current + delta));
  const zoomFactor = createMemo((): number => zoomPercent() / 100);
  return { zoomPercent, setZoomPercent, adjustZoom, zoomFactor };
}
