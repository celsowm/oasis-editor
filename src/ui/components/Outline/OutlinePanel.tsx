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
      style={{
        display: "flex",
        "flex-direction": "column",
        width: collapsed() ? "40px" : "240px",
        "border-right": "1px solid var(--oasis-toolbar-border)",
        "background-color": "var(--oasis-toolbar-bg)",
        transition: "width 0.2s ease",
        overflow: "hidden",
        "font-family": "var(--oasis-font-ui)",
        "box-sizing": "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": collapsed() ? "center" : "space-between",
          padding: collapsed() ? "16px 0" : "16px",
          height: "48px",
          "box-sizing": "border-box",
        }}
      >
        <Show when={!collapsed()}>
          <span style={{ "font-weight": "500", color: "var(--oasis-text)", "font-size": "14px" }}>
            {t("menu.view.outline") || "Outline"}
          </span>
        </Show>
        <button
          onClick={toggleCollapsed}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--oasis-text-muted)",
            padding: "4px",
            "border-radius": "4px",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
          }}
          aria-label="Toggle Outline"
        >
          {collapsed() ? "▶" : "◀"}
        </button>
      </div>

      <Show when={!collapsed()}>
        <div style={{ flex: 1, overflow: "auto", padding: "0 16px 16px 16px" }}>
          <Show
            when={items().length > 0}
            fallback={
              <div style={{ color: "var(--oasis-text-muted)", "font-size": "13px", "margin-top": "24px", "text-align": "center" }}>
                Headings you add to the document will appear here.
              </div>
            }
          >
            <For each={items()}>
              {(item) => (
                <div
                  onClick={() => props.onNavigate(item.anchor)}
                  style={{
                    padding: "4px 8px",
                    cursor: "pointer",
                    "border-radius": "4px",
                    "margin-bottom": "4px",
                    "font-size": "13px",
                    "margin-left": `${(item.level - 1) * 12}px`,
                    color: activeId() === item.id ? "var(--oasis-accent)" : "var(--oasis-text-muted)",
                    "background-color": activeId() === item.id ? "var(--oasis-accentSoft, #e8f0fe)" : "transparent",
                    "white-space": "nowrap",
                    "overflow": "hidden",
                    "text-overflow": "ellipsis",
                  }}
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
