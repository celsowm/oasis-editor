import { DocumentRuntime } from "../../core/runtime/DocumentRuntime.js";
import { Operations } from "../../core/operations/OperationFactory.js";
import { CursorPositionCalculator } from "../services/CursorPositionCalculator.js";
import { FormatPainterController } from "./FormatPainterController.js";
import { LogicalPosition } from "../../core/selection/SelectionTypes.js";

export class MouseController {
  private isDragging = false;
  private dragAnchor: LogicalPosition | null = null;

  constructor(
    private runtime: DocumentRuntime,
    private cursorCalc: CursorPositionCalculator,
    private formatPainter: FormatPainterController,
  ) {}

  get dragging(): boolean {
    return this.isDragging;
  }

  get anchor(): LogicalPosition | null {
    return this.dragAnchor;
  }

  handleMouseDown(event: MouseEvent): void {
    console.log("MOUSE: handleMouseDown", event.type);
    const path = event.composedPath() as HTMLElement[];
    const isImageRelated = path.some(el => 
        el.classList?.contains("oasis-image-wrapper") || 
        el.classList?.contains("oasis-image-resize-overlay")
    );

    if (isImageRelated) {
      console.log("MOUSE: Click on image related element, ignoring for text selection");
      return;
    }

    const position = this.cursorCalc.calculateFromMouseEvent(event);
    if (!position) return;

    this.isDragging = true;
    this.dragAnchor = position;
    this.runtime.dispatch(
      Operations.setSelection({ anchor: position, focus: position }),
    );
  }

  handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || event.buttons !== 1) {
      this.isDragging = false;
      return;
    }

    const position = this.cursorCalc.calculateFromMouseEvent(event);
    if (!position) return;

    this.runtime.dispatch(
      Operations.setSelection({ anchor: this.dragAnchor!, focus: position }),
    );
  }

  handleMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;

      if (this.formatPainter.shouldApplyOnMouseUp()) {
        this.formatPainter.apply();
      }
    }
  }
}
