import {
  EditorSelection,
  LogicalRange,
  LogicalPosition,
} from "../../core/selection/SelectionTypes.js";
import { normalizeSelection as normalizeSelectionRange } from "../../core/selection/SelectionService.js";
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
  private injectedMapper: SelectionMapper | undefined;

  constructor(
    root: HTMLElement,
    pageLayer: PageLayer,
    measurer: TextMeasurer,
    mapper?: SelectionMapper,
  ) {
    this.root = root;
    this.pageLayer = pageLayer;
    this.measurer = measurer;
    this.caretOverlays = new Map();
    this.selectionOverlays = new Map();
    this.injectedMapper = mapper;
  }

  render(
    layout: LayoutState,
    selection: EditorSelection | null,
    editingMode: "main" | "header" | "footer" | "footnote" = "main",
  ): void {
    this.pageLayer.render(layout, editingMode);

    // Use injected mapper or create a default for this layout
    const mapper = this.injectedMapper ?? new SelectionMapper(layout, this.measurer);

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
      const caretRect = mapper.getCaretRect(
        selection.anchor || selection.focus,
      );
      if (caretRect) {
        this.getOrCreateCaretOverlay(caretRect.pageId, mapper).render(
          selection.anchor || selection.focus,
        );
      }
    } else {
      // Handle selection
      const range = normalizeSelectionRange(selection)!;
      const rects = mapper.getSelectionRects(range);
      rects.forEach((rect) => {
        this.getOrCreateSelectionOverlay(rect.pageId, mapper).render(range);
      });
    }
  }

  getOrCreateCaretOverlay(
    pageId: string,
    mapper: SelectionMapper,
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
        new CaretOverlay(overlayContainer, mapper),
      );
    }
    return this.caretOverlays.get(pageId)!;
  }

  getOrCreateSelectionOverlay(
    pageId: string,
    mapper: SelectionMapper,
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
        new SelectionOverlay(overlayContainer, mapper),
      );
    }
    return this.selectionOverlays.get(pageId)!;
  }

}
