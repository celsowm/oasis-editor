import { For, Show, createMemo, createSignal, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { EditorPageMargins } from "@/core/model.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
import {
  MARGIN_PRESETS,
  cmToPx,
  marginsMatchPreset,
  presetMarginsPx,
  pxToCm,
  type MarginPreset,
} from "@/ui/components/Toolbar/marginPresets.js";

import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

const FIELDS = [
  { key: "top", labelKey: "section.marginField.top" },
  { key: "bottom", labelKey: "section.marginField.bottom" },
  { key: "left", labelKey: "section.marginField.left" },
  { key: "right", labelKey: "section.marginField.right" },
] as const;

/** Word-style page-margin presets dropdown plus an inline custom form. */
export function MarginsGroup(props: { api: ToolbarActionApi }): JSX.Element {
  const t = useI18n();
  const formatCm = (cm: number): string =>
    t("section.marginValue", [
      String(cm).replace(".", t("number.decimalSeparator")),
    ]);
  const api = props.api;
  const [showCustom, setShowCustom] = createSignal(false);
  const [draft, setDraft] = createSignal<Record<string, string>>({});

  const current = createMemo(
    (): EditorPageMargins | undefined =>
      api.commands.state("setPageMargins").value as
        | EditorPageMargins
        | undefined,
  );

  const activePresetId = createMemo((): string | undefined => {
    const margins = current();
    if (!margins) return undefined;
    return MARGIN_PRESETS.find((preset): boolean =>
      marginsMatchPreset(margins, preset),
    )?.id;
  });

  const applyPreset = (preset: MarginPreset): void => {
    api.commands.execute("setPageMargins", presetMarginsPx(preset));
    api.focusEditor();
  };

  const openCustom = (): void => {
    const margins = current();
    setDraft({
      top: margins ? String(pxToCm(margins.top)) : "",
      bottom: margins ? String(pxToCm(margins.bottom)) : "",
      left: margins ? String(pxToCm(margins.left)) : "",
      right: margins ? String(pxToCm(margins.right)) : "",
    });
    setShowCustom((v): boolean => !v);
  };

  const applyCustom = (): void => {
    const d = draft();
    const payload: Partial<EditorPageMargins> = {};
    for (const { key } of FIELDS) {
      const raw = d[key];
      if (raw == null || raw === "") continue;
      const cm = Number(raw.replace(",", "."));
      if (Number.isFinite(cm) && cm >= 0) payload[key] = cmToPx(cm);
    }
    if (Object.keys(payload).length > 0) {
      api.commands.execute("setPageMargins", payload);
    }
    api.focusEditor();
  };

  return (
    <Menu
      icon="square-dashed"
      label={t("section.margins")}
      testId="editor-toolbar-margins-dropdown"
      tooltip={t("section.margins")}
      panelClass="oasis-editor-toolbar-panel oasis-editor-margins-panel"
      keepMounted
    >
      <div class="oasis-editor-margins-list">
        <For each={MARGIN_PRESETS}>
          {(preset): JSX.Element => (
            <button
              type="button"
              class="oasis-editor-margins-item"
              classList={{
                "oasis-editor-margins-item-active":
                  activePresetId() === preset.id,
              }}
              data-testid={`editor-toolbar-margins-${preset.id}`}
              onClick={(): void => applyPreset(preset)}
            >
              <span class="oasis-editor-margins-item-name">
                {t(preset.labelKey)}
              </span>
              <span class="oasis-editor-margins-item-values">
                {`${t("section.marginField.top")} ${formatCm(preset.top)}  ` +
                  `${t("section.marginField.bottom")} ${formatCm(preset.bottom)}`}
                <br />
                {`${t("section.marginField.left")} ${formatCm(preset.left)}  ` +
                  `${t("section.marginField.right")} ${formatCm(preset.right)}`}
              </span>
            </button>
          )}
        </For>
      </div>

      <div class="oasis-editor-toolbar-list-options">
        <button
          type="button"
          class="oasis-editor-margins-custom-toggle"
          data-testid="editor-toolbar-margins-custom"
          onClick={openCustom}
        >
          <i data-lucide="sliders-horizontal" />
          <span>{t("section.marginPreset.custom")}</span>
        </button>
        <Show when={showCustom()}>
          <div class="oasis-editor-margins-custom-form">
            <For each={FIELDS}>
              {(field): JSX.Element => (
                <label class="oasis-editor-margins-custom-field">
                  <span>{t(field.labelKey)}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={draft()[field.key] ?? ""}
                    onInput={(e): { [x: string]: string } =>
                      setDraft((d): { [x: string]: string } => ({
                        ...d,
                        [field.key]: e.currentTarget.value,
                      }))
                    }
                  />
                </label>
              )}
            </For>
          </div>
        </Show>
      </div>

      <Show when={showCustom()}>
        <div class="oasis-editor-margins-custom-actions">
          <button
            type="button"
            class="oasis-editor-margins-custom-apply"
            data-testid="editor-toolbar-margins-custom-apply"
            onClick={applyCustom}
          >
            {t("section.marginApply")}
          </button>
        </div>
      </Show>
    </Menu>
  );
}
