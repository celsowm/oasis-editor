import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";

export interface SurfaceRectApi {
  /** The surface's bounding rect in viewport coordinates, or `null` if unmounted. */
  rect: Accessor<DOMRect | null>;
  /** Monotonic counter that bumps on every refresh, for `createMemo` invalidation. */
  tick: Accessor<number>;
  /** Force a re-measure (rAF-throttled), e.g. when the anchored target changes. */
  refresh: () => void;
}

/**
 * Tracks the bounding rect of a scroll/resize-affected surface element so that
 * surface-relative overlays (floating table toolbar, layout-options anchor) can
 * position themselves in viewport space.
 *
 * Consolidates the identical `surfaceRect` + rAF `scheduleRefresh` +
 * scroll(capture)/resize listener block that used to be copy-pasted across
 * `FloatingTableToolbar` and `FloatingLayoutOptions`.
 */
export function useSurfaceRect(
  surfaceRef: () => HTMLElement | undefined,
): SurfaceRectApi {
  const [rect, setRect] = createSignal<DOMRect | null>(null);
  const [tick, setTick] = createSignal(0);

  const measure = () => {
    const surface = surfaceRef();
    setRect(surface ? surface.getBoundingClientRect() : null);
  };

  let frame: number | null = null;
  const refresh = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      measure();
      setTick((value) => value + 1);
    });
  };

  onMount(() => {
    measure();
    window.addEventListener("scroll", refresh, true);
    window.addEventListener("resize", refresh);
    onCleanup(() => {
      window.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
      if (frame !== null) cancelAnimationFrame(frame);
    });
  });

  return { rect, tick, refresh };
}
