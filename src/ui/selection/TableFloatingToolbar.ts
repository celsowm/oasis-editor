import { LayoutFragment } from "../../core/layout/LayoutFragment.js";
import { createIcons, icons } from "lucide";

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
    const toolbar = document.createElement("div");
    toolbar.className = "oasis-table-floating-toolbar";
    toolbar.style.position = "absolute";
    toolbar.style.display = "none";
    toolbar.style.zIndex = "1000";

    const groups = [
      [
        {
          icon: '<i data-lucide="arrow-up-to-line"></i>',
          label: "Add Row Above",
          action: () => this.events.onAddRowAbove(this.currentTableId!),
        },
        {
          icon: '<i data-lucide="arrow-down-to-line"></i>',
          label: "Add Row Below",
          action: () => this.events.onAddRowBelow(this.currentTableId!),
        },
      ],
      [
        {
          icon: '<i data-lucide="arrow-left-to-line"></i>',
          label: "Add Column Left",
          action: () => this.events.onAddColumnLeft(this.currentTableId!),
        },
        {
          icon: '<i data-lucide="arrow-right-to-line"></i>',
          label: "Add Column Right",
          action: () => this.events.onAddColumnRight(this.currentTableId!),
        },
      ],
      [
        {
          icon: '<i data-lucide="rows-3"></i>',
          label: "Delete Row",
          action: () => this.events.onDeleteRow(this.currentTableId!),
        },
        {
          icon: '<i data-lucide="columns-3"></i>',
          label: "Delete Column",
          action: () => this.events.onDeleteColumn(this.currentTableId!),
        },
      ],
      [
        {
          icon: '<i data-lucide="trash-2"></i>',
          label: "Delete Table",
          action: () => this.events.onDeleteTable(this.currentTableId!),
        },
      ],
    ];

    groups.forEach((group, i) => {
      const groupEl = document.createElement("div");
      groupEl.className = "oasis-toolbar-group";
      group.forEach((item) => {
        const btn = document.createElement("button");
        btn.className = "oasis-toolbar-button";
        btn.title = item.label;
        btn.innerHTML = item.icon;
        btn.onmousedown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          item.action();
        };
        groupEl.appendChild(btn);
      });
      toolbar.appendChild(groupEl);
      if (i < groups.length - 1) {
        const sep = document.createElement("div");
        sep.className = "oasis-toolbar-separator";
        toolbar.appendChild(sep);
      }
    });

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
