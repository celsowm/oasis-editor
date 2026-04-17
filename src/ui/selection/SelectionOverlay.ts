import { LogicalRange } from "../../core/selection/SelectionTypes.js";
import { SelectionMapper } from "../../app/services/SelectionMapper.js";

export class SelectionOverlay {
  public container: HTMLElement;
  private mapper: SelectionMapper;

  constructor(container: HTMLElement, mapper: SelectionMapper) {
    this.container = container;
    this.mapper = mapper;
  }

  render(range: LogicalRange | null): void {
    this.container.innerHTML = "";
    if (!range || !this.mapper?.getSelectionRects) return;

    const pageId = this.container.parentElement?.dataset["pageId"];
    const rects = this.mapper
      .getSelectionRects(range)
      .filter((r) => r.pageId === pageId);

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
