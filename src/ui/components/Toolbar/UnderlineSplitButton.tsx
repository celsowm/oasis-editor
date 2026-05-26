import { For, Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import type { EditorUnderlineStyle } from "../../../core/model.js";
import { UNDERLINE_STYLE_OPTIONS } from "./underlineStyles.js";

export interface UnderlineSplitButtonProps {
  /** Whether the current selection has the underline boolean set. */
  active: boolean;
  /** Current uniform underline style of the selection (empty when mixed or default). */
  currentStyle: string;
  /** Last user-chosen style — used when the user clicks the main button. */
  lastStyle: EditorUnderlineStyle;
  tooltip: string;
  testId: string;
  removeLabel: string;
  moreLabel?: string;
  /** Toggle the underline boolean (main button). */
  onToggleUnderline: () => void;
  /** Apply a specific style and ensure underline is on. */
  onApplyStyle: (style: EditorUnderlineStyle) => void;
  /** Explicitly remove underline. */
  onRemoveUnderline: () => void;
}

export function UnderlineSplitButton(props: UnderlineSplitButtonProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  let rootRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  const close = () => setIsOpen(false);

  const updateCoords = () => {
    if (!rootRef || !isOpen()) return;
    const rect = rootRef.getBoundingClientRect();
    const menuWidth = menuRef?.offsetWidth || 220;
    const viewportPadding = 8;
    const preferredLeft = rect.left + window.scrollX;
    const maxLeft = window.scrollX + window.innerWidth - menuWidth - viewportPadding;
    setCoords({
      top: rect.bottom + window.scrollY,
      left: Math.max(window.scrollX + viewportPadding, Math.min(preferredLeft, maxLeft)),
    });
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

  const activeStyleValue = () => (props.currentStyle || (props.active ? "single" : "")).toLowerCase();

  return (
    <div
      ref={rootRef}
      class="oasis-editor-color-split"
      classList={{ "oasis-editor-color-split-active": isOpen() || props.active }}
      title={props.tooltip}
    >
      <button
        type="button"
        class="oasis-editor-color-split-main"
        data-testid={props.testId}
        aria-label={props.tooltip}
        aria-pressed={props.active}
        onClick={() => props.onToggleUnderline()}
      >
        <span class="oasis-editor-color-split-icon oasis-editor-underline-split-icon">
          <span class="oasis-editor-underline-split-glyph" aria-hidden="true">U</span>
          <span
            class="oasis-editor-underline-split-indicator"
            data-style={(props.currentStyle || props.lastStyle || "single").toLowerCase()}
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
            class="oasis-editor-color-menu oasis-editor-underline-menu"
            role="menu"
            style={{
              position: "absolute",
              top: `${coords().top + 4}px`,
              left: `${coords().left}px`,
            }}
          >
            <button
              type="button"
              class="oasis-editor-color-menu-action"
              data-testid={`${props.testId}-remove`}
              role="menuitem"
              onClick={() => {
                props.onRemoveUnderline();
                close();
              }}
            >
              <span class="oasis-editor-color-menu-action-swatch">
                <i data-lucide="slash" />
              </span>
              <span>{props.removeLabel}</span>
            </button>
            <div class="oasis-editor-underline-menu-list">
              <For each={UNDERLINE_STYLE_OPTIONS}>
                {(option) => (
                  <button
                    type="button"
                    class="oasis-editor-underline-menu-item"
                    classList={{
                      "oasis-editor-underline-menu-item-active":
                        props.active && activeStyleValue() === option.value.toLowerCase(),
                    }}
                    role="menuitemradio"
                    aria-checked={
                      props.active && activeStyleValue() === option.value.toLowerCase()
                    }
                    data-testid={`${props.testId}-style-${option.value}`}
                    onClick={() => {
                      props.onApplyStyle(option.value);
                      close();
                    }}
                    title={option.label}
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
                                    "border-bottom-style": option.preview.borderStyle,
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
                    <span class="oasis-editor-underline-menu-label">{option.label}</span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
}
