import { Component, For, Show, onMount } from "solid-js";
import { store, setStore } from "../EditorStore.tsx";

/**
 * Root-level component for the table floating toolbar.
 * Reads active table state from the store and renders via Portal.
 * Replaces the TableFloatingToolbar class wrapper with render().
 */
export const TableToolbar: Component<{
  onInsertRowAbove: (tableId: string) => void;
  onInsertRowBelow: (tableId: string) => void;
  onInsertColumnLeft: (tableId: string) => void;
  onInsertColumnRight: (tableId: string) => void;
  onDeleteRow: (tableId: string) => void;
  onDeleteColumn: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onMergeCells?: (tableId: string) => void;
  onSplitCell?: (tableId: string) => void;
}> = (props) => {
  const groups = [
    [
      { icon: "arrow-up-to-line", label: "Insert Row Above", action: () => props.onInsertRowAbove(store.activeTableId!) },
      { icon: "arrow-down-to-line", label: "Insert Row Below", action: () => props.onInsertRowBelow(store.activeTableId!) },
    ],
    [
      { icon: "arrow-left-to-line", label: "Insert Column Left", action: () => props.onInsertColumnLeft(store.activeTableId!) },
      { icon: "arrow-right-to-line", label: "Insert Column Right", action: () => props.onInsertColumnRight(store.activeTableId!) },
    ],
    [
      { icon: "rows-3", label: "Delete Row", action: () => props.onDeleteRow(store.activeTableId!) },
      { icon: "columns-3", label: "Delete Column", action: () => props.onDeleteColumn(store.activeTableId!) },
    ],
    [
      { icon: "combine", label: "Merge Cells", action: () => props.onMergeCells?.(store.activeTableId!) },
      { icon: "split", label: "Split Cell", action: () => props.onSplitCell?.(store.activeTableId!) },
    ],
    [
      { icon: "trash-2", label: "Delete Table", action: () => props.onDeleteTable(store.activeTableId!) },
    ],
  ];

  // Container for the Portal — created once and appended to the pages container
  let container: HTMLElement | undefined;

  onMount(() => {
    container = document.createElement("div");
    container.className = "oasis-table-toolbar-container";
    container.style.position = "fixed";
    container.style.left = "0";
    container.style.top = "0";
    container.style.pointerEvents = "none";
    container.style.zIndex = "10000";
    document.body.appendChild(container);
  });

  return (
    <Show when={!!store.activeTableId && !!store.activeTableRect && !!container}>
      <div
        class="oasis-table-floating-toolbar"
        style={{
          position: "absolute",
          display: "flex",
          "pointer-events": "auto",
          "z-index": "10000",
          left: `${store.activeTableRect!.x}px`,
          top: `${store.activeTableRect!.y - 48}px`,
        }}
      >
        <For each={groups}>
          {(group, i) => (
            <>
              <div class="oasis-toolbar-group">
                <For each={group}>
                  {(item) => (
                    <button
                      class="oasis-toolbar-button"
                      title={item.label}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        item.action();
                      }}
                    >
                      <i data-lucide={item.icon}></i>
                    </button>
                  )}
                </For>
              </div>
              {i() < groups.length - 1 && <div class="oasis-toolbar-separator"></div>}
            </>
          )}
        </For>
      </div>
    </Show>
  );
};

/** Legacy class wrapper — kept for backward compatibility with tests. */
export class TableFloatingToolbar {
  private setState: (s: { tableId: string | null; rect: { x: number; y: number } | null }) => void;
  private container: HTMLElement | null = null;
  private element: HTMLElement | null = null;

  constructor(events: import("./TableFloatingToolbar.tsx").TableToolbarEvents) {
    this.setState = (s) => {
      setStore("activeTableId", s.tableId);
      setStore("activeTableRect", s.rect);
    };
    this.element = document.createElement("div");
  }

  show(tableId: string, cellFragment: import("../../core/layout/LayoutFragment.js").LayoutFragment, parent: HTMLElement): void {
    if (this.container !== parent) {
      if (this.container && this.element?.parentElement === this.container) {
        this.container.removeChild(this.element);
      }
      this.container = parent;
      if (this.element) this.container.appendChild(this.element);
    }
    this.setState({ tableId, rect: { x: cellFragment.rect.x, y: cellFragment.rect.y } });
  }

  hide(): void {
    this.setState({ tableId: null, rect: null });
    if (this.container && this.element?.parentElement === this.container) {
      this.container.removeChild(this.element);
    }
    this.container = null;
  }

  destroy(): void {
    this.element?.remove();
  }
}
