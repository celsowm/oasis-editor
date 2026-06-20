import { For } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";

import { UNDERLINE_STYLE_OPTIONS } from "@/ui/components/Toolbar/underlineStyles.js";
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

export function FontTab(props: FontTabProps) {
  const t = useI18n();
  const { ctrl } = props;

  return (
    <div class="oasis-editor-font-dialog-panel oasis-editor-font-dialog-font-panel">
      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.familyFilter")}
          </label>
          <input
            class="oasis-editor-dialog-input"
            value={ctrl.fontTabValues().familyFilter}
            onInput={(e) =>
              ctrl.updateFontTab("familyFilter", e.currentTarget.value)
            }
            data-testid="editor-font-dialog-family-filter"
          />
        </div>
      </div>
      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.family")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.fontTabValues().fontFamily}
            onChange={(e) =>
              ctrl.updateFontTab("fontFamily", e.currentTarget.value)
            }
            data-testid="editor-font-dialog-family"
          >
            <option value="">—</option>
            <For each={ctrl.visibleFamilyOptions()}>
              {(family) => <option value={family}>{family}</option>}
            </For>
          </select>
        </div>
        <div class="oasis-editor-dialog-input-group oasis-editor-font-dialog-size-group">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.size")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.fontTabValues().fontSize}
            onChange={(e) =>
              ctrl.updateFontTab("fontSize", e.currentTarget.value)
            }
            data-testid="editor-font-dialog-size"
          >
            <option value="">—</option>
            <For each={ctrl.effectiveSizeOptions()}>
              {(size) => <option value={String(size)}>{size}</option>}
            </For>
          </select>
        </div>
      </div>
      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-font-dialog-custom-size-group">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.customSize")}
          </label>
          <input
            class="oasis-editor-dialog-input"
            value={ctrl.fontTabValues().fontSize}
            onInput={(e) =>
              ctrl.updateFontTab("fontSize", e.currentTarget.value)
            }
            data-testid="editor-font-dialog-custom-size"
          />
          <span class="oasis-editor-dialog-help-text">
            {ctrl.customSizeError()}
          </span>
        </div>
        <div class="oasis-editor-dialog-input-group oasis-editor-font-dialog-style-list-group">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.styleList")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.selectedFontStyle()}
            onChange={(e) =>
              ctrl.applyFontStylePreset(
                e.currentTarget.value as FontStylePreset,
              )
            }
            data-testid="editor-font-dialog-style-list"
          >
            <option value="regular">{t("dialog.font.styleRegular")}</option>
            <option value="italic">{t("dialog.font.styleItalic")}</option>
            <option value="bold">{t("dialog.font.styleBold")}</option>
            <option value="boldItalic">
              {t("dialog.font.styleBoldItalic")}
            </option>
          </select>
        </div>
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
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.underlineStyle")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.fontTabValues().underlineStyle}
            onChange={(e) =>
              ctrl.setFontTabValues((current) => ({
                ...current,
                underlineStyle: e.currentTarget.value as UnderlineStyleValue,
                underline: e.currentTarget.value !== "none",
              }))
            }
            data-testid="editor-font-dialog-underline-style"
          >
            <option value="none">{t("toolbar.underlineRemove")}</option>
            <For each={UNDERLINE_STYLE_OPTIONS}>
              {(option) => <option value={option.value}>{t(option.labelKey)}</option>}
            </For>
          </select>
        </div>
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
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={ctrl.fontTabValues().bold}
                onChange={(e) =>
                  ctrl.updateFontTab("bold", e.currentTarget.checked)
                }
                data-testid="editor-font-dialog-bold"
              />
              <span style={{ "font-weight": 700 }}>
                {t("dialog.font.bold")}
              </span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={ctrl.fontTabValues().italic}
                onChange={(e) =>
                  ctrl.updateFontTab("italic", e.currentTarget.checked)
                }
                data-testid="editor-font-dialog-italic"
              />
              <span style={{ "font-style": "italic" }}>
                {t("dialog.font.italic")}
              </span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={ctrl.fontTabValues().underline}
                onChange={(e) =>
                  ctrl.setFontTabValues((current) => ({
                    ...current,
                    underline: e.currentTarget.checked,
                    underlineStyle: e.currentTarget.checked
                      ? current.underlineStyle === "none"
                        ? "single"
                        : current.underlineStyle
                      : "none",
                  }))
                }
                data-testid="editor-font-dialog-underline"
              />
              <span style={{ "text-decoration": "underline" }}>
                {t("dialog.font.underline")}
              </span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={ctrl.fontTabValues().strike}
                onChange={(e) =>
                  ctrl.setFontTabValues((current) => ({
                    ...current,
                    strike: e.currentTarget.checked,
                    doubleStrike: e.currentTarget.checked
                      ? false
                      : current.doubleStrike,
                  }))
                }
                data-testid="editor-font-dialog-strike"
              />
              <span style={{ "text-decoration": "line-through" }}>
                {t("dialog.font.strike")}
              </span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={ctrl.fontTabValues().doubleStrike}
                onChange={(e) =>
                  ctrl.setFontTabValues((current) => ({
                    ...current,
                    doubleStrike: e.currentTarget.checked,
                    strike: e.currentTarget.checked ? false : current.strike,
                  }))
                }
                data-testid="editor-font-dialog-double-strike"
              />
              <span>{t("dialog.font.doubleStrike")}</span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={ctrl.fontTabValues().superscript}
                onChange={(e) =>
                  ctrl.setFontTabValues((current) => ({
                    ...current,
                    superscript: e.currentTarget.checked,
                    subscript: e.currentTarget.checked
                      ? false
                      : current.subscript,
                  }))
                }
                data-testid="editor-font-dialog-superscript"
              />
              <span>{t("toolbar.superscript")}</span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={ctrl.fontTabValues().subscript}
                onChange={(e) =>
                  ctrl.setFontTabValues((current) => ({
                    ...current,
                    subscript: e.currentTarget.checked,
                    superscript: e.currentTarget.checked
                      ? false
                      : current.superscript,
                  }))
                }
                data-testid="editor-font-dialog-subscript"
              />
              <span>{t("toolbar.subscript")}</span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={ctrl.fontTabValues().smallCaps}
                onChange={(e) =>
                  ctrl.updateFontTab("smallCaps", e.currentTarget.checked)
                }
                data-testid="editor-font-dialog-small-caps"
              />
              <span>{t("dialog.font.smallCaps")}</span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={ctrl.fontTabValues().allCaps}
                onChange={(e) =>
                  ctrl.updateFontTab("allCaps", e.currentTarget.checked)
                }
                data-testid="editor-font-dialog-all-caps"
              />
              <span>{t("dialog.font.allCaps")}</span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={ctrl.fontTabValues().hidden}
                onChange={(e) =>
                  ctrl.updateFontTab("hidden", e.currentTarget.checked)
                }
                data-testid="editor-font-dialog-hidden"
              />
              <span>{t("dialog.font.hidden")}</span>
            </label>
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
