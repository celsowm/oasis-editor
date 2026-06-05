import { For, Show, createSignal, type JSX } from "solid-js";
import { SplitButton } from "./SplitButton.js";
import type { ColorPalette } from "../schema/palette.js";

export type ColorPickerKind = "color" | "highlight";

export interface ColorPickerProps {
  kind: ColorPickerKind;
  icon: string;
  value: string | null | undefined;
  defaultValue: string;
  lastValue: string;
  tooltip: string;
  testId: string;
  palette: ColorPalette;
  automaticLabel?: string;
  noColorLabel?: string;
  themeColorsLabel: string;
  standardColorsLabel: string;
  moreColorsLabel: string;
  onApply: (value: string | null) => void;
}

const normalizeColor = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";

/** Configurable color/highlight picker. Palette comes from props. */
export function ColorPicker(props: ColorPickerProps): JSX.Element {
  const [isOpen, setIsOpen] = createSignal(false);
  const [previewColor, setPreviewColor] = createSignal<string | null>(null);
  let customColorInputRef: HTMLInputElement | undefined;

  const activeColor = () => normalizeColor(props.value);
  const displayColor = () => previewColor() || props.value || null;
  const directApplyColor = () =>
    props.lastValue || props.value || props.defaultValue;
  const clearLabel = () =>
    props.kind === "highlight" ? props.noColorLabel : props.automaticLabel;

  const close = () => {
    setIsOpen(false);
    setPreviewColor(null);
  };

  const applyColor = (value: string | null) => {
    props.onApply(value);
    close();
  };

  return (
    <SplitButton
      open={isOpen()}
      onOpenChange={(open) => (open ? setIsOpen(true) : close())}
      tooltip={props.tooltip}
      panelClass="oasis-editor-color-menu"
      panelRole="menu"
      onPanelMouseLeave={() => setPreviewColor(null)}
      mainTestId={props.testId}
      mainAriaLabel={props.tooltip}
      onMain={() => applyColor(directApplyColor())}
      menuTestId={`${props.testId}-dropdown`}
      menuAriaLabel={`${props.tooltip} menu`}
      mainContent={
        <span class="oasis-editor-color-split-icon">
          <i data-lucide={props.icon} />
          <span
            class="oasis-editor-color-split-indicator"
            classList={{
              "oasis-editor-color-split-indicator-empty": !displayColor(),
            }}
            style={{ "background-color": displayColor() ?? undefined }}
          />
        </span>
      }
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
            <Show
              when={props.kind === "color"}
              fallback={<i data-lucide="slash" />}
            >
              <i data-lucide="type" />
            </Show>
          </span>
          <span>{clearLabel()}</span>
        </button>
      </Show>

      <div class="oasis-editor-color-menu-section">
        <div class="oasis-editor-color-menu-heading">
          {props.themeColorsLabel}
        </div>
        <div class="oasis-editor-color-theme-grid">
          <For each={props.palette.themeColors}>
            {(theme) => (
              <div class="oasis-editor-color-theme-column">
                <For each={theme.values}>
                  {(color) => (
                    <button
                      type="button"
                      class="oasis-editor-color-swatch"
                      classList={{
                        "oasis-editor-color-swatch-active":
                          activeColor() === normalizeColor(color),
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
        <div class="oasis-editor-color-menu-heading">
          {props.standardColorsLabel}
        </div>
        <div class="oasis-editor-color-standard-grid">
          <For each={props.palette.standardColors}>
            {(swatch) => (
              <button
                type="button"
                class="oasis-editor-color-swatch"
                classList={{
                  "oasis-editor-color-swatch-active":
                    activeColor() === normalizeColor(swatch.value),
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

      <Show when={props.palette.allowCustom ?? true}>
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
      </Show>
    </SplitButton>
  );
}
