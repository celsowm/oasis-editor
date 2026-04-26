import { Component, createSignal, For, Show, onMount } from "solid-js";
import { LayoutFragment } from "../../core/layout/LayoutFragment.js";
import { createIcons, icons } from "lucide";
import { render } from "solid-js/web";

export interface TableToolbarEvents {
  onAddRowAbove: (tableId: string) => void;
  onAddRowBelow: (tableId: string) => void;
  onAddColumnLeft: (tableId: string) => void;
  onAddColumnRight: (tableId: string) => void;
  onDeleteRow: (tableId: string) => void;
  onDeleteColumn: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onMergeCells?: (tableId: string) => void;
  onSplitCell?: (tableId: string) => void;
}

export interface TableFloatingToolbarProps {
  events: TableToolbarEvents;
  tableId: string | null;
  rect: { x: number, y: number } | null;
}

export const TableFloatingToolbarComponent: Component<TableFloatingToolbarProps> = (props) => {
  let toolbarRef: HTMLDivElement | undefined;

  onMount(() => {
    if (toolbarRef) {
      createIcons({ icons, nameAttr: "data-lucide", root: toolbarRef });
    }
  });

  const groups = [
    [
      { icon: "arrow-up-to-line", label: "Add Row Above", action: () => props.events.onAddRowAbove(props.tableId!) },
      { icon: "arrow-down-to-line", label: "Add Row Below", action: () => props.events.onAddRowBelow(props.tableId!) },
    ],
    [
      { icon: "arrow-left-to-line", label: "Add Column Left", action: () => props.events.onAddColumnLeft(props.tableId!) },
      { icon: "arrow-right-to-line", label: "Add Column Right", action: () => props.events.onAddColumnRight(props.tableId!) },
    ],
    [
      { icon: "rows-3", label: "Delete Row", action: () => props.events.onDeleteRow(props.tableId!) },
      { icon: "columns-3", label: "Delete Column", action: () => props.events.onDeleteColumn(props.tableId!) },
    ],
    [
      { icon: "combine", label: "Merge Cells", action: () => props.events.onMergeCells?.(props.tableId!) },
      { icon: "split", label: "Split Cell", action: () => props.events.onSplitCell?.(props.tableId!) },
    ],
    [
      { icon: "trash-2", label: "Delete Table", action: () => props.events.onDeleteTable(props.tableId!) },
    ],
  ];

  return (
    <Show when={props.tableId && props.rect}>
      <div
        ref={toolbarRef}
        class="oasis-table-floating-toolbar"
        style={{
          position: "absolute",
          display: "flex",
          "z-index": "1000",
          left: `${props.rect!.x}px`,
          top: `${props.rect!.y - 48}px`,
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

export class TableFloatingToolbar {
  private dispose: () => void;
  private setState: (s: { tableId: string | null; rect: { x: number; y: number } | null }) => void;
  private container: HTMLElement | null = null;
  private element: HTMLElement | null = null;

  constructor(events: TableToolbarEvents) {
    const [state, setState] = createSignal<{ tableId: string | null; rect: { x: number; y: number } | null }>({
      tableId: null,
      rect: null,
    });
    this.setState = setState;

    // We still need a dummy element because the legacy View expects one to be managed
    this.element = document.createElement("div");

    this.dispose = render(() => (
      <TableFloatingToolbarComponent 
        events={events} 
        tableId={state().tableId} 
        rect={state().rect} 
      />
    ), this.element);
  }

  show(tableId: string, cellFragment: LayoutFragment, parent: HTMLElement): void {
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
    this.dispose();
    this.element?.remove();
  }
}
