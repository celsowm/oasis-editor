import { IDocumentRuntime } from "../../core/runtime/IDocumentRuntime.js";
import { Operations } from "../../core/operations/OperationFactory.js";
import { OasisEditorView } from "../OasisEditorView.js";
import { DropTargetService, DropTargetInfo } from "../services/DropTargetService.js";

export class ImageDragController {
  private draggingBlockId: string | null = null;
  private currentDropTarget: DropTargetInfo | null = null;

  constructor(
    private runtime: IDocumentRuntime,
    private view: OasisEditorView,
    private dropTargetService: DropTargetService,
  ) {}

  handleDragStart(blockId: string, _event: DragEvent): void {
    this.draggingBlockId = blockId;
  }

  handleDragOver(event: DragEvent): void {
    if (!this.draggingBlockId) return;

    const dropTarget = this.dropTargetService.findDropTarget(event, this.view.elements.pagesContainer);
    if (dropTarget) {
      this.currentDropTarget = dropTarget;
      this.view.showDropIndicator({
        pageId: dropTarget.pageId,
        pageX: dropTarget.pageX,
        pageY: dropTarget.pageY,
        width: dropTarget.rect.width,
        height: dropTarget.rect.height,
        isBefore: dropTarget.isBefore,
      });
    } else {
      this.currentDropTarget = null;
      this.view.hideDropIndicator();
    }
  }

  handleDrop(event: DragEvent): void {
    if (!this.draggingBlockId) return;

    if (this.currentDropTarget) {
      this.runtime.dispatch(
        Operations.moveBlock(
          this.draggingBlockId,
          this.currentDropTarget.blockId,
          this.currentDropTarget.isBefore,
        ),
      );
    }

    this.reset();
  }

  handleDragEnd(): void {
    this.reset();
  }

  private reset(): void {
    this.draggingBlockId = null;
    this.currentDropTarget = null;
    this.view.hideDropIndicator();
  }
}
