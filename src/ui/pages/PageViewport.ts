// @ts-nocheck








import { CaretOverlay } from "../selection/CaretOverlay.js";
import { SelectionOverlay } from "../selection/SelectionOverlay.js";
import { SelectionMapper } from "../../app/services/SelectionMapper.js";

export class PageViewport {








  constructor(root, pageLayer, measurer) {
    this.root = root;
    this.pageLayer = pageLayer;
    this.measurer = measurer;
    this.caretOverlays = new Map(); // pageId -> CaretOverlay
    this.selectionOverlays = new Map(); // pageId -> SelectionOverlay
    this.mapper = null;
  }

  render(layout, selection) {
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
      console.log('VIEWPORT: Renderizando caret');
      console.log('VIEWPORT: Posição do caret:', selection.anchor || selection.focus);
      const caretRect = this.mapper.getCaretRect(
        selection.anchor || selection.focus,
      );
      console.log('VIEWPORT: Caret rect:', caretRect);
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

  getOrCreateCaretOverlay(pageId) {
    console.log('VIEWPORT: getOrCreateCaretOverlay chamado com pageId:', pageId);
    if (!this.caretOverlays.has(pageId)) {
      console.log('VIEWPORT: Criando novo caret overlay para pagina:', pageId);
    } else {
      // Verificar se o overlay ainda está no DOM
      const existingOverlay = this.caretOverlays.get(pageId);
      const isInDOM = document.body.contains(existingOverlay.container);
      console.log('VIEWPORT: Overlay existente ainda está no DOM?', isInDOM);
      if (!isInDOM) {
        console.log('VIEWPORT: Container antigo foi removido, recriando overlay');
        // Remover referência antiga para forçar recriação
        this.caretOverlays.delete(pageId);
      }
    }
    
    if (!this.caretOverlays.has(pageId)) {
      console.log('VIEWPORT: Criando novo caret overlay para pagina:', pageId);
      const pageEl = this.root.querySelector(`[data-page-id="${pageId}"]`);
      console.log('VIEWPORT: Elemento da pagina encontrado?', !!pageEl);
      if (!pageEl) {
        console.log('VIEWPORT: ❌ Pagina nao encontrada, retornando stub');
        return { render: () => {} };
      }

      let overlayContainer = pageEl.querySelector(".oasis-selection-layer");
      console.log('VIEWPORT: Container de selecao existe?', !!overlayContainer);
      if (!overlayContainer) {
        console.log('VIEWPORT: Criando novo container de selecao');
        overlayContainer = document.createElement("div");
        overlayContainer.className = "oasis-selection-layer";
        pageEl.appendChild(overlayContainer);
      }

      this.caretOverlays.set(
        pageId,
        new CaretOverlay(overlayContainer, this.mapper),
      );
      console.log('VIEWPORT: CaretOverlay criado e armazenado');
    }
    return this.caretOverlays.get(pageId);
  }

  getOrCreateSelectionOverlay(pageId) {
    if (this.selectionOverlays.has(pageId)) {
      // Verificar se o overlay ainda está no DOM
      const existingOverlay = this.selectionOverlays.get(pageId);
      const isInDOM = document.body.contains(existingOverlay.container);
      if (!isInDOM) {
        // Remover referência antiga para forçar recriação
        this.selectionOverlays.delete(pageId);
      }
    }
    
    if (!this.selectionOverlays.has(pageId)) {
      const pageEl = this.root.querySelector(`[data-page-id="${pageId}"]`);
      if (!pageEl) return { render: () => {} };

      let overlayContainer = pageEl.querySelector(".oasis-selection-layer");
      if (!overlayContainer) {
        overlayContainer = document.createElement("div");
        overlayContainer.className = "oasis-selection-layer";
        pageEl.appendChild(overlayContainer);
      }

      this.selectionOverlays.set(
        pageId,
        new SelectionOverlay(overlayContainer, this.mapper),
      );
    }
    return this.selectionOverlays.get(pageId);
  }

  normalizeSelection(selection) {
    const a = selection.anchor;
    const b = selection.focus;
    if (a.blockId === b.blockId) {
      return a.offset <= b.offset ? { start: a, end: b } : { start: b, end: a };
    }
    // Very basic comparison for now
    return a.blockId < b.blockId ? { start: a, end: b } : { start: b, end: a };
  }
}
