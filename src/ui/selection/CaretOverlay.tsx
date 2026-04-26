import { Component, createSignal, Show } from "solid-js";
import { LogicalPosition } from "../../core/selection/SelectionTypes.js";
import { SelectionMapper } from "../../app/services/SelectionMapper.js";
import { render } from "solid-js/web";

export interface CaretOverlayProps {
  position: LogicalPosition | null;
  mapper: SelectionMapper;
}

export const CaretOverlayComponent: Component<CaretOverlayProps> = (props) => {
  const rect = () => {
    if (!props.position || !props.mapper?.getCaretRect) return null;
    return props.mapper.getCaretRect(props.position);
  };

  return (
    <Show when={rect()}>
      {(r) => (
        <div 
          class="oasis-caret" 
          style={{ 
            left: `${r().x}px`, 
            top: `${r().y}px`, 
            height: `${r().height}px` 
          }}
        ></div>
      )}
    </Show>
  );
};

export class CaretOverlay {
  private dispose: () => void;
  private setPosition: (p: LogicalPosition | null) => void;

  constructor(container: HTMLElement, mapper: SelectionMapper) {
    const [position, setPosition] = createSignal<LogicalPosition | null>(null);
    this.setPosition = setPosition;

    this.dispose = render(() => (
      <CaretOverlayComponent position={position()} mapper={mapper} />
    ), container);
  }

  render(position: LogicalPosition | null): void {
    this.setPosition(position);
  }

  destroy(): void {
    this.dispose();
  }
}
