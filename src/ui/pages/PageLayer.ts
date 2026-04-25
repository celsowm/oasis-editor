import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { renderFragment } from "./FragmentRenderer.js";
import { h } from "../utils/dom.js";

export class PageLayer {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(layout: LayoutState, editingMode: "main" | "header" | "footer" = "main"): void {
    // Preserve scroll position of the nearest scrollable ancestor so the page
    // doesn't jump to the top when innerHTML is cleared and re-built.
    const scrollEl = this.findScrollableAncestor(this.container);
    const savedScrollTop = scrollEl?.scrollTop ?? 0;
    const savedScrollLeft = scrollEl?.scrollLeft ?? 0;

    this.container.innerHTML = "";

    for (const page of layout.pages) {
      const pageEl = h("section", {
        className: `oasis-page ${editingMode === "header" ? "editing-header" : ""} ${editingMode === "footer" ? "editing-footer" : ""}`,
        dataset: { pageId: page.id },
        style: {
          width: `${page.rect.width}px`,
          minHeight: `${page.rect.height}px`,
        }
      });

      // Render Header UI (Line and Label)
      if (page.headerRect) {
        const headerUI = h("div", {
          className: `oasis-page-header-ui ${editingMode === "header" ? "active" : ""}`,
          style: {
            position: "absolute",
            left: `${page.headerRect.x}px`,
            top: `${page.headerRect.y}px`,
            width: `${page.headerRect.width}px`,
            height: `${page.headerRect.height}px`,
            pointerEvents: "none",
            zIndex: "5"
          }
        }, [
            h('div', { className: 'oasis-header-line' }),
            h('div', { className: 'oasis-header-label' }, 'Cabeçalho')
        ]);
        pageEl.appendChild(headerUI);

        for (const frag of page.headerFragments) {
          pageEl.appendChild(renderFragment(frag, editingMode !== "header"));
        }
      }

      // Render Main Content
      for (const frag of page.fragments) {
        pageEl.appendChild(renderFragment(frag, editingMode !== "main"));
      }

      // Render Footer UI (Line and Label)
      if (page.footerRect) {
        const footerUI = h("div", {
          className: `oasis-page-footer-ui ${editingMode === "footer" ? "active" : ""}`,
          style: {
            position: "absolute",
            left: `${page.footerRect.x}px`,
            top: `${page.footerRect.y}px`,
            width: `${page.footerRect.width}px`,
            height: `${page.footerRect.height}px`,
            pointerEvents: "none",
            zIndex: "5"
          }
        }, [
            h('div', { className: 'oasis-footer-line' }),
            h('div', { className: 'oasis-footer-label' }, 'Rodapé')
        ]);
        pageEl.appendChild(footerUI);

        for (const frag of page.footerFragments) {
          pageEl.appendChild(renderFragment(frag, editingMode !== "footer"));
        }
      }

      this.container.appendChild(pageEl);
    }

    if (scrollEl) {
      scrollEl.scrollTop = savedScrollTop;
      scrollEl.scrollLeft = savedScrollLeft;
    }
  }

  private findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
    let node: HTMLElement | null = el?.parentElement ?? null;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        return node;
      }
      node = node.parentElement;
    }
    return document.scrollingElement as HTMLElement | null;
  }
}
