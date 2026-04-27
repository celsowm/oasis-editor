import { Component, createSignal, onMount, createEffect, onCleanup, For, Show } from "solid-js";
import { THEME_COLORS, STANDARD_COLORS } from "./ColorPalette.js";
import { render, Portal } from "solid-js/web";
import { ColorPickerListener } from "../../app/events/ViewEventBindings.js";
import { dropdownManager } from "./DropdownManager.js";

export interface ColorPickerProps {
  onColorSelected: (color: string) => void;
  initialColor?: string;
}

export const ColorPickerComponent: Component<ColorPickerProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [currentColor, setCurrentColor] = createSignal(props.initialColor || "#000000");
  let buttonRef: HTMLButtonElement | undefined;
  let dropdownRef: HTMLDivElement | undefined;

  const closeSelf = () => {
    setIsOpen(false);
  };

  const openSelf = () => {
    dropdownManager.closeAll(closeSelf);
    setIsOpen(true);
  };

  const positionDropdown = () => {
    if (!dropdownRef || !buttonRef) return;
    const rect = buttonRef.getBoundingClientRect();
    dropdownRef.style.position = "fixed";
    dropdownRef.style.top = `${rect.bottom + 4}px`;
    dropdownRef.style.left = `${rect.left}px`;
  };

  onMount(() => {
    // Icons are auto-scanned by IconManager
    dropdownManager.register(closeSelf);
    onCleanup(() => dropdownManager.unregister(closeSelf));
  });

  createEffect(() => {
    if (isOpen()) {
      requestAnimationFrame(() => positionDropdown());
    }
  });

  const toggleDropdown = (e: MouseEvent) => {
    e.stopPropagation();
    if (isOpen()) {
      closeSelf();
    } else {
      openSelf();
    }
  };

  const selectColor = (color: string) => {
    setCurrentColor(color);
    props.onColorSelected(color);
    closeSelf();
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (isOpen() && buttonRef && !buttonRef.contains(e.target as Node)) {
      closeSelf();
    }
  };

  onMount(() => {
    window.addEventListener("click", handleClickOutside);
    onCleanup(() => window.removeEventListener("click", handleClickOutside));
  });

  return (
    <div class="oasis-color-picker">
      <button
        ref={buttonRef}
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
        <Portal>
          <div
            ref={dropdownRef}
            class="oasis-color-picker-dropdown show"
            style={{ position: "fixed", "z-index": "10000" }}
          >
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
        </Portal>
      </Show>
    </div>
  );
};

export class ColorPicker {
  private dispose: () => void;
  private setColorSignal: (color: string) => void;

  constructor(containerId: string, listener: ColorPickerListener) {
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
