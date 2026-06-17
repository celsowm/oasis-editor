import {
  createSignal,
  createEffect,
  For,
  Show,
  onMount,
  onCleanup,
} from "solid-js";
import { outlineFrom, type OutlineItem } from "@/core/headings.js";
import type { EditorDocument, EditorState } from "@/core/model.js";
import { t } from "@/i18n/index.js";
import { debounce } from "@/utils/throttle.js";
import { buildCanvasLayoutSnapshot } from "@/ui/canvas/CanvasLayoutSnapshot.js";
import { getParagraphEntries } from "@/ui/canvas/CanvasGeometry.js";

export interface OutlinePanelProps {
  state: EditorState;
  onNavigate: (paragraphId: string) => void;
  defaultCollapsed?: boolean;
  surfaceRef?: () => HTMLDivElement | undefined;
  viewportRef?: () => HTMLDivElement | undefined;
}

export function OutlinePanel(props: OutlinePanelProps) {
  const [collapsed, setCollapsed] = createSignal(
    props.defaultCollapsed ?? false,
  );
  const [items, setItems] = createSignal<OutlineItem[]>([]);
  const [activeId, setActiveId] = createSignal<string | null>(null);

  // Load collapsed state from localStorage
  onMount(() => {
    const saved = localStorage.getItem("oasis-outline-collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  });

  const toggleCollapsed = () => {
    const next = !collapsed();
    setCollapsed(next);
    localStorage.setItem("oasis-outline-collapsed", String(next));
  };

  const updateOutline = debounce((doc: EditorDocument) => {
    setItems(outlineFrom(doc));
  }, 100);

  createEffect(() => {
    updateOutline(props.state.document);
  });

  // Snapshot-driven detection of the currently visible heading.
  const recomputeActive = () => {
    const surface = props.surfaceRef?.();
    if (!surface) return;
    const snapshot = buildCanvasLayoutSnapshot({
      surface,
      state: props.state,
    });
    if (!snapshot) return;
    const viewport = props.viewportRef?.();
    const anchorY = viewport
      ? viewport.getBoundingClientRect().top + viewport.clientHeight * 0.2
      : window.innerHeight * 0.2;
    let bestId: string | null = null;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const item of items()) {
      const entry = getParagraphEntries(snapshot, item.anchor)[0];
      if (!entry) continue;
      const delta = anchorY - entry.top;
      // Prefer headings already above the anchor; pick the closest one.
      if (delta >= 0 && delta < bestDelta) {
        bestDelta = delta;
        bestId = item.anchor;
      }
    }
    if (bestId) {
      setActiveId(bestId);
    }
  };

  const recomputeActiveDebounced = debounce(recomputeActive, 80);
  let scrollTarget: HTMLElement | Window | null = null;

  onMount(() => {
    scrollTarget = props.viewportRef?.() ?? window;
    scrollTarget.addEventListener("scroll", recomputeActiveDebounced, {
      passive: true,
    });
    recomputeActive();

    createEffect(() => {
      items(); // depend on items
      setTimeout(recomputeActive, 80);
    });
  });

  onCleanup(() => {
    if (scrollTarget) {
      scrollTarget.removeEventListener("scroll", recomputeActiveDebounced);
    }
  });

  return (
    <div
      class="oasis-outline-panel"
      classList={{ "oasis-outline-panel-collapsed": collapsed() }}
    >
      <div
        class="oasis-outline-header"
        classList={{ "oasis-outline-header-collapsed": collapsed() }}
      >
        <Show when={!collapsed()}>
          <span class="oasis-outline-title">
            {t("menu.view.outline") || "Outline"}
          </span>
        </Show>
        <button
          onClick={toggleCollapsed}
          class="oasis-outline-toggle"
          aria-label={t("outline.toggle")}
        >
          <i
            data-lucide={collapsed() ? "panel-left-open" : "panel-left-close"}
          />
        </button>
      </div>

      <Show when={!collapsed()}>
        <div class="oasis-outline-list">
          <Show
            when={items().length > 0}
            fallback={
              <div class="oasis-outline-empty">{t("outline.empty")}</div>
            }
          >
            <For each={items()}>
              {(item) => (
                <div
                  onClick={() => props.onNavigate(item.anchor)}
                  class="oasis-outline-item"
                  classList={{
                    "oasis-outline-item-active": activeId() === item.id,
                  }}
                  style={{ "--oasis-outline-level": String(item.level - 1) }}
                  title={item.text}
                >
                  {item.text}
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
