import { Component, createSignal, onMount, For, Show } from "solid-js";
import { render } from "solid-js/web";

export interface TablePickerProps {
  onTableSelected: (rows: number, cols: number) => void;
  anchor: HTMLElement;
}

export const TablePickerComponent: Component<TablePickerProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [highlighted, setHighlighted] = createSignal({ rows: 0, cols: 0 });
  const [dropdownPos, setDropdownPos] = createSignal({ top: 0, left: 0 });

  onMount(() => {
    const closeDropdown = () => setIsOpen(false);
    window.addEventListener("click", closeDropdown);

    const toggle = (e: MouseEvent) => {
      e.stopPropagation();
      const open = !isOpen();
      setIsOpen(open);
      if (open) {
        const rect = props.anchor.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
        setHighlighted({ rows: 0, cols: 0 });
      }
    };

    props.anchor.addEventListener("click", toggle);

    return () => {
      window.removeEventListener("click", closeDropdown);
      props.anchor.removeEventListener("click", toggle);
    };
  });

  const selectColor = (rows: number, cols: number, e: MouseEvent) => {
    e.stopPropagation();
    props.onTableSelected(rows, cols);
    setIsOpen(false);
  };

  return (
    <Show when={isOpen()}>
      <div
        class="oasis-table-picker-dropdown show"
        style={{
          top: `${dropdownPos().top}px`,
          left: `${dropdownPos().left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="oasis-table-picker-info">
          {highlighted().rows} x {highlighted().cols} Table
        </div>
        <div class="oasis-table-picker-grid">
          <For each={Array.from({ length: 100 })}>
            {(_, i) => {
              const r = Math.floor(i() / 10) + 1;
              const c = (i() % 10) + 1;
              return (
                <div
                  class="oasis-table-picker-cell"
                  classList={{
                    highlight: r <= highlighted().rows && c <= highlighted().cols,
                  }}
                  onMouseOver={() => setHighlighted({ rows: r, cols: c })}
                  onClick={(e) => selectColor(r, c, e)}
                ></div>
              );
            }}
          </For>
        </div>
      </div>
    </Show>
  );
};

export class TablePicker {
  private dispose: () => void;

  constructor(buttonId: string, listener: { onTableSelected: (rows: number, cols: number) => void }) {
    const btn = document.getElementById(buttonId);
    if (!btn) throw new Error(`Button #${buttonId} not found`);

    this.dispose = render(() => (
      <TablePickerComponent 
        anchor={btn}
        onTableSelected={listener.onTableSelected} 
      />
    ), document.body);
  }

  destroy(): void {
    this.dispose();
  }
}
