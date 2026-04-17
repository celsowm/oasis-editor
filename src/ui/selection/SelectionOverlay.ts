// @ts-nocheck








export class SelectionOverlay {








  constructor(container, mapper) {
    this.container = container;
    this.mapper = mapper;
  }

  render(range) {
    this.container.innerHTML = "";
    if (!range || !this.mapper?.getSelectionRects) return;

    const pageId = this.container.parentElement?.dataset.pageId;
    const rects = this.mapper.getSelectionRects(range).filter(r => r.pageId === pageId);
    
    for (const rect of rects) {
      const el = document.createElement("div");
      el.className = "oasis-selection-rect";
      el.style.left = `${rect.x}px`;
      el.style.top = `${rect.y}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      this.container.appendChild(el);
    }
  }
}
