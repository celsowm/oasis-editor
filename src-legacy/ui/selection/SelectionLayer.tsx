import { Component, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { store } from "../EditorStore.tsx";

/**
 * Single root-level component that renders caret and selection overlays
 * via Portals into each page's .oasis-selection-layer container.
 * Replaces the per-page CaretOverlay/SelectionOverlay render() calls.
 */
export const SelectionLayer: Component = () => {
  return (
    <>
      <Show when={store.caretRect}>
        {(caret) => (
          <Portal mount={getOrCreateSelectionLayer(caret().pageId)}>
            <div
              class="oasis-caret"
              style={{
                left: `${caret().x}px`,
                top: `${caret().y}px`,
                height: `${caret().height}px`,
              }}
            />
          </Portal>
        )}
      </Show>
      <For each={groupByPage(store.selectionRects)}>
        {(group) => (
          <Portal mount={getOrCreateSelectionLayer(group.pageId)}>
            <For each={group.rects}>
              {(rect) => (
                <div
                  class="oasis-selection-rect"
                  style={{
                    left: `${rect.x}px`,
                    top: `${rect.y}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                  }}
                />
              )}
            </For>
          </Portal>
        )}
      </For>
    </>
  );
};

interface RectGroup {
  pageId: string;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
}

function groupByPage(rects: Array<{ pageId: string; x: number; y: number; width: number; height: number }>): RectGroup[] {
  const map = new Map<string, RectGroup>();
  for (const r of rects) {
    let g = map.get(r.pageId);
    if (!g) {
      g = { pageId: r.pageId, rects: [] };
      map.set(r.pageId, g);
    }
    g.rects.push(r);
  }
  return Array.from(map.values());
}

const layerCache = new Map<string, HTMLElement>();

function getOrCreateSelectionLayer(pageId: string): HTMLElement {
  if (layerCache.has(pageId)) {
    const cached = layerCache.get(pageId)!;
    if (document.body.contains(cached)) return cached;
    layerCache.delete(pageId);
  }

  const pageEl = document.querySelector(`[data-page-id="${pageId}"]`);
  if (!pageEl) {
    // Return a detached container to avoid Portal errors
    let fallback = layerCache.get(`fallback-${pageId}`);
    if (!fallback) {
      fallback = document.createElement("div");
      fallback.className = "oasis-selection-layer";
      fallback.style.position = "fixed";
      fallback.style.left = "0";
      fallback.style.top = "0";
      fallback.style.pointerEvents = "none";
      document.body.appendChild(fallback);
      layerCache.set(`fallback-${pageId}`, fallback);
    }
    return fallback;
  }

  let layer = pageEl.querySelector(".oasis-selection-layer") as HTMLElement | null;
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "oasis-selection-layer";
    layer.style.position = "absolute";
    layer.style.left = "0";
    layer.style.top = "0";
    layer.style.pointerEvents = "none";
    pageEl.appendChild(layer);
  }

  layerCache.set(pageId, layer);
  return layer;
}
