import { IDocumentRuntime } from "../../core/runtime/IDocumentRuntime.js";
import { Logger } from "../../core/utils/Logger.js";
import { Operations } from "../../core/operations/OperationFactory.js";
import { CursorPositionCalculator } from "../services/CursorPositionCalculator.js";
import { FormatPainterController } from "./FormatPainterController.js";
import { LogicalPosition } from "../../core/selection/SelectionTypes.js";

export class MouseController {
  private isDragging = false;
  private dragAnchor: LogicalPosition | null = null;

  constructor(
    private runtime: IDocumentRuntime,
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
    Logger.debug("MOUSE: handleMouseDown", {
      type: event.type,
      x: event.clientX,
      y: event.clientY,
      buttons: event.buttons,
      target: (event.target as HTMLElement | null)?.className ?? null,
    });
    const path = event.composedPath() as HTMLElement[];
    const isImageRelated = path.some(el =>
        el.classList?.contains("oasis-image-wrapper") ||
        el.classList?.contains("oasis-image-resize-overlay")
    );

    if (isImageRelated) {
      Logger.debug("MOUSE: Click on image related element, ignoring for text selection");
      return;
    }

    const position = this.cursorCalc.calculateFromMouseEvent(event);
    Logger.debug("MOUSE: cursor position", position);
    if (!position) {
      Logger.debug("MOUSE: no position, aborting selection");
      return;
    }

    this.isDragging = true;
    this.dragAnchor = position;
    Logger.debug("MOUSE: dispatch collapsed selection", {
      anchor: position,
      dragging: this.isDragging,
    });
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
    Logger.debug("MOUSE: handleMouseMove", {
      x: event.clientX,
      y: event.clientY,
      position,
      dragging: this.isDragging,
    });
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
