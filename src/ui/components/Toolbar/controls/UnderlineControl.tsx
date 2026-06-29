import { For, Show, createSignal, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { EditorUnderlineStyle } from "@/core/model.js";
import { SplitButton } from "@/ui/components/Toolbar/primitives/SplitButton.js";
import { UNDERLINE_STYLE_OPTIONS } from "@/ui/components/Toolbar/underlineStyles.js";

import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

const mod = /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl";
const TEST_ID = "editor-toolbar-underline";

/**
 * Underline split-button control — toggle plus a style picker, dispatching only
 * through the `underline` and `setUnderlineStyle` commands.
 */
export function UnderlineControl(props: {
  api: ToolbarActionApi;
}): JSX.Element {
  const t = useI18n();
  const underlineButtonTooltip = `${t("toolbar.underline")} (${mod}+U)`;
  const api = props.api;
  const [lastUnderlineStyle, setLastUnderlineStyle] =
    createSignal<EditorUnderlineStyle>("single");
  const [open, setOpen] = createSignal(false);

  const active = (): boolean => api.commands.state("underline").isActive;
  const currentStyle = (): string =>
    String(api.commands.state("setUnderlineStyle").value ?? "");

  const toggleUnderline = (): void => {
    if (!active()) {
      const style = lastUnderlineStyle();
      if (style !== "single" && !currentStyle()) {
        api.commands.execute("setUnderlineStyle", style);
      }
    }
    api.commands.execute("underline");
  };

  const applyUnderlineStyle = (style: EditorUnderlineStyle): void => {
    setLastUnderlineStyle(style);
    const wasActive = active();
    api.commands.execute(
      "setUnderlineStyle",
      style === "single" ? null : style,
    );
    if (!wasActive) api.commands.execute("underline");
  };

  const removeUnderline = (): void => {
    if (active()) api.commands.execute("underline");
    api.commands.execute("setUnderlineStyle", null);
  };

  const indicatorStyle = (): string =>
    (currentStyle() || lastUnderlineStyle() || "single").toLowerCase();
  const activeStyleValue = (): string =>
    (currentStyle() || (active() ? "single" : "")).toLowerCase();

  return (
    <SplitButton
      open={open()}
      onOpenChange={setOpen}
      tooltip={underlineButtonTooltip}
      rootActive={open() || active()}
      mainTestId={TEST_ID}
      mainPressed={active()}
      onMain={toggleUnderline}
      menuTestId={`${TEST_ID}-dropdown`}
      panelClass="oasis-editor-color-menu oasis-editor-underline-menu"
      panelRole="menu"
      mainContent={
        <span class="oasis-editor-color-split-icon oasis-editor-underline-split-icon">
          <span class="oasis-editor-underline-split-glyph" aria-hidden="true">
            U
          </span>
          <span
            class="oasis-editor-underline-split-indicator"
            data-style={indicatorStyle()}
          />
        </span>
      }
    >
      <button
        type="button"
        class="oasis-editor-color-menu-action"
        data-testid={`${TEST_ID}-remove`}
        role="menuitem"
        onClick={(): void => {
          removeUnderline();
          setOpen(false);
        }}
      >
        <span class="oasis-editor-color-menu-action-swatch">
          <i data-lucide="slash" />
        </span>
        <span>{t("toolbar.underlineRemove")}</span>
      </button>
      <div class="oasis-editor-underline-menu-list">
        <For each={UNDERLINE_STYLE_OPTIONS}>
          {(option): JSX.Element => {
            const isActive = (): boolean =>
              active() && activeStyleValue() === option.value.toLowerCase();
            return (
              <button
                type="button"
                class="oasis-editor-underline-menu-item"
                classList={{
                  "oasis-editor-underline-menu-item-active": isActive(),
                }}
                role="menuitemradio"
                aria-checked={isActive()}
                data-testid={`${TEST_ID}-style-${option.value}`}
                onClick={(): void => {
                  applyUnderlineStyle(option.value);
                  setOpen(false);
                }}
                title={t(option.labelKey)}
              >
                <span class="oasis-editor-underline-menu-preview">
                  <Show
                    when={option.preview.svg}
                    fallback={
                      <span
                        class="oasis-editor-underline-menu-stroke"
                        style={
                          option.preview.borderStyle === "wavy"
                            ? undefined
                            : {
                                "border-bottom-style":
                                  option.preview.borderStyle,
                                "border-bottom-width":
                                  option.preview.borderBottomWidth ?? "1px",
                              }
                        }
                      />
                    }
                  >
                    <span
                      class="oasis-editor-underline-menu-stroke oasis-editor-underline-menu-stroke-svg"
                      innerHTML={option.preview.svg}
                    />
                  </Show>
                </span>
                <span class="oasis-editor-underline-menu-label">
                  {t(option.labelKey)}
                </span>
              </button>
            );
          }}
        </For>
      </div>
    </SplitButton>
  );
}
