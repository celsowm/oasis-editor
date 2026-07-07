import { For, Show, createMemo, createSignal } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Portal } from "solid-js/web";

import {
  LineSpacingDialog,
  type LineSpacingDialogApplyValues,
  type LineSpacingDialogInitialValues,
} from "@/ui/components/Dialogs/LineSpacingDialog.js";
import { Menu } from "./primitives/Menu.js";
import { CheckIcon } from "@/ui/utils/customIcons.js";
import type { ToolbarActionApi } from "./schema/items.js";
import { JSX } from "solid-js";

const PRESET_VALUES: number[] = [1.0, 1.15, 1.5, 2.0, 2.5, 3.0];

function formatPreset(value: number): string {
  return value.toFixed(value === Math.floor(value) ? 1 : 2);
}

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}

function toStr(value: unknown): string {
  return value == null ? "" : String(value);
}

export interface LineSpacingButtonProps {
  api: ToolbarActionApi;
}

/**
 * Line-spacing dropdown. Composes the shared `Menu` primitive (which owns the
 * trigger, the popover, the affordance chevron and the close-on-click behavior)
 * instead of re-implementing that plumbing. The only line-spacing-specific
 * concerns left here are the preset list, the active-state check and the
 * "more options" dialog.
 *
 * The trigger glyph is the registered `lineSpacing` custom icon (see
 * `customIcons`); the active-item check uses the shared `CheckIcon`.
 */
export function LineSpacingButton(props: LineSpacingButtonProps): JSX.Element {
  const t = useI18n();
  const api = props.api;
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [dialogInitial, setDialogInitial] =
    createSignal<LineSpacingDialogInitialValues>({
      lineHeight: "",
      spacingBefore: "",
      spacingAfter: "",
    });

  const currentLineHeight = createMemo<number | null>((): number | null => {
    const raw = toStr(api.commands.state("setLineHeight").value);
    if (raw === "") return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  });

  const applyPreset = (value: number): void => {
    api.commands.execute("setLineHeight", value);
    api.focusEditor();
    // The Menu closes itself on inner-button click; no manual close needed.
  };

  const openDialog = (): void => {
    setDialogInitial({
      lineHeight: toStr(api.commands.state("setLineHeight").value),
      spacingBefore: toStr(api.commands.state("setSpacingBefore").value),
      spacingAfter: toStr(api.commands.state("setSpacingAfter").value),
    });
    setDialogOpen(true);
    // The Menu closes itself on inner-button click; no manual close needed.
  };

  const handleDialogApply = (
    values: LineSpacingDialogApplyValues,
    original: LineSpacingDialogInitialValues,
  ): void => {
    const originalLH = original.lineHeight ? Number(original.lineHeight) : null;
    const originalSB = original.spacingBefore
      ? Number(original.spacingBefore)
      : null;
    const originalSA = original.spacingAfter
      ? Number(original.spacingAfter)
      : null;

    if (values.lineHeight !== originalLH) {
      api.commands.execute("setLineHeight", values.lineHeight);
    }
    if (values.spacingBefore !== originalSB) {
      api.commands.execute("setSpacingBefore", values.spacingBefore);
    }
    if (values.spacingAfter !== originalSA) {
      api.commands.execute("setSpacingAfter", values.spacingAfter);
    }
    api.focusEditor();
  };

  return (
    <>
      <Menu
        icon="lineSpacing"
        testId="editor-toolbar-line-spacing"
        tooltip={t("metric.lineSpacing")}
        panelClass="oasis-editor-line-spacing-menu"
      >
        <For each={PRESET_VALUES}>
          {(value): JSX.Element => {
            const label = formatPreset(value);
            const isActive = (): boolean => {
              const lh = currentLineHeight();
              return lh !== null && approxEqual(lh, value);
            };
            return (
              <button
                type="button"
                class="oasis-editor-line-spacing-item"
                classList={{
                  "oasis-editor-line-spacing-item-active": isActive(),
                }}
                role="menuitemradio"
                aria-checked={isActive()}
                data-testid={`editor-toolbar-line-spacing-${label.replace(".", "_")}`}
                onClick={(): void => applyPreset(value)}
                title={t("metric.lineSpacingOption", [label])}
              >
                <span
                  class="oasis-editor-line-spacing-item-check"
                  aria-hidden="true"
                >
                  <Show when={isActive()}>
                    <CheckIcon size={14} />
                  </Show>
                </span>
                <span class="oasis-editor-line-spacing-item-label">
                  {label}
                </span>
              </button>
            );
          }}
        </For>

        <div
          class="oasis-editor-line-spacing-menu-separator"
          role="separator"
        />

        <button
          type="button"
          class="oasis-editor-line-spacing-item oasis-editor-line-spacing-item-more"
          role="menuitem"
          data-testid="editor-toolbar-line-spacing-options"
          onClick={openDialog}
        >
          <span
            class="oasis-editor-line-spacing-item-check"
            aria-hidden="true"
          />
          <span class="oasis-editor-line-spacing-item-label">
            {t("metric.lineSpacingOptions")}
          </span>
        </button>
      </Menu>

      <Show when={dialogOpen()}>
        <Portal>
          <LineSpacingDialog
            isOpen={dialogOpen()}
            initial={dialogInitial()}
            onClose={(): false => setDialogOpen(false)}
            onApply={handleDialogApply}
          />
        </Portal>
      </Show>
    </>
  );
}
