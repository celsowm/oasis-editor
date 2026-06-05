import { For, Show, createMemo, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { t } from "../../../i18n/index.js";
import {
  LineSpacingDialog,
  type LineSpacingDialogApplyValues,
  type LineSpacingDialogInitialValues,
} from "../Dialogs/LineSpacingDialog.js";
import { Popover } from "./primitives/Popover.js";
import type { ToolbarActionApi } from "./schema/items.js";

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

export function LineSpacingButton(props: LineSpacingButtonProps) {
  const api = props.api;
  const [isOpen, setIsOpen] = createSignal(false);
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [dialogInitial, setDialogInitial] =
    createSignal<LineSpacingDialogInitialValues>({
      lineHeight: "",
      spacingBefore: "",
      spacingAfter: "",
    });

  const currentLineHeight = createMemo<number | null>(() => {
    const raw = toStr(api.commands.state("setLineHeight").value);
    if (raw === "") return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  });

  const close = () => setIsOpen(false);

  const applyPreset = (value: number) => {
    api.commands.execute("setLineHeight", value);
    api.focusEditor();
    close();
  };

  const openDialog = () => {
    setDialogInitial({
      lineHeight: toStr(api.commands.state("setLineHeight").value),
      spacingBefore: toStr(api.commands.state("setSpacingBefore").value),
      spacingAfter: toStr(api.commands.state("setSpacingAfter").value),
    });
    setDialogOpen(true);
    close();
  };

  const handleDialogApply = (
    values: LineSpacingDialogApplyValues,
    original: LineSpacingDialogInitialValues,
  ) => {
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
    <div class="oasis-editor-toolbar-dropdown">
      <Popover
        open={isOpen()}
        onOpenChange={setIsOpen}
        panelRole="menu"
        panelClass="oasis-editor-toolbar-dropdown-menu oasis-editor-line-spacing-menu"
        trigger={(popover) => (
          <button
            ref={(el) => popover.ref(el)}
            type="button"
            class="oasis-editor-tool-button oasis-editor-tool-button-dropdown oasis-editor-line-spacing-button"
            classList={{ "oasis-editor-tool-button-active": popover.open }}
            onClick={() => popover.toggle()}
            title={t("metric.lineSpacing")}
            aria-label={t("metric.lineSpacing")}
            aria-haspopup="menu"
            aria-expanded={popover.open}
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
        )}
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
                classList={{
                  "oasis-editor-line-spacing-item-active": isActive(),
                }}
                role="menuitemradio"
                aria-checked={isActive()}
                data-testid={`editor-toolbar-line-spacing-${label.replace(".", "_")}`}
                onClick={() => applyPreset(value)}
                title={t("metric.lineSpacingOption", [label])}
              >
                <span
                  class="oasis-editor-line-spacing-item-check"
                  aria-hidden="true"
                >
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
      </Popover>

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
