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

    // Clear old overlays
    this.caretOverlays.forEach((o) => o.render(null));
    this.selectionOverlays.forEach((o) => o.render(null));

    if (!selection) return;

    // Handle caret
    if (
      !selection.anchor ||
      (selection.anchor.offset === selection.focus.offset &&
        selection.anchor.blockId === selection.focus.blockId)
    ) {
      const caretRect = this.mapper.getCaretRect(
        selection.anchor || selection.focus,
      );
      if (caretRect) {
        this.getOrCreateCaretOverlay(caretRect.pageId).render(
          selection.anchor || selection.focus,
        );
      }
    } else {
      // Handle selection
      const range = this.normalizeSelection(selection);
      const rects = this.mapper.getSelectionRects(range);
      rects.forEach((rect) => {
        this.getOrCreateSelectionOverlay(rect.pageId).render(range);
      });
    }
  }

  getOrCreateCaretOverlay(
    pageId: string,
  ): CaretOverlay | { render: () => void } {
    if (this.caretOverlays.has(pageId)) {
      const existingOverlay = this.caretOverlays.get(pageId)!;
      const isInDOM = document.body.contains(
        existingOverlay.container as unknown as Node,
      );
      if (!isInDOM) {
        this.caretOverlays.delete(pageId);
      }
    }

    if (!this.caretOverlays.has(pageId)) {
      const pageEl = this.root.querySelector(`[data-page-id="${pageId}"]`);
      if (!pageEl) {
        return { render: () => {} };
      }

      let overlayContainer = pageEl.querySelector(
        ".oasis-selection-layer",
      ) as HTMLElement | null;
      if (!overlayContainer) {
        overlayContainer = document.createElement("div");
        overlayContainer.className = "oasis-selection-layer";
        pageEl.appendChild(overlayContainer);
      }

      this.caretOverlays.set(
        pageId,
        new CaretOverlay(overlayContainer, this.mapper!),
      );
    }
    return this.caretOverlays.get(pageId)!;
  }

  getOrCreateSelectionOverlay(
    pageId: string,
  ): SelectionOverlay | { render: () => void } {
    if (this.selectionOverlays.has(pageId)) {
      const existingOverlay = this.selectionOverlays.get(pageId)!;
      const isInDOM = document.body.contains(
        existingOverlay.container as unknown as Node,
      );
      if (!isInDOM) {
        this.selectionOverlays.delete(pageId);
      }
    }

    if (!this.selectionOverlays.has(pageId)) {
      const pageEl = this.root.querySelector(`[data-page-id="${pageId}"]`);
      if (!pageEl) return { render: () => {} };

      let overlayContainer = pageEl.querySelector(
        ".oasis-selection-layer",
      ) as HTMLElement | null;
      if (!overlayContainer) {
        overlayContainer = document.createElement("div");
        overlayContainer.className = "oasis-selection-layer";
        pageEl.appendChild(overlayContainer);
      }

      this.selectionOverlays.set(
        pageId,
        new SelectionOverlay(overlayContainer, this.mapper!),
      );
    }
    return this.selectionOverlays.get(pageId)!;
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
