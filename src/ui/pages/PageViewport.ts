import {
  EditorSelection,
  LogicalRange,
  LogicalPosition,
} from "../../core/selection/SelectionTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { CaretOverlay } from "../selection/CaretOverlay.js";
import { SelectionOverlay } from "../selection/SelectionOverlay.js";
import { SelectionMapper } from "../../app/services/SelectionMapper.js";
import { PageLayer } from "./PageLayer.js";

export class PageViewport {
  private root: HTMLElement;
  private pageLayer: PageLayer;
  private measurer: TextMeasurer;
  private caretOverlays: Map<string, CaretOverlay>;
  private selectionOverlays: Map<string, SelectionOverlay>;
  private mapper: SelectionMapper | null;

  constructor(root: HTMLElement, pageLayer: PageLayer, measurer: TextMeasurer) {
    this.root = root;
    this.pageLayer = pageLayer;
    this.measurer = measurer;
    this.caretOverlays = new Map();
    this.selectionOverlays = new Map();
    this.mapper = null;
  }

  render(layout: LayoutState, selection: EditorSelection | null): void {
    this.pageLayer.render(layout);
    this.mapper = new SelectionMapper(layout, this.measurer);

    this.clearOverlays();

    if (!selection) return;

    if (this.isCaretSelection(selection)) {
      this.renderCaret(selection.anchor || selection.focus);
    } else {
      this.renderSelectionRange(selection);
    }
  }

  private clearOverlays(): void {
    this.caretOverlays.forEach((o) => o.render(null));
    this.selectionOverlays.forEach((o) => o.render(null));
  }

  private isCaretSelection(selection: EditorSelection): boolean {
    return (
      !selection.anchor ||
      (selection.anchor.offset === selection.focus.offset &&
        selection.anchor.blockId === selection.focus.blockId)
    );
  }

  private renderCaret(position: LogicalPosition): void {
    const caretRect = this.mapper!.getCaretRect(position);
    if (caretRect) {
      this.getOrCreateCaretOverlay(caretRect.pageId).render(position);
    }
  }

  private renderSelectionRange(selection: EditorSelection): void {
    const range = this.normalizeSelection(selection);
    const rects = this.mapper!.getSelectionRects(range);
    rects.forEach((rect) => {
      this.getOrCreateSelectionOverlay(rect.pageId).render(range);
    });
  }

  getOrCreateCaretOverlay(
    pageId: string,
  ): CaretOverlay | { render: () => void } {
    if (this.caretOverlays.has(pageId)) {
      const existingOverlay = this.caretOverlays.get(pageId)!;
      if (
        document.body.contains(existingOverlay.container as unknown as Node)
      ) {
        return existingOverlay;
      }
      this.caretOverlays.delete(pageId);
    }

    const container = this.getOverlayContainer(pageId);
    if (!container) return { render: () => {} };

    const overlay = new CaretOverlay(container, this.mapper!);
    this.caretOverlays.set(pageId, overlay);
    return overlay;
  }

  getOrCreateSelectionOverlay(
    pageId: string,
  ): SelectionOverlay | { render: () => void } {
    if (this.selectionOverlays.has(pageId)) {
      const existingOverlay = this.selectionOverlays.get(pageId)!;
      if (
        document.body.contains(existingOverlay.container as unknown as Node)
      ) {
        return existingOverlay;
      }
      this.selectionOverlays.delete(pageId);
    }

    const container = this.getOverlayContainer(pageId);
    if (!container) return { render: () => {} };

    const overlay = new SelectionOverlay(container, this.mapper!);
    this.selectionOverlays.set(pageId, overlay);
    return overlay;
  }

  private getOverlayContainer(pageId: string): HTMLElement | null {
    const pageEl = this.root.querySelector(`[data-page-id="${pageId}"]`);
    if (!pageEl) return null;

    let overlayContainer = pageEl.querySelector(
      ".oasis-selection-layer",
    ) as HTMLElement | null;

    if (!overlayContainer) {
      overlayContainer = document.createElement("div");
      overlayContainer.className = "oasis-selection-layer";
      pageEl.appendChild(overlayContainer);
    }

    return overlayContainer;
  }

  normalizeSelection(selection: EditorSelection): LogicalRange {
    const a: LogicalPosition = selection.anchor;
    const b: LogicalPosition = selection.focus;
    if (a.blockId === b.blockId) {
      return a.offset <= b.offset ? { start: a, end: b } : { start: b, end: a };
    }
    return a.blockId < b.blockId ? { start: a, end: b } : { start: b, end: a };
  }
}
