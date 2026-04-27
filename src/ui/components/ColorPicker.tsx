import { Component, For, createSignal, Show } from "solid-js";
import { useI18n } from "../I18nContext.tsx";

interface ColorPickerProps {
  initialColor?: string;
  onColorSelected: (color: string) => void;
}

const THEME_COLORS = [
  "#000000", "#ffffff", "#eeece1", "#1f497d", "#4f81bd", "#c0504d", "#9bbb59", "#8064a2", "#4bacc6", "#f79646",
];

const STANDARD_COLORS = [
  "#c00000", "#ff0000", "#ffc000", "#ffff00", "#92d050", "#00b050", "#00b0f0", "#0070c0", "#002060", "#7030a0",
];

export const ColorPickerComponent: Component<ColorPickerProps> = (props) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <div class="oasis-color-picker-wrapper">
      <button
        class="oasis-toolbar-btn oasis-color-picker-trigger"
        onClick={() => setIsOpen(!isOpen())}
        title={t("toolbar", "textColor")}
      >
        <span class="oasis-icon oasis-icon-color">A</span>
        <div 
          class="oasis-color-indicator" 
          style={{ "background-color": props.initialColor || "#000000" }}
        ></div>
        <span class="oasis-color-picker-arrow">▼</span>
      </button>

      <Show when={isOpen()}>
        <div class="oasis-color-picker-dropdown">
          <div class="oasis-color-picker-section">
            <button 
              class="oasis-color-picker-automatic"
              onClick={() => {
                props.onColorSelected("#000000");
                setIsOpen(false);
              }}
            >
              <div class="oasis-color-box oasis-color-box-auto"></div>
              <span>{t("editor", "automatic")}</span>
            </button>
          </div>

          <div class="oasis-color-picker-section">
            <div class="oasis-color-picker-section-title">{t("editor", "themeColors")}</div>
            <div class="oasis-color-grid">
              <For each={THEME_COLORS}>
                {(color) => (
                  <div
                    class="oasis-color-swatch"
                    style={{ "background-color": color }}
                    onClick={() => {
                      props.onColorSelected(color);
                      setIsOpen(false);
                    }}
                  ></div>
                )}
              </For>
            </div>
          </div>

          <div class="oasis-color-picker-section">
            <div class="oasis-color-picker-section-title">{t("editor", "standardColors")}</div>
            <div class="oasis-color-grid">
              <For each={STANDARD_COLORS}>
                {(color) => (
                  <div
                    class="oasis-color-swatch"
                    style={{ "background-color": color }}
                    onClick={() => {
                      props.onColorSelected(color);
                      setIsOpen(false);
                    }}
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
