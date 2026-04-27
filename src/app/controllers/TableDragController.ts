import { DocumentRuntime } from "../../core/runtime/DocumentRuntime.js";
import { Operations } from "../../core/operations/OperationFactory.js";
import { OasisEditorView } from "../OasisEditorView.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { isTableNode, TableNode, TableRowNode } from "../../core/document/BlockTypes.js";
import { DomHitTester } from "../services/DomHitTester.js";
import { DropTargetService, DropTargetInfo } from "../services/DropTargetService.js";

export class TableDragController {
  private isDragging = false;
  private draggingTableId: string | null = null;
  private tableGhost: HTMLElement | null = null;
  private currentDropTarget: DropTargetInfo | null = null;
  private dropTargetService: DropTargetService;

  constructor(
    private runtime: DocumentRuntime,
    private view: OasisEditorView,
    private getLatestLayout: () => LayoutState | null,
    private domHitTester: DomHitTester,
  ) {
    this.dropTargetService = new DropTargetService(domHitTester);
  }

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

    if (this.tableGhost) {
      this.tableGhost.style.left = `${event.clientX}px`;
      this.tableGhost.style.top = `${event.clientY}px`;
    }

    const dropTarget = this.dropTargetService.findDropTarget(event, this.view.elements.pagesContainer);
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

  private showDropIndicator(target: DropTargetInfo): void {
    this.view.showDropIndicator({
      pageId: target.pageId,
      pageX: target.pageX,
      pageY: target.pageY,
      width: target.rect.width,
      height: target.rect.height,
      isBefore: target.isBefore,
    });
  }

  private hideDropIndicator(): void {
    this.view.hideDropIndicator();
  }
}
