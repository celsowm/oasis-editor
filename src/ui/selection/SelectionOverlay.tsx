import { Component, createSignal, For } from "solid-js";
import { LogicalRange } from "../../core/selection/SelectionTypes.js";
import { SelectionMapper } from "../../app/services/SelectionMapper.js";
import { render } from "solid-js/web";

export interface SelectionOverlayProps {
  range: LogicalRange | null;
  mapper: SelectionMapper;
  pageId?: string;
}

export const SelectionOverlayComponent: Component<SelectionOverlayProps> = (props) => {
  const rects = () => {
    if (!props.range || !props.mapper?.getSelectionRects) return [];
    return props.mapper
      .getSelectionRects(props.range)
      .filter((r) => !props.pageId || r.pageId === props.pageId);
  };

  return (
    <For each={rects()}>
      {(rect) => (
        <div
          class="oasis-selection-rect"
          style={{
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
        ></div>
      )}
    </For>
  );
};

export class SelectionOverlay {
  private dispose: () => void;
  private setRange: (r: LogicalRange | null) => void;
  readonly container: HTMLElement;

  constructor(container: HTMLElement, mapper: SelectionMapper) {
    this.container = container;
    const [range, setRange] = createSignal<LogicalRange | null>(null);
    this.setRange = setRange;

    const pageId = container.parentElement?.getAttribute("data-page-id") || undefined;

    this.dispose = render(() => (
      <SelectionOverlayComponent range={range()} mapper={mapper} pageId={pageId} />
    ), this.container);
  }

  render(range: LogicalRange | null): void {
    this.setRange(range);
  }

  destroy(): void {
    this.dispose();
  }
}
