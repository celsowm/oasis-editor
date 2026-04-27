import { Component, createSignal, onMount, createEffect, onCleanup, For, Show } from "solid-js";
import { render, Portal } from "solid-js/web";
import { dropdownManager } from "./DropdownManager.js";

export const HIGHLIGHT_SWATCHES = [
  { key: "yellow", color: "#fef08a", label: "Amarelo" },
  { key: "green", color: "#bbf7d0", label: "Verde" },
  { key: "cyan", color: "#a5f3fc", label: "Ciano" },
  { key: "magenta", color: "#f0abfc", label: "Magenta" },
  { key: "blue", color: "#bfdbfe", label: "Azul" },
  { key: "red", color: "#fecaca", label: "Vermelho" },
  { key: "darkBlue", color: "#60a5fa", label: "Azul escuro" },
  { key: "darkCyan", color: "#22d3ee", label: "Ciano escuro" },
  { key: "darkGreen", color: "#4ade80", label: "Verde escuro" },
  { key: "darkMagenta", color: "#c084fc", label: "Magenta escuro" },
  { key: "darkRed", color: "#f87171", label: "Vermelho escuro" },
  { key: "darkYellow", color: "#facc15", label: "Amarelo escuro" },
  { key: "darkGray", color: "#9ca3af", label: "Cinza escuro" },
  { key: "lightGray", color: "#e5e7eb", label: "Cinza claro" },
  { key: "black", color: "#000000", label: "Preto" },
  { key: "white", color: "#ffffff", label: "Branco" },
] as const;

export interface HighlightColorPickerListener {
  onHighlightSelected: (key: string) => void;
}

export interface HighlightColorPickerProps {
  onHighlightSelected: (key: string) => void;
  initialColor?: string;
}

export const HighlightColorPickerComponent: Component<HighlightColorPickerProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [currentKey, setCurrentKey] = createSignal(props.initialColor || "");
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

  const selectHighlight = (key: string) => {
    setCurrentKey(key);
    props.onHighlightSelected(key);
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

  const currentSwatch = HIGHLIGHT_SWATCHES.find((s) => s.key === currentKey());

  return (
    <div class="oasis-highlight-picker">
      <button
        ref={buttonRef}
        class="oasis-highlight-picker-button"
        title="Cor de destaque"
        type="button"
        onClick={toggleDropdown}
      >
        <div class="oasis-highlight-picker-left">
          <span class="oasis-highlight-picker-icon">
            <i data-lucide="highlighter"></i>
          </span>
          <div
            class="oasis-highlight-picker-indicator"
            style={{ "background-color": currentSwatch?.color || "transparent", border: "1px solid #ccc" }}
          ></div>
        </div>
        <span class="oasis-highlight-picker-arrow">▼</span>
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div
            ref={dropdownRef}
            class="oasis-highlight-picker-dropdown show"
            style={{ position: "fixed", "z-index": "10000" }}
          >
            <div
              class="oasis-highlight-picker-automatic"
              onClick={() => selectHighlight("")}
            >
              <div class="oasis-highlight-picker-automatic-square"></div>
              <span>Nenhum</span>
            </div>

            <div class="oasis-highlight-picker-section">
              <div class="oasis-highlight-picker-section-title">Cores de destaque</div>
              <div class="oasis-highlight-picker-grid">
                <For each={HIGHLIGHT_SWATCHES}>
                  {(swatch) => (
                    <div
                      class={`oasis-highlight-picker-swatch ${currentKey() === swatch.key ? "active" : ""}`}
                      title={swatch.label}
                      style={{ "background-color": swatch.color }}
                      onClick={() => selectHighlight(swatch.key)}
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

export class HighlightColorPicker {
  private dispose: () => void;
  private setKeySignal: (key: string) => void;

  constructor(containerId: string, listener: HighlightColorPickerListener) {
    const parent = document.getElementById(containerId);
    if (!parent) throw new Error(`Container #${containerId} not found`);

    const [key, setKey] = createSignal("");
    this.setKeySignal = setKey;

    this.dispose = render(() => (
      <HighlightColorPickerComponent
        onHighlightSelected={listener.onHighlightSelected}
        initialColor={key()}
      />
    ), parent);
  }

  setCurrentColor(key: string): void {
    this.setKeySignal(key);
  }

  destroy(): void {
    this.dispose();
  }
}
