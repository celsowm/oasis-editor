import { LayoutState } from "../../core/layout/LayoutTypes.js";

export class PageLayer {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(layout: LayoutState): void {
    this.container.innerHTML = "";

    for (const page of layout.pages) {
      const pageEl = document.createElement("section");
      pageEl.className = "oasis-page";
      pageEl.dataset["pageId"] = page.id;
      pageEl.style.width = `${page.rect.width}px`;
      pageEl.style.minHeight = `${page.rect.height}px`;

      if (page.headerRect) {
        const header = document.createElement("div");
        header.className = "oasis-page-header";
        header.style.position = "absolute";
        header.style.left = `${page.headerRect.x}px`;
        header.style.top = `${page.headerRect.y}px`;
        header.style.width = `${page.headerRect.width}px`;
        header.style.height = `${page.headerRect.height}px`;
        header.textContent = `Header • ${page.pageNumber}`;
        pageEl.appendChild(header);
      }

      const content = document.createElement("div");
      content.className = "oasis-page-content";

      for (const fragment of page.fragments) {
        // Render based on kind
        if (fragment.kind === "image" && fragment.imageSrc) {
          const wrapper = document.createElement("div");
          wrapper.className = "oasis-image-wrapper";
          wrapper.dataset["blockId"] = fragment.blockId;
          wrapper.style.position = "absolute";
          wrapper.style.left = `${fragment.rect.x}px`;
          wrapper.style.top = `${fragment.rect.y}px`;
          wrapper.style.width = `${fragment.rect.width}px`;
          wrapper.style.height = `${fragment.rect.height}px`;
          wrapper.style.cursor = "pointer";

          const img = document.createElement("img");
          img.src = fragment.imageSrc;
          img.alt = fragment.imageAlt ?? "";
          img.draggable = false;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "contain";
          img.style.display = "block";
          img.style.userSelect = "none";
          img.style.pointerEvents = "none";

          wrapper.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            wrapper.dispatchEvent(
              new CustomEvent("image-select", {
                bubbles: true,
                detail: { blockId: fragment.blockId, fragment },
              }),
            );
          });

          pageEl.appendChild(wrapper);
          continue;
        }

        // Text fragment
        const fragmentEl = document.createElement("article");
        fragmentEl.className = `oasis-fragment oasis-fragment--${fragment.kind}`;
        fragmentEl.dataset["fragmentId"] = fragment.id;
        fragmentEl.style.fontFamily = fragment.typography.fontFamily;
        fragmentEl.style.fontSize = `${fragment.typography.fontSize}px`;
        fragmentEl.style.left = `${fragment.rect.x}px`;
        fragmentEl.style.top = `${fragment.rect.y}px`;
        fragmentEl.style.width = `${fragment.rect.width}px`;
        fragmentEl.style.height = `${fragment.rect.height}px`;
        fragmentEl.style.textAlign = fragment.align;

        // Render text using spans for rich text formatting
        fragmentEl.innerHTML = "";

        const displayRuns = fragment.runs?.length
          ? fragment.runs
          : [{ text: fragment.text, marks: fragment.marks ?? {} }];

        for (const run of displayRuns) {
          const span = document.createElement("span");
          span.textContent = run.text;

          let fontWeight = fragment.typography.fontWeight;
          if (run.marks?.["bold"] || fragment.kind === "heading") {
            fontWeight = 700;
          }
          span.style.fontWeight = String(fontWeight);

          if (run.marks?.["italic"]) {
            span.style.fontStyle = "italic";
          }

          if (run.marks?.["underline"]) {
            span.style.textDecoration = "underline";
          }

          if (run.marks?.["color"]) {
            span.style.color = run.marks["color"];
          }

          fragmentEl.appendChild(span);
        }

        content.appendChild(fragmentEl);
      }

      pageEl.appendChild(content);

      if (page.footerRect) {
        const footer = document.createElement("div");
        footer.className = "oasis-page-footer";
        footer.style.position = "absolute";
        footer.style.left = `${page.footerRect.x}px`;
        footer.style.top = `${page.footerRect.y}px`;
        footer.style.width = `${page.footerRect.width}px`;
        footer.style.height = `${page.footerRect.height}px`;
        footer.textContent = `Page ${page.pageNumber}`;
        pageEl.appendChild(footer);
      }

      this.container.appendChild(pageEl);
    }
  }
}
