import { createSignal, createEffect, For, Show, onMount, onCleanup } from "solid-js";
import { outlineFrom, type OutlineItem } from "../../../core/headings.js";
import type { EditorState } from "../../../core/model.js";
import { t } from "../../../i18n/index.js";
import { debounce } from "../../../utils/throttle.js";

export interface OutlinePanelProps {
  state: EditorState;
  onNavigate: (paragraphId: string) => void;
  defaultCollapsed?: boolean;
}

export function OutlinePanel(props: OutlinePanelProps) {
  const [collapsed, setCollapsed] = createSignal(props.defaultCollapsed ?? false);
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

  const updateOutline = debounce((doc) => {
    setItems(outlineFrom(doc));
  }, 100);

  createEffect(() => {
    updateOutline(props.state.document);
  });

  // IntersectionObserver to highlight active heading
  let observer: IntersectionObserver | null = null;

  onMount(() => {
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          // Find the first intersecting heading
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const id = entry.target.getAttribute("data-paragraph-id");
              if (id) {
                setActiveId(id);
                break;
              }
            }
          }
        },
        {
          root: null, // viewport or a specific scroll container? Assuming the scroll container is the body/window or .oasis-editor-app
          rootMargin: "-20% 0px -60% 0px", // Trigger when heading is near the top
        }
      );
    }

    // This is a naive implementation since DOM nodes are dynamically rendered.
    // A more robust implementation would observe all heading elements in the editor surface.
    // For now, we'll try to find them by data-paragraph-id.
    const observeHeadings = () => {
      if (!observer) return;
      observer.disconnect();
      const currentItems = items();
      for (const item of currentItems) {
        const el = document.querySelector(`[data-paragraph-id="${item.anchor}"]`);
        if (el) {
          observer.observe(el);
        }
      }
    };

    // Re-observe when items change
    createEffect(() => {
      items(); // depend on items
      // wait for next tick for DOM to update
      setTimeout(observeHeadings, 150);
    });
  });

  onCleanup(() => {
    if (observer) {
      observer.disconnect();
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
          aria-label="Toggle Outline"
        >
          <i data-lucide={collapsed() ? "panel-left-open" : "panel-left-close"} />
        </button>
      </div>

      <Show when={!collapsed()}>
        <div class="oasis-outline-list">
          <Show
            when={items().length > 0}
            fallback={
              <div class="oasis-outline-empty">
                Headings you add to the document will appear here.
              </div>
            }
          >
            <For each={items()}>
              {(item) => (
                <div
                  onClick={() => props.onNavigate(item.anchor)}
                  class="oasis-outline-item"
                  classList={{ "oasis-outline-item-active": activeId() === item.id }}
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
