import { For, Show, createSignal, type JSX } from "solid-js";
import { ColorGrids } from "./ColorGrids.js";
import { WideMenuButton } from "./WideMenuButton.js";
import type { ColorPalette } from "@/ui/components/Toolbar/schema/palette.js";
import type { EditorImageBorder, EditorLineDash } from "@/core/model.js";
import type { ImageBorderPatch } from "@/core/commands/image.js";
import {
  PICTURE_BORDER_WEIGHTS_PT,
  dashPreviewArray,
  formatBorderWeight,
} from "@/ui/components/Toolbar/pictureBorderPresets.js";

export interface PictureBorderPickerProps {
  /** The outline currently on the selected picture, or `null`. */
  border: EditorImageBorder | null;
  palette: ColorPalette;
  disabled?: boolean;
  testId: string;
  label: string;
  noOutlineLabel: string;
  moreColorsLabel: string;
  weightLabel: string;
  dashesLabel: string;
  themeColorsLabel: string;
  standardColorsLabel: string;
  /** Ordered dash presets with their translated names. */
  dashOptions: Array<{ value: EditorLineDash; label: string }>;
  onApply: (patch: ImageBorderPatch) => void;
}

/** Which flyout is expanded. Only one at a time, like Word. */
type Submenu = "weight" | "dashes" | null;

/**
 * Word's Picture Border popup: theme/standard colour grids, "No Outline",
 * "More Outline Colors…", and Weight/Dashes flyouts. Purely presentational —
 * every action reports a partial patch, so a colour pick keeps the current
 * weight and vice-versa.
 *
 * The flyouts render *inside* the popover panel rather than in their own
 * portal: `Popover`'s dismiss watcher only knows about the trigger and the
 * panel, so a portalled child would read as an outside click and close its own
 * parent.
 */
export function PictureBorderPicker(
  props: PictureBorderPickerProps,
): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [submenu, setSubmenu] = createSignal<Submenu>(null);
  let customColorInputRef: HTMLInputElement | undefined;

  const activeColor = (): string => props.border?.color.toLowerCase() ?? "";

  const close = (): void => {
    setOpen(false);
    setSubmenu(null);
  };

  const apply = (patch: ImageBorderPatch): void => {
    props.onApply(patch);
    close();
  };

  const toggleSubmenu = (next: Exclude<Submenu, null>): void => {
    setSubmenu((current): Submenu => (current === next ? null : next));
  };

  return (
    <WideMenuButton
      open={open()}
      onOpenChange={(next): void => {
        if (next) setOpen(true);
        else close();
      }}
      icon="square"
      label={props.label}
      tooltip={props.label}
      testId={props.testId}
      disabled={props.disabled}
      indicatorColor={props.border?.color ?? null}
      panelClass="oasis-editor-picture-border-menu"
    >
      <ColorGrids
        palette={props.palette}
        themeColorsLabel={props.themeColorsLabel}
        standardColorsLabel={props.standardColorsLabel}
        activeColor={activeColor()}
        testId={props.testId}
        onPreview={(): void => undefined}
        onPick={(color): void => apply({ color })}
      />

      <button
        type="button"
        class="oasis-editor-color-menu-action"
        data-testid={`${props.testId}-none`}
        role="menuitem"
        onClick={(): void => apply({ color: null })}
      >
        <span class="oasis-editor-color-menu-action-swatch">
          <i data-lucide="slash" />
        </span>
        <span>{props.noOutlineLabel}</span>
      </button>

      <button
        type="button"
        class="oasis-editor-color-menu-action"
        data-testid={`${props.testId}-more-colors`}
        role="menuitem"
        onClick={(): void | undefined => customColorInputRef?.click()}
      >
        <span class="oasis-editor-color-menu-action-swatch oasis-editor-color-menu-more-swatch" />
        <span>{props.moreColorsLabel}</span>
      </button>
      <input
        ref={customColorInputRef}
        type="color"
        class="oasis-editor-color-custom-input"
        data-testid={`${props.testId}-custom-input`}
        value={props.border?.color ?? "#000000"}
        onInput={(event): void => apply({ color: event.currentTarget.value })}
        aria-label={props.moreColorsLabel}
      />

      <div class="oasis-editor-picture-border-submenu-row">
        <button
          type="button"
          class="oasis-editor-color-menu-action oasis-editor-picture-border-submenu-trigger"
          classList={{
            "oasis-editor-picture-border-submenu-open": submenu() === "weight",
          }}
          data-testid={`${props.testId}-weight`}
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={submenu() === "weight"}
          onClick={(): void => toggleSubmenu("weight")}
        >
          <span class="oasis-editor-color-menu-action-swatch">
            <i data-lucide="minus" />
          </span>
          <span>{props.weightLabel}</span>
          <i
            data-lucide="chevron-right"
            class="oasis-editor-dropdown-chevron"
          />
        </button>
        <Show when={submenu() === "weight"}>
          <div class="oasis-editor-picture-border-flyout" role="menu">
            <For each={PICTURE_BORDER_WEIGHTS_PT}>
              {(widthPt): JSX.Element => {
                const isActive = (): boolean =>
                  props.border?.widthPt === widthPt;
                return (
                  <button
                    type="button"
                    class="oasis-editor-picture-border-option"
                    classList={{
                      "oasis-editor-picture-border-option-active": isActive(),
                    }}
                    role="menuitemradio"
                    aria-checked={isActive()}
                    data-testid={`${props.testId}-weight-${widthPt}`}
                    onClick={(): void => apply({ widthPt })}
                  >
                    <span
                      class="oasis-editor-picture-border-preview"
                      style={{ "border-bottom-width": `${widthPt}pt` }}
                    />
                    <span class="oasis-editor-picture-border-option-label">
                      {`${formatBorderWeight(widthPt)} pt`}
                    </span>
                  </button>
                );
              }}
            </For>
          </div>
        </Show>
      </div>

      <div class="oasis-editor-picture-border-submenu-row">
        <button
          type="button"
          class="oasis-editor-color-menu-action oasis-editor-picture-border-submenu-trigger"
          classList={{
            "oasis-editor-picture-border-submenu-open": submenu() === "dashes",
          }}
          data-testid={`${props.testId}-dashes`}
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={submenu() === "dashes"}
          onClick={(): void => toggleSubmenu("dashes")}
        >
          <span class="oasis-editor-color-menu-action-swatch">
            <i data-lucide="align-justify" />
          </span>
          <span>{props.dashesLabel}</span>
          <i
            data-lucide="chevron-right"
            class="oasis-editor-dropdown-chevron"
          />
        </button>
        <Show when={submenu() === "dashes"}>
          <div class="oasis-editor-picture-border-flyout" role="menu">
            <For each={props.dashOptions}>
              {(option): JSX.Element => {
                const isActive = (): boolean =>
                  props.border !== null &&
                  (props.border.dash ?? "solid") === option.value;
                return (
                  <button
                    type="button"
                    class="oasis-editor-picture-border-option"
                    classList={{
                      "oasis-editor-picture-border-option-active": isActive(),
                    }}
                    role="menuitemradio"
                    aria-checked={isActive()}
                    data-testid={`${props.testId}-dash-${option.value}`}
                    title={option.label}
                    onClick={(): void => apply({ dash: option.value })}
                  >
                    <svg
                      class="oasis-editor-picture-border-preview-svg"
                      viewBox="0 0 48 4"
                      aria-hidden="true"
                    >
                      <line
                        x1="0"
                        y1="2"
                        x2="48"
                        y2="2"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-dasharray={dashPreviewArray(option.value)}
                      />
                    </svg>
                    <span class="oasis-editor-picture-border-option-label">
                      {option.label}
                    </span>
                  </button>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
    </WideMenuButton>
  );
}
