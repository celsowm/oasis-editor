import { For, Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";

export type ColorSplitButtonKind = "color" | "highlight";

interface ColorSwatch {
  name: string;
  value: string;
}

interface ThemeColor {
  name: string;
  values: string[];
}

export interface ColorSplitButtonProps {
  kind: ColorSplitButtonKind;
  icon: string;
  value: string | null | undefined;
  defaultValue: string;
  lastValue: string;
  tooltip: string;
  testId: string;
  automaticLabel?: string;
  noColorLabel?: string;
  themeColorsLabel: string;
  standardColorsLabel: string;
  moreColorsLabel: string;
  onApply: (value: string | null) => void;
}

const THEME_COLORS: ThemeColor[] = [
  { name: "White", values: ["#ffffff", "#f2f2f2", "#d9d9d9", "#bfbfbf", "#7f7f7f"] },
  { name: "Black", values: ["#000000", "#262626", "#404040", "#595959", "#808080"] },
  { name: "Blue", values: ["#deebf7", "#bdd7ee", "#9dc3e6", "#5b9bd5", "#2f75b5"] },
  { name: "Orange", values: ["#fce4d6", "#f8cbad", "#f4b183", "#ed7d31", "#c55a11"] },
  { name: "Gray", values: ["#e7e6e6", "#d0cece", "#a5a5a5", "#7f7f7f", "#595959"] },
  { name: "Gold", values: ["#fff2cc", "#ffe699", "#ffd966", "#ffc000", "#bf9000"] },
  { name: "Teal", values: ["#d9ead3", "#b6d7a8", "#93c47d", "#70ad47", "#548235"] },
  { name: "Green", values: ["#e2f0d9", "#c5e0b4", "#a9d18e", "#00b050", "#385723"] },
  { name: "Purple", values: ["#e4dfec", "#d9d2e9", "#b4a7d6", "#7030a0", "#4c1d95"] },
  { name: "Red", values: ["#f4cccc", "#ea9999", "#e06666", "#c00000", "#990000"] },
];

const STANDARD_COLORS: ColorSwatch[] = [
  { name: "Dark red", value: "#c00000" },
  { name: "Red", value: "#ff0000" },
  { name: "Orange", value: "#ffc000" },
  { name: "Yellow", value: "#ffff00" },
  { name: "Light green", value: "#92d050" },
  { name: "Green", value: "#00b050" },
  { name: "Light blue", value: "#00b0f0" },
  { name: "Blue", value: "#0070c0" },
  { name: "Dark blue", value: "#002060" },
  { name: "Purple", value: "#7030a0" },
];

const normalizeColor = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

export function ColorSplitButton(props: ColorSplitButtonProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [previewColor, setPreviewColor] = createSignal<string | null>(null);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  let rootRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;
  let customColorInputRef: HTMLInputElement | undefined;

  const activeColor = () => normalizeColor(props.value);
  const displayColor = () => previewColor() || props.value || null;
  const directApplyColor = () => props.lastValue || props.value || props.defaultValue;
  const clearLabel = () => props.kind === "highlight" ? props.noColorLabel : props.automaticLabel;

  const updateCoords = () => {
    if (!rootRef || !isOpen()) return;
    const rect = rootRef.getBoundingClientRect();
    const menuWidth = menuRef?.offsetWidth || 238;
    const viewportPadding = 8;
    const preferredLeft = rect.left + window.scrollX;
    const maxLeft = window.scrollX + window.innerWidth - menuWidth - viewportPadding;
    setCoords({
      top: rect.bottom + window.scrollY,
      left: Math.max(window.scrollX + viewportPadding, Math.min(preferredLeft, maxLeft)),
    });
  };

  const close = () => {
    setIsOpen(false);
    setPreviewColor(null);
  };

  const applyColor = (value: string | null) => {
    props.onApply(value);
    close();
  };

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node;
    if (rootRef?.contains(target) || menuRef?.contains(target)) return;
    close();
  };

  createEffect(() => {
    if (isOpen()) {
      updateCoords();
      requestAnimationFrame(updateCoords);
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    } else {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    }
  });

  onMount(() => {
    window.addEventListener("mousedown", handleClickOutside);
  });

  onCleanup(() => {
    window.removeEventListener("mousedown", handleClickOutside);
    window.removeEventListener("resize", updateCoords);
    window.removeEventListener("scroll", updateCoords, true);
  });

  return (
    <div
      ref={rootRef}
      class="oasis-editor-color-split"
      classList={{ "oasis-editor-color-split-active": isOpen() }}
      title={props.tooltip}
    >
      <button
        type="button"
        class="oasis-editor-color-split-main"
        data-testid={props.testId}
        aria-label={props.tooltip}
        onClick={() => applyColor(directApplyColor())}
      >
        <span class="oasis-editor-color-split-icon">
          <i data-lucide={props.icon} />
          <span
            class="oasis-editor-color-split-indicator"
            classList={{ "oasis-editor-color-split-indicator-empty": !displayColor() }}
            style={{ "background-color": displayColor() ?? undefined }}
          />
        </span>
      </button>
      <button
        type="button"
        class="oasis-editor-color-split-menu-button"
        classList={{ "oasis-editor-color-split-open": isOpen() }}
        data-testid={`${props.testId}-dropdown`}
        aria-label={`${props.tooltip} menu`}
        aria-haspopup="menu"
        aria-expanded={isOpen()}
        onClick={() => setIsOpen(!isOpen())}
      >
        <i data-lucide="chevron-down" />
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div
            ref={menuRef}
            class="oasis-editor-color-menu"
            role="menu"
            style={{
              position: "absolute",
              top: `${coords().top + 4}px`,
              left: `${coords().left}px`,
            }}
            onMouseLeave={() => setPreviewColor(null)}
          >
            <Show when={clearLabel()}>
              <button
                type="button"
                class="oasis-editor-color-menu-action"
                data-testid={`${props.testId}-clear`}
                role="menuitem"
                onClick={() => applyColor(null)}
              >
                <span class="oasis-editor-color-menu-action-swatch">
                  <Show when={props.kind === "color"} fallback={<i data-lucide="slash" />}>
                    <i data-lucide="type" />
                  </Show>
                </span>
                <span>{clearLabel()}</span>
              </button>
            </Show>

            <div class="oasis-editor-color-menu-section">
              <div class="oasis-editor-color-menu-heading">{props.themeColorsLabel}</div>
              <div class="oasis-editor-color-theme-grid">
                <For each={THEME_COLORS}>
                  {(theme) => (
                    <div class="oasis-editor-color-theme-column">
                      <For each={theme.values}>
                        {(color) => (
                          <button
                            type="button"
                            class="oasis-editor-color-swatch"
                            classList={{
                              "oasis-editor-color-swatch-active": activeColor() === normalizeColor(color),
                            }}
                            style={{ "background-color": color }}
                            title={`${theme.name} ${color}`}
                            aria-label={`${theme.name} ${color}`}
                            data-testid={`${props.testId}-theme-swatch-${color.replace("#", "")}`}
                            onMouseEnter={() => setPreviewColor(color)}
                            onFocus={() => setPreviewColor(color)}
                            onBlur={() => setPreviewColor(null)}
                            onClick={() => applyColor(color)}
                          />
                        )}
                      </For>
                    </div>
                  )}
                </For>
              </div>
            </div>

            <div class="oasis-editor-color-menu-section">
              <div class="oasis-editor-color-menu-heading">{props.standardColorsLabel}</div>
              <div class="oasis-editor-color-standard-grid">
                <For each={STANDARD_COLORS}>
                  {(swatch) => (
                    <button
                      type="button"
                      class="oasis-editor-color-swatch"
                      classList={{
                        "oasis-editor-color-swatch-active": activeColor() === normalizeColor(swatch.value),
                      }}
                      style={{ "background-color": swatch.value }}
                      title={swatch.name}
                      aria-label={swatch.name}
                      data-testid={`${props.testId}-standard-swatch-${swatch.value.replace("#", "")}`}
                      onMouseEnter={() => setPreviewColor(swatch.value)}
                      onFocus={() => setPreviewColor(swatch.value)}
                      onBlur={() => setPreviewColor(null)}
                      onClick={() => applyColor(swatch.value)}
                    />
                  )}
                </For>
              </div>
            </div>

            <button
              type="button"
              class="oasis-editor-color-menu-action"
              data-testid={`${props.testId}-more-colors`}
              role="menuitem"
              onClick={() => customColorInputRef?.click()}
            >
              <span class="oasis-editor-color-menu-action-swatch oasis-editor-color-menu-more-swatch" />
              <span>{props.moreColorsLabel}</span>
            </button>
            <input
              ref={customColorInputRef}
              type="color"
              class="oasis-editor-color-custom-input"
              data-testid={`${props.testId}-custom-input`}
              value={displayColor() || directApplyColor()}
              onInput={(event) => applyColor(event.currentTarget.value)}
              aria-label={props.moreColorsLabel}
            />
          </div>
        </Portal>
      </Show>
    </div>
  );
}
