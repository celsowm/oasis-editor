import { LayoutFragment } from "../../core/layout/LayoutFragment.js";

export interface MoveHandleEvents {
  onDragStart: (blockId: string, e: MouseEvent) => void;
}

export class TableMoveHandle {
  private element: HTMLElement;
  private events: MoveHandleEvents;
  private currentTableId: string | null = null;
  private container: HTMLElement | null = null;

  constructor(events: MoveHandleEvents) {
    this.events = events;
    this.element = this.createHandle();
  }

  private createHandle(): HTMLElement {
    const handle = document.createElement("div");
    handle.className = "oasis-table-move-handle";
    handle.innerHTML = "⠿";
    handle.title = "Drag to move table";
    handle.style.position = "absolute";
    handle.style.display = "none";
    handle.style.zIndex = "1001";
    handle.style.cursor = "grab";

    handle.onmousedown = (e) => {
      if (this.currentTableId) {
        this.events.onDragStart(this.currentTableId, e);
      }
    };

    return handle;
  }

  show(
    tableId: string,
    firstCellFragment: LayoutFragment,
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

    // Position at top-left of the first cell
    const rect = firstCellFragment.rect;
    this.element.style.left = `${rect.x - 24}px`;
    this.element.style.top = `${rect.y - 4}px`;
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
