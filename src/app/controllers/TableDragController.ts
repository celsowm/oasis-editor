import { DocumentRuntime } from "../../core/runtime/DocumentRuntime.js";
import { Operations } from "../../core/operations/OperationFactory.js";
import { OasisEditorView } from "../OasisEditorView.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { isTableNode, TableNode, TableRowNode } from "../../core/document/BlockTypes.js";
import { DomHitTester } from "../services/DomHitTester.js";

export class TableDragController {
  private isDragging = false;
  private draggingTableId: string | null = null;
  private dropIndicator: HTMLElement | null = null;
  private tableGhost: HTMLElement | null = null;
  private currentDropTarget: { blockId: string; isBefore: boolean } | null = null;

  constructor(
    private runtime: DocumentRuntime,
    private view: OasisEditorView,
    private getLatestLayout: () => LayoutState | null,
    private domHitTester: DomHitTester,
  ) {}

  get isDraggingTable(): boolean { return this.isDragging; }

  handleDragStart(tableId: string, _event: MouseEvent): void {
    this.isDragging = true;
    this.draggingTableId = tableId;
    document.body.style.cursor = "grabbing";

    const layout = this.getLatestLayout();
    if (!layout) return;

    const state = this.runtime.getState();
    let tableBlock: TableNode | null = null;
    for (const section of state.document.sections) {
      const found = section.children.find((b) => b.id === tableId);
      if (found && isTableNode(found)) {
        tableBlock = found;
        break;
      }
    }

    if (tableBlock && tableBlock.kind === "table") {
      const cellIds = new Set<string>();
      tableBlock.rows.forEach((row: TableRowNode) => {
        row.cells.forEach((cell) => cellIds.add(cell.id));
      });

      const fragments = Object.values(layout.fragmentsByBlockId)
        .flat()
        .filter((f) => cellIds.has(f.blockId));

      if (fragments.length > 0) {
        const firstPageId = fragments[0].pageId;
        const tableFragmentsOnPage = fragments.filter(
          (f) => f.pageId === firstPageId,
        );

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        tableFragmentsOnPage.forEach((f) => {
          minX = Math.min(minX, f.rect.x);
          minY = Math.min(minY, f.rect.y);
          maxX = Math.max(maxX, f.rect.x + f.rect.width);
          maxY = Math.max(maxY, f.rect.y + f.rect.height);
        });

        this.tableGhost = document.createElement("div");
        this.tableGhost.className = "oasis-table-ghost";
        this.tableGhost.style.width = `${maxX - minX}px`;
        this.tableGhost.style.height = `${maxY - minY}px`;
        this.tableGhost.style.left = `${_event.clientX}px`;
        this.tableGhost.style.top = `${_event.clientY}px`;
        this.tableGhost.style.transform = "translate(-20px, -20px)";

        document.body.appendChild(this.tableGhost);
      }
    }
  }

  handleDragging(event: MouseEvent): void {
    if (!this.isDragging) return;
    const layout = this.getLatestLayout();
    if (!layout) return;

    if (this.tableGhost) {
      this.tableGhost.style.left = `${event.clientX}px`;
      this.tableGhost.style.top = `${event.clientY}px`;
    }

    const dropTarget = this.findDropTarget(event);
    if (dropTarget) {
      this.currentDropTarget = dropTarget;
      this.showDropIndicator(dropTarget);
    } else {
      this.hideDropIndicator();
    }
  }

  handleMouseUp(_event: MouseEvent): void {
    if (!this.isDragging) return;

    if (this.currentDropTarget && this.draggingTableId) {
      this.runtime.dispatch(
        Operations.moveBlock(
          this.draggingTableId,
          this.currentDropTarget.blockId,
          this.currentDropTarget.isBefore,
        ),
      );
    }

    if (this.tableGhost && this.tableGhost.parentElement) {
      this.tableGhost.parentElement.removeChild(this.tableGhost);
    }
    this.tableGhost = null;

    this.isDragging = false;
    this.draggingTableId = null;
    this.currentDropTarget = null;
    this.hideDropIndicator();
    document.body.style.cursor = "";
  }

  private findDropTarget(event: MouseEvent): { blockId: string; isBefore: boolean; rect: { x: number; y: number; width: number; height: number }; pageId: string } | null {
    const element = this.domHitTester.elementFromPoint(event.clientX, event.clientY);
    const fragmentEl = element
      ? (this.domHitTester.closest(".oasis-fragment", element) as HTMLElement | null)
      : null;
    if (!fragmentEl) return null;

    const blockId = fragmentEl.getAttribute("data-block-id");
    if (!blockId) return null;

    const rect = fragmentEl.getBoundingClientRect();
    const isBefore = event.clientY < rect.top + rect.height / 2;

    return {
      blockId,
      isBefore,
      rect: {
        x: parseFloat(fragmentEl.style.left),
        y: parseFloat(fragmentEl.style.top),
        width: rect.width,
        height: rect.height,
      },
      pageId: fragmentEl.parentElement?.getAttribute("data-page-id") || "",
    };
  }

  private showDropIndicator(target: { blockId: string; isBefore: boolean; rect: { x: number; y: number; width: number; height: number }; pageId: string }): void {
    if (!this.dropIndicator) {
      this.dropIndicator = document.createElement("div");
      this.dropIndicator.className = "oasis-drop-indicator";
      document.body.appendChild(this.dropIndicator);
    }

    const pageEl = this.view.elements.root.querySelector(
      `[data-page-id="${target.pageId}"]`,
    );
    if (!pageEl) return;

    if (this.dropIndicator.parentElement !== pageEl) {
      pageEl.appendChild(this.dropIndicator);
    }

    this.dropIndicator.style.display = "block";
    this.dropIndicator.style.left = `${target.rect.x}px`;
    this.dropIndicator.style.width = `${target.rect.width}px`;
    this.dropIndicator.style.top = `${target.isBefore ? target.rect.y - 2 : target.rect.y + target.rect.height - 1}px`;
  }

  private hideDropIndicator(): void {
    if (this.dropIndicator) {
      this.dropIndicator.style.display = "none";
    }
  }
}
