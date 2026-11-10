import type { RibbonGroupModel, RibbonGroupWidth } from "./ribbonModel.js";
import type { RibbonGroupResizeState } from "@/core/pluginUiTypes.js";

/**
 * Measure inert DOM copies of every state. No duplicate Solid controls, event
 * handlers, focus effects or command dispatch are mounted for measurement.
 * The copies share their owning toolbar's CSS/theme and are removed in the
 * same synchronous task, before painting or any observer callback can run.
 */
export function measureRibbonGroups(
  panel: HTMLElement,
  groups: RibbonGroupModel[],
): Record<string, RibbonGroupWidth> {
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.dataset.ribbonMeasurementCopy = "true";
  root.inert = true;
  root.style.cssText =
    "position:fixed;left:-100000px;top:0;display:flex;width:max-content;visibility:hidden;pointer-events:none;contain:layout style;";
  const copies: Array<{
    id: string;
    state: RibbonGroupResizeState;
    el: HTMLElement;
  }> = [];
  for (const el of Array.from(panel.children)) {
    if (!(el instanceof HTMLElement)) continue;
    const group = groups.find(
      (candidate) => candidate.id === el.dataset.ribbonGroup,
    );
    if (!group) continue;
    for (const state of ["full", "compact", "collapsed"] as const) {
      const copy = el.cloneNode(true) as HTMLElement;
      // Remove identity/interaction metadata from temporary DOM copies.
      for (const node of [copy, ...copy.querySelectorAll<HTMLElement>("*")]) {
        node.removeAttribute("id");
        node.removeAttribute("data-testid");
      }
      copy.classList.toggle(
        "oasis-editor-ribbon-group-compact",
        state === "compact",
      );
      copy.classList.toggle(
        "oasis-editor-ribbon-group-collapsed",
        state === "collapsed",
      );
      copy.classList.toggle(
        "oasis-editor-ribbon-group-compact-hide-labels",
        state === "compact" && group.resizePolicy.compactLabels === "hide",
      );
      copy.style.setProperty(
        "--oasis-ribbon-group-compact-width",
        `${group.resizePolicy.compactMinWidth}px`,
      );
      root.append(copy);
      copies.push({ id: group.id, state, el: copy });
    }
  }
  panel.parentElement!.append(root);
  try {
    const result: Record<string, RibbonGroupWidth> = {};
    // Batch writes above and reads here to avoid per-state layout thrashing.
    for (const { id, state, el } of copies) {
      (result[id] ??= { full: 0, compact: 0, collapsed: 0 })[state] = Math.ceil(
        el.getBoundingClientRect().width,
      );
      if (state === "compact") {
        const gallery = el.querySelector<HTMLElement>(
          ".oasis-editor-style-gallery-ribbon",
        );
        if (gallery)
          result[id].compactChrome = Math.ceil(
            el.getBoundingClientRect().width -
              gallery.getBoundingClientRect().width,
          );
      }
    }
    return result;
  } finally {
    root.remove();
  }
}
