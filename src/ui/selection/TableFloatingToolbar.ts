import { LayoutFragment } from "../../core/layout/LayoutFragment.js";
import { createIcons, icons } from "lucide";
import { h } from "../utils/dom.js";

export interface TableToolbarEvents {
  onAddRowAbove: (tableId: string) => void;
  onAddRowBelow: (tableId: string) => void;
  onAddColumnLeft: (tableId: string) => void;
  onAddColumnRight: (tableId: string) => void;
  onDeleteRow: (tableId: string) => void;
  onDeleteColumn: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
}

export class TableFloatingToolbar {
  private element: HTMLElement;
  private events: TableToolbarEvents;
  private currentTableId: string | null = null;
  private container: HTMLElement | null = null;

  constructor(events: TableToolbarEvents) {
    this.events = events;
    this.element = this.createToolbar();
  }

  private createToolbar(): HTMLElement {
    const groups = [
      [
        {
          icon: "arrow-up-to-line",
          label: "Add Row Above",
          action: () => this.events.onAddRowAbove(this.currentTableId!),
        },
        {
          icon: "arrow-down-to-line",
          label: "Add Row Below",
          action: () => this.events.onAddRowBelow(this.currentTableId!),
        },
      ],
      [
        {
          icon: "arrow-left-to-line",
          label: "Add Column Left",
          action: () => this.events.onAddColumnLeft(this.currentTableId!),
        },
        {
          icon: "arrow-right-to-line",
          label: "Add Column Right",
          action: () => this.events.onAddColumnRight(this.currentTableId!),
        },
      ],
      [
        {
          icon: "rows-3",
          label: "Delete Row",
          action: () => this.events.onDeleteRow(this.currentTableId!),
        },
        {
          icon: "columns-3",
          label: "Delete Column",
          action: () => this.events.onDeleteColumn(this.currentTableId!),
        },
      ],
      [
        {
          icon: "trash-2",
          label: "Delete Table",
          action: () => this.events.onDeleteTable(this.currentTableId!),
        },
      ],
    ];

    const toolbar = h('div', {
        className: 'oasis-table-floating-toolbar',
        style: {
            position: 'absolute',
            display: 'none',
            zIndex: '1000'
        }
    }, groups.map((group, i) => {
        const groupEl = h('div', { className: 'oasis-toolbar-group' }, 
            group.map(item => h('button', {
                className: 'oasis-toolbar-button',
                title: item.label,
                onMouseDown: (e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    item.action();
                }
            }, [
                h('i', { dataset: { lucide: item.icon } })
            ]))
        );

        if (i < groups.length - 1) {
            return [groupEl, h('div', { className: 'oasis-toolbar-separator' })];
        }
        return groupEl;
    }).flat());

    createIcons({ icons, nameAttr: "data-lucide", root: toolbar });

    return toolbar;
  }

  show(
    tableId: string,
    cellFragment: LayoutFragment,
    parent: HTMLElement,
  ): void {
    this.currentTableId = tableId;

    if (this.container !== parent) {
      if (this.container && this.element.parentElement === this.container) {
        this.container.removeChild(this.element);
      }
      this.container = parent;
      this.container.appendChild(this.element);
    }

    this.element.style.display = "flex";

    // Position above the cell.
    // We center it relative to the cell width if possible.
    const rect = cellFragment.rect;
    this.element.style.left = `${rect.x}px`;
    this.element.style.top = `${rect.y - 48}px`;
  }

  hide(): void {
    this.element.style.display = "none";
    if (this.container && this.element.parentElement === this.container) {
      this.container.removeChild(this.element);
    }
    this.container = null;
    this.currentTableId = null;
  }
}
