import { Component, For, createSignal, Show } from "solid-js";
import { useI18n } from "../I18nContext.tsx";

interface HighlightColorPickerProps {
  initialColor?: string;
  onHighlightSelected: (color: string) => void;
}

const HIGHLIGHT_COLORS = [
  { name: "yellow", color: "#fef08a" },
  { name: "green", color: "#bbf7d0" },
  { name: "cyan", color: "#a5f3fc" },
  { name: "magenta", color: "#f0abfc" },
  { name: "blue", color: "#bfdbfe" },
  { name: "red", color: "#fecaca" },
  { name: "darkBlue", color: "#60a5fa" },
  { name: "darkCyan", color: "#22d3ee" },
  { name: "darkGreen", color: "#4ade80" },
  { name: "darkMagenta", color: "#c084fc" },
  { name: "darkRed", color: "#f87171" },
  { name: "darkYellow", color: "#facc15" },
  { name: "darkGray", color: "#9ca3af" },
  { name: "lightGray", color: "#e5e7eb" },
  { name: "black", color: "#000000" },
  { name: "white", color: "#ffffff" },
];

export const HighlightColorPickerComponent: Component<HighlightColorPickerProps> = (props) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <div class="oasis-highlight-picker-wrapper">
      <button
        class="oasis-toolbar-btn oasis-highlight-picker-trigger"
        onClick={() => setIsOpen(!isOpen())}
        title={t("toolbar", "highlightColor")}
      >
        <span class="oasis-icon oasis-icon-highlight">H</span>
        <div 
          class="oasis-highlight-indicator" 
          style={{ "background-color": props.initialColor || "transparent" }}
        ></div>
        <span class="oasis-highlight-picker-arrow">▼</span>
      </button>

      <Show when={isOpen()}>
        <div class="oasis-highlight-picker-dropdown">
          <div class="oasis-highlight-picker-section">
            <button 
              class="oasis-highlight-picker-none"
              onClick={() => {
                props.onHighlightSelected("");
                setIsOpen(false);
              }}
            >
              <div class="oasis-highlight-box oasis-highlight-box-none"></div>
              <span>{t("editor", "none")}</span>
            </button>
          </div>

          <div class="oasis-highlight-picker-section">
            <div class="oasis-highlight-picker-section-title">{t("editor", "highlightColors")}</div>
            <div class="oasis-highlight-grid">
              <For each={HIGHLIGHT_COLORS}>
                {(item) => (
                  <div
                    class="oasis-highlight-swatch"
                    style={{ "background-color": item.color }}
                    title={item.name}
                    onClick={() => {
                      props.onHighlightSelected(item.name);
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
