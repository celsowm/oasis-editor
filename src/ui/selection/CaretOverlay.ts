// @ts-nocheck








export class CaretOverlay {








  constructor(container, mapper) {
    this.container = container;
    this.mapper = mapper;
  }

  render(position) {
    this.container.innerHTML = "";
    if (!position || !this.mapper?.getCaretRect) return;

    const rect = this.mapper.getCaretRect(position);
    if (!rect) return;

    const el = document.createElement("div");
    el.className = "oasis-caret";
    el.style.left = `${rect.x}px`;
    el.style.top = `${rect.y}px`;
    el.style.height = `${rect.height}px`;
    this.container.appendChild(el);
  }
}
