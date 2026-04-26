import { Component, createSignal, onMount, For, Show } from "solid-js";
import { THEME_COLORS, STANDARD_COLORS } from "./ColorPalette.js";
import { createIcons, icons } from "lucide";
import { render } from "solid-js/web";

export interface ColorPickerProps {
  onColorSelected: (color: string) => void;
  initialColor?: string;
}

export const ColorPickerComponent: Component<ColorPickerProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [currentColor, setCurrentColor] = createSignal(props.initialColor || "#000000");
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (containerRef) {
      createIcons({ icons, nameAttr: "data-lucide", root: containerRef });
    }

    const closeDropdown = () => setIsOpen(false);
    window.addEventListener("click", closeDropdown);
    return () => window.removeEventListener("click", closeDropdown);
  });

  const toggleDropdown = (e: MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen());
  };

  const selectColor = (color: string) => {
    setCurrentColor(color);
    props.onColorSelected(color);
    setIsOpen(false);
  };

  return (
    <div class="oasis-color-picker" ref={containerRef}>
      <button
        class="oasis-color-picker-button"
        title="Text Color"
        type="button"
        onClick={toggleDropdown}
      >
        <div class="oasis-color-picker-left">
          <span class="oasis-color-picker-icon">
            <i data-lucide="baseline"></i>
          </span>
          <div
            class="oasis-color-picker-indicator"
            style={{ "background-color": currentColor() }}
          ></div>
        </div>
        <span class="oasis-color-picker-arrow">▼</span>
      </button>

      <Show when={isOpen()}>
        <div class="oasis-color-picker-dropdown show">
          <div
            class="oasis-color-picker-automatic"
            onClick={() => selectColor("#000000")}
          >
            <div class="oasis-color-picker-automatic-square"></div>
            <span>Automatic</span>
          </div>

          <div class="oasis-color-picker-section">
            <div class="oasis-color-picker-section-title">Theme Colors</div>
            <div class="oasis-color-picker-grid">
              <For each={THEME_COLORS.flat()}>
                {(swatch) => (
                  <div
                    class="oasis-color-picker-swatch"
                    title={swatch.name}
                    style={{ "background-color": swatch.color }}
                    onClick={() => selectColor(swatch.color)}
                  ></div>
                )}
              </For>
            </div>
          </div>

          <div class="oasis-color-picker-section">
            <div class="oasis-color-picker-section-title">Standard Colors</div>
            <div class="oasis-color-picker-grid">
              <For each={STANDARD_COLORS}>
                {(swatch) => (
                  <div
                    class="oasis-color-picker-swatch"
                    title={swatch.name}
                    style={{ "background-color": swatch.color }}
                    onClick={() => selectColor(swatch.color)}
                  ></div>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

// Legacy wrapper to maintain compatibility with existing controllers/view
export class ColorPicker {
  private dispose: () => void;
  private setColorSignal: (color: string) => void;

  constructor(containerId: string, listener: { onColorSelected: (color: string) => void }) {
    const parent = document.getElementById(containerId);
    if (!parent) throw new Error(`Container #${containerId} not found`);

    const [color, setColor] = createSignal("#000000");
    this.setColorSignal = setColor;

    this.dispose = render(() => (
      <ColorPickerComponent 
        onColorSelected={listener.onColorSelected} 
        initialColor={color()} 
      />
    ), parent);
  }

  setCurrentColor(color: string): void {
    this.setColorSignal(color);
  }

  destroy(): void {
    this.dispose();
  }
}
