import { For, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";

import { UNDERLINE_STYLE_OPTIONS } from "@/ui/components/Toolbar/underlineStyles.js";
import { SelectField } from "@/ui/public/SelectField.js";
import { TextField } from "@/ui/public/TextField.js";
import { ToggleChip } from "@/ui/public/ToggleChip.js";
import {
  DEFAULT_COLOR,
  DEFAULT_HIGHLIGHT,
  DEFAULT_SHADING,
} from "./FontDialogTypes.js";
import type { FontDialogController } from "./FontDialogController.js";
import type {
  UnderlineStyleValue,
  FontStylePreset,
} from "./FontDialogTypes.js";
import { FontPreview } from "./FontPreview.js";

export interface FontTabProps {
  ctrl: FontDialogController;
}

interface EffectToggle {
  testId: string;
  label: string;
  labelStyle?: JSX.CSSProperties;
  checked: () => boolean;
  onChange: (checked: boolean) => void;
}

export function FontTab(props: FontTabProps) {
  const t = useI18n();
  const { ctrl } = props;

  const effectToggles = (): EffectToggle[] => [
    {
      testId: "editor-font-dialog-bold",
      label: t("dialog.font.bold"),
      labelStyle: { "font-weight": 700 },
      checked: () => ctrl.fontTabValues().bold,
      onChange: (checked) => ctrl.updateFontTab("bold", checked),
    },
    {
      testId: "editor-font-dialog-italic",
      label: t("dialog.font.italic"),
      labelStyle: { "font-style": "italic" },
      checked: () => ctrl.fontTabValues().italic,
      onChange: (checked) => ctrl.updateFontTab("italic", checked),
    },
    {
      testId: "editor-font-dialog-underline",
      label: t("dialog.font.underline"),
      labelStyle: { "text-decoration": "underline" },
      checked: () => ctrl.fontTabValues().underline,
      onChange: (checked) =>
        ctrl.setFontTabValues((current) => ({
          ...current,
          underline: checked,
          underlineStyle: checked
            ? current.underlineStyle === "none"
              ? "single"
              : current.underlineStyle
            : "none",
        })),
    },
    {
      testId: "editor-font-dialog-strike",
      label: t("dialog.font.strike"),
      labelStyle: { "text-decoration": "line-through" },
      checked: () => ctrl.fontTabValues().strike,
      onChange: (checked) =>
        ctrl.setFontTabValues((current) => ({
          ...current,
          strike: checked,
          doubleStrike: checked ? false : current.doubleStrike,
        })),
    },
    {
      testId: "editor-font-dialog-double-strike",
      label: t("dialog.font.doubleStrike"),
      checked: () => ctrl.fontTabValues().doubleStrike,
      onChange: (checked) =>
        ctrl.setFontTabValues((current) => ({
          ...current,
          doubleStrike: checked,
          strike: checked ? false : current.strike,
        })),
    },
    {
      testId: "editor-font-dialog-superscript",
      label: t("toolbar.superscript"),
      checked: () => ctrl.fontTabValues().superscript,
      onChange: (checked) =>
        ctrl.setFontTabValues((current) => ({
          ...current,
          superscript: checked,
          subscript: checked ? false : current.subscript,
        })),
    },
    {
      testId: "editor-font-dialog-subscript",
      label: t("toolbar.subscript"),
      checked: () => ctrl.fontTabValues().subscript,
      onChange: (checked) =>
        ctrl.setFontTabValues((current) => ({
          ...current,
          subscript: checked,
          superscript: checked ? false : current.superscript,
        })),
    },
    {
      testId: "editor-font-dialog-small-caps",
      label: t("dialog.font.smallCaps"),
      checked: () => ctrl.fontTabValues().smallCaps,
      onChange: (checked) => ctrl.updateFontTab("smallCaps", checked),
    },
    {
      testId: "editor-font-dialog-all-caps",
      label: t("dialog.font.allCaps"),
      checked: () => ctrl.fontTabValues().allCaps,
      onChange: (checked) => ctrl.updateFontTab("allCaps", checked),
    },
    {
      testId: "editor-font-dialog-hidden",
      label: t("dialog.font.hidden"),
      checked: () => ctrl.fontTabValues().hidden,
      onChange: (checked) => ctrl.updateFontTab("hidden", checked),
    },
  ];

  return (
    <div class="oasis-editor-font-dialog-panel oasis-editor-font-dialog-font-panel">
      <div class="oasis-editor-dialog-row">
        <TextField
          class="oasis-editor-dialog-input-group-grow"
          label={t("dialog.font.familyFilter")}
          value={ctrl.fontTabValues().familyFilter}
          onChange={(value) => ctrl.updateFontTab("familyFilter", value)}
          data-testid="editor-font-dialog-family-filter"
        />
      </div>
      <div class="oasis-editor-dialog-row">
        <SelectField
          class="oasis-editor-dialog-input-group-grow"
          label={t("dialog.font.family")}
          value={ctrl.fontTabValues().fontFamily}
          onChange={(value) => ctrl.updateFontTab("fontFamily", value)}
          data-testid="editor-font-dialog-family"
          options={[
            { value: "", label: "—" },
            ...ctrl.visibleFamilyOptions().map((family) => ({
              value: family,
              label: family,
            })),
          ]}
        />
        <SelectField
          class="oasis-editor-font-dialog-size-group"
          label={t("dialog.font.size")}
          value={ctrl.fontTabValues().fontSize}
          onChange={(value) => ctrl.updateFontTab("fontSize", value)}
          data-testid="editor-font-dialog-size"
          options={[
            { value: "", label: "—" },
            ...ctrl.effectiveSizeOptions().map((size) => ({
              value: String(size),
              label: String(size),
            })),
          ]}
        />
      </div>
      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-font-dialog-custom-size-group">
          <TextField
            label={t("dialog.font.customSize")}
            value={ctrl.fontTabValues().fontSize}
            onChange={(value) => ctrl.updateFontTab("fontSize", value)}
            data-testid="editor-font-dialog-custom-size"
          />
          <span class="oasis-editor-dialog-help-text">
            {ctrl.customSizeError()}
          </span>
        </div>
        <SelectField
          class="oasis-editor-font-dialog-style-list-group"
          label={t("dialog.font.styleList")}
          value={ctrl.selectedFontStyle()}
          onChange={(value) =>
            ctrl.applyFontStylePreset(value as FontStylePreset)
          }
          data-testid="editor-font-dialog-style-list"
          options={[
            { value: "regular", label: t("dialog.font.styleRegular") },
            { value: "italic", label: t("dialog.font.styleItalic") },
            { value: "bold", label: t("dialog.font.styleBold") },
            { value: "boldItalic", label: t("dialog.font.styleBoldItalic") },
          ]}
        />
      </div>

      <div class="oasis-editor-dialog-row oasis-editor-font-dialog-color-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-font-dialog-color-mode-group">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.color")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.fontTabValues().colorMode}
            onChange={(e) =>
              ctrl.updateFontTab(
                "colorMode",
                e.currentTarget.value as "automatic" | "custom",
              )
            }
            data-testid="editor-font-dialog-color-mode"
          >
            <option value="automatic">{t("toolbar.colorAutomatic")}</option>
            <option value="custom">{t("dialog.font.customColor")}</option>
          </select>
          <input
            type="color"
            class="oasis-editor-dialog-color"
            value={ctrl.fontTabValues().color}
            disabled={ctrl.fontTabValues().colorMode === "automatic"}
            onInput={(e) =>
              ctrl.setFontTabValues((current) => ({
                ...current,
                color: e.currentTarget.value,
                colorMode: "custom",
              }))
            }
            data-testid="editor-font-dialog-color"
          />
        </div>
        <div class="oasis-editor-dialog-input-group">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.highlight")}
          </label>
          <input
            type="color"
            class="oasis-editor-dialog-color"
            value={ctrl.fontTabValues().highlight || DEFAULT_HIGHLIGHT}
            onInput={(e) =>
              ctrl.updateFontTab("highlight", e.currentTarget.value)
            }
            data-testid="editor-font-dialog-highlight"
          />
        </div>
        <div class="oasis-editor-dialog-input-group">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.shading")}
          </label>
          <input
            type="color"
            class="oasis-editor-dialog-color"
            value={ctrl.fontTabValues().shading || DEFAULT_SHADING}
            onInput={(e) =>
              ctrl.updateFontTab("shading", e.currentTarget.value)
            }
            data-testid="editor-font-dialog-shading"
          />
        </div>
      </div>

      <div class="oasis-editor-dialog-row">
        <SelectField
          class="oasis-editor-dialog-input-group-grow"
          label={t("dialog.font.underlineStyle")}
          value={ctrl.fontTabValues().underlineStyle}
          onChange={(value) =>
            ctrl.setFontTabValues((current) => ({
              ...current,
              underlineStyle: value as UnderlineStyleValue,
              underline: value !== "none",
            }))
          }
          data-testid="editor-font-dialog-underline-style"
          options={[
            { value: "none", label: t("toolbar.underlineRemove") },
            ...UNDERLINE_STYLE_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            })),
          ]}
        />
        <div class="oasis-editor-dialog-input-group">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.underlineColor")}
          </label>
          <input
            type="color"
            class="oasis-editor-dialog-color"
            value={ctrl.fontTabValues().underlineColor || DEFAULT_COLOR}
            disabled={ctrl.fontTabValues().underlineStyle === "none"}
            onInput={(e) =>
              ctrl.setFontTabValues((current) => ({
                ...current,
                underlineColor: e.currentTarget.value,
                underline: current.underlineStyle !== "none",
              }))
            }
            data-testid="editor-font-dialog-underline-color"
          />
        </div>
      </div>

      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.style")}
          </label>
          <div class="oasis-editor-dialog-style-row">
            <For each={effectToggles()}>
              {(toggle) => (
                <ToggleChip
                  label={toggle.label}
                  labelStyle={toggle.labelStyle}
                  checked={toggle.checked()}
                  onChange={toggle.onChange}
                  data-testid={toggle.testId}
                />
              )}
            </For>
          </div>
        </div>
      </div>

      <div class="oasis-editor-dialog-input-group">
        <label class="oasis-editor-dialog-label">
          {t("dialog.font.preview")}
        </label>
        <FontPreview
          testId="editor-font-dialog-preview"
          style={ctrl.previewStyle()}
        />
      </div>
    </div>
  );
}
