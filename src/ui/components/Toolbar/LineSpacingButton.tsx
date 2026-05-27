import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import { t } from "../../../i18n/index.js";
import { LineSpacingDialog, type LineSpacingDialogApplyValues, type LineSpacingDialogInitialValues } from "../Dialogs/LineSpacingDialog.js";
import type { EditorToolbarCtx } from "./types.js";

const PRESET_VALUES: number[] = [1.0, 1.15, 1.5, 2.0, 2.5, 3.0];

function formatPreset(value: number): string {
  return value.toFixed(value === Math.floor(value) ? 1 : 2);
}

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}

export interface LineSpacingButtonProps {
  ctx: () => EditorToolbarCtx;
}

export function LineSpacingButton(props: LineSpacingButtonProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [dialogInitial, setDialogInitial] = createSignal<LineSpacingDialogInitialValues>({
    lineHeight: "",
    spacingBefore: "",
    spacingAfter: "",
  });

  let buttonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  const ctx = props.ctx;
  const styleState = () => ctx().toolbarStyleState();

  const currentLineHeight = createMemo<number | null>(() => {
    const raw = styleState().lineHeight;
    if (raw === undefined || raw === null || raw === "") return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  });

  const close = () => setIsOpen(false);

  const updateCoords = () => {
    if (!buttonRef || !isOpen()) return;
    const rect = buttonRef.getBoundingClientRect();
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
    if (buttonRef?.contains(target) || menuRef?.contains(target)) return;
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

  const applyPreset = (value: number) => {
    ctx().applyParagraphStyleCommand("lineHeight", value);
    ctx().focusInput();
    close();
  };

  const openDialog = () => {
    const s = styleState();
    setDialogInitial({
      lineHeight: s.lineHeight ?? "",
      spacingBefore: s.spacingBefore ?? "",
      spacingAfter: s.spacingAfter ?? "",
    });
    setDialogOpen(true);
    close();
  };

  const handleDialogApply = (
    values: LineSpacingDialogApplyValues,
    original: LineSpacingDialogInitialValues,
  ) => {
    const originalLH = original.lineHeight ? Number(original.lineHeight) : null;
    const originalSB = original.spacingBefore ? Number(original.spacingBefore) : null;
    const originalSA = original.spacingAfter ? Number(original.spacingAfter) : null;

    if (values.lineHeight !== originalLH) {
      ctx().applyParagraphStyleCommand("lineHeight", values.lineHeight);
    }
    if (values.spacingBefore !== originalSB) {
      ctx().applyParagraphStyleCommand("spacingBefore", values.spacingBefore);
    }
    if (values.spacingAfter !== originalSA) {
      ctx().applyParagraphStyleCommand("spacingAfter", values.spacingAfter);
    }
    ctx().focusInput();
  };

  return (
    <div class="oasis-editor-toolbar-dropdown">
      <button
        ref={buttonRef}
        type="button"
        class="oasis-editor-tool-button oasis-editor-tool-button-dropdown oasis-editor-line-spacing-button"
        classList={{ "oasis-editor-tool-button-active": isOpen() }}
        onClick={() => setIsOpen(!isOpen())}
        title={t("metric.lineSpacing")}
        aria-label={t("metric.lineSpacing")}
        aria-haspopup="menu"
        aria-expanded={isOpen()}
        data-testid="editor-toolbar-line-spacing"
      >
        <span class="oasis-editor-line-spacing-icon" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            {/* Up arrow head */}
            <polyline points="4 7 7 4 10 7" />
            {/* Vertical shaft */}
            <line x1="7" y1="4" x2="7" y2="20" />
            {/* Down arrow head */}
            <polyline points="4 17 7 20 10 17" />
            {/* Horizontal lines */}
            <line x1="13" y1="6" x2="21" y2="6" />
            <line x1="13" y1="12" x2="21" y2="12" />
            <line x1="13" y1="18" x2="21" y2="18" />
          </svg>
        </span>
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div
            ref={menuRef}
            class="oasis-editor-toolbar-dropdown-menu oasis-editor-line-spacing-menu"
            role="menu"
            style={{
              position: "absolute",
              top: `${coords().top + 4}px`,
              left: `${coords().left}px`,
            }}
          >
            <For each={PRESET_VALUES}>
              {(value) => {
                const label = formatPreset(value);
                const isActive = () => {
                  const lh = currentLineHeight();
                  return lh !== null && approxEqual(lh, value);
                };
                return (
                  <button
                    type="button"
                    class="oasis-editor-line-spacing-item"
                    classList={{ "oasis-editor-line-spacing-item-active": isActive() }}
                    role="menuitemradio"
                    aria-checked={isActive()}
                    data-testid={`editor-toolbar-line-spacing-${label.replace(".", "_")}`}
                    onClick={() => applyPreset(value)}
                    title={t("metric.lineSpacingOption", [label])}
                  >
                    <span class="oasis-editor-line-spacing-item-check" aria-hidden="true">
                      <Show when={isActive()}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </Show>
                    </span>
                    <span class="oasis-editor-line-spacing-item-label">{label}</span>
                  </button>
                );
              }}
            </For>

            <div class="oasis-editor-line-spacing-menu-separator" role="separator" />

            <button
              type="button"
              class="oasis-editor-line-spacing-item oasis-editor-line-spacing-item-more"
              role="menuitem"
              data-testid="editor-toolbar-line-spacing-options"
              onClick={openDialog}
            >
              <span class="oasis-editor-line-spacing-item-check" aria-hidden="true" />
              <span class="oasis-editor-line-spacing-item-label">
                {t("metric.lineSpacingOptions")}
              </span>
            </button>
          </div>
        </Portal>
      </Show>

      <Show when={dialogOpen()}>
        <Portal>
          <LineSpacingDialog
            isOpen={dialogOpen()}
            initial={dialogInitial()}
            onClose={() => setDialogOpen(false)}
            onApply={handleDialogApply}
          />
        </Portal>
      </Show>
    </div>
  );
}
