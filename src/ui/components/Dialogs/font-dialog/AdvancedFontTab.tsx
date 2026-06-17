import { For } from "solid-js";
import { t } from "@/i18n/index.js";
import { WORD_CHARACTER_SCALES } from "./FontDialogTypes.js";
import type { FontDialogController } from "./FontDialogController.js";
import type { AdvancedTabValues } from "./FontDialogTypes.js";
import type {
  EditorLigatures,
  EditorNumberSpacing,
  EditorNumberForm,
} from "@/core/model.js";
import { FontPreview } from "./FontPreview.js";

export interface AdvancedFontTabProps {
  ctrl: FontDialogController;
}

export function AdvancedFontTab(props: AdvancedFontTabProps) {
  const { ctrl } = props;

  return (
    <div class="oasis-editor-font-dialog-panel oasis-editor-font-dialog-advanced-panel">
      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("dialog.font.advancedCharacterSpacingGroup")}</legend>
        <div class="oasis-editor-font-dialog-word-row">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.advancedScale")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.advancedTabValues().characterScale || "100"}
            onChange={(e) =>
              ctrl.updateAdvancedTab("characterScale", e.currentTarget.value)
            }
            data-testid="editor-font-dialog-advanced-scale"
          >
            <For each={WORD_CHARACTER_SCALES}>
              {(scale) => <option value={String(scale)}>{scale}%</option>}
            </For>
          </select>
        </div>
        <div class="oasis-editor-font-dialog-word-row">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.advancedSpacing")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.advancedTabValues().spacingMode}
            onChange={(e) =>
              ctrl.updateAdvancedTab(
                "spacingMode",
                e.currentTarget.value as AdvancedTabValues["spacingMode"],
              )
            }
            data-testid="editor-font-dialog-advanced-spacing-mode"
          >
            <option value="normal">{t("dialog.font.advancedNormal")}</option>
            <option value="expanded">
              {t("dialog.font.advancedExpanded")}
            </option>
            <option value="condensed">
              {t("dialog.font.advancedCondensed")}
            </option>
          </select>
          <label class="oasis-editor-dialog-label oasis-editor-font-dialog-by-label">
            {t("dialog.font.advancedBy")}
          </label>
          <input
            class="oasis-editor-dialog-input oasis-editor-font-dialog-small-input"
            value={ctrl.advancedTabValues().spacingAmount}
            disabled={ctrl.advancedTabValues().spacingMode === "normal"}
            onInput={(e) =>
              ctrl.updateAdvancedTab("spacingAmount", e.currentTarget.value)
            }
            data-testid="editor-font-dialog-advanced-spacing-amount"
          />
        </div>
        <div class="oasis-editor-font-dialog-word-row">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.advancedPosition")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.advancedTabValues().positionMode}
            onChange={(e) =>
              ctrl.updateAdvancedTab(
                "positionMode",
                e.currentTarget.value as AdvancedTabValues["positionMode"],
              )
            }
            data-testid="editor-font-dialog-advanced-position-mode"
          >
            <option value="normal">{t("dialog.font.advancedNormal")}</option>
            <option value="raised">{t("dialog.font.advancedRaised")}</option>
            <option value="lowered">{t("dialog.font.advancedLowered")}</option>
          </select>
          <label class="oasis-editor-dialog-label oasis-editor-font-dialog-by-label">
            {t("dialog.font.advancedBy")}
          </label>
          <input
            class="oasis-editor-dialog-input oasis-editor-font-dialog-small-input"
            value={ctrl.advancedTabValues().positionAmount}
            disabled={ctrl.advancedTabValues().positionMode === "normal"}
            onInput={(e) =>
              ctrl.updateAdvancedTab("positionAmount", e.currentTarget.value)
            }
            data-testid="editor-font-dialog-advanced-position-amount"
          />
        </div>
        <div class="oasis-editor-font-dialog-word-row oasis-editor-font-dialog-kerning-row">
          <label class="oasis-editor-dialog-style-toggle oasis-editor-font-dialog-kerning-toggle">
            <input
              type="checkbox"
              checked={ctrl.advancedTabValues().kerningEnabled}
              onChange={(e) =>
                ctrl.setAdvancedTabValues((current) => ({
                  ...current,
                  kerningEnabled: e.currentTarget.checked,
                  kerningThreshold: e.currentTarget.checked
                    ? current.kerningThreshold || "1"
                    : current.kerningThreshold,
                }))
              }
              data-testid="editor-font-dialog-advanced-kerning-enabled"
            />
            <span>{t("dialog.font.advancedKerning")}</span>
          </label>
          <input
            class="oasis-editor-dialog-input oasis-editor-font-dialog-kerning-input"
            value={ctrl.advancedTabValues().kerningThreshold}
            disabled={!ctrl.advancedTabValues().kerningEnabled}
            onInput={(e) =>
              ctrl.updateAdvancedTab("kerningThreshold", e.currentTarget.value)
            }
            data-testid="editor-font-dialog-advanced-kerning"
          />
          <span class="oasis-editor-dialog-help-text oasis-editor-font-dialog-kerning-suffix">
            {t("dialog.font.advancedKerningAbove")}
          </span>
        </div>
      </fieldset>

      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("dialog.font.advancedOpenTypeGroup")}</legend>
        <div class="oasis-editor-font-dialog-word-row">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.advancedLigatures")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.advancedTabValues().ligatures}
            onChange={(e) =>
              ctrl.updateAdvancedTab(
                "ligatures",
                e.currentTarget.value as EditorLigatures | "",
              )
            }
            data-testid="editor-font-dialog-advanced-ligatures"
          >
            <option value="">{t("dialog.font.advancedDefault")}</option>
            <option value="none">
              {t("dialog.font.advancedLigaturesNone")}
            </option>
            <option value="standard">
              {t("dialog.font.advancedLigaturesStandard")}
            </option>
            <option value="contextual">
              {t("dialog.font.advancedLigaturesContextual")}
            </option>
            <option value="historical">
              {t("dialog.font.advancedLigaturesHistorical")}
            </option>
            <option value="standardContextual">
              {t("dialog.font.advancedLigaturesStandardContextual")}
            </option>
          </select>
        </div>
        <div class="oasis-editor-font-dialog-word-row">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.advancedNumberSpacing")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.advancedTabValues().numberSpacing}
            onChange={(e) =>
              ctrl.updateAdvancedTab(
                "numberSpacing",
                e.currentTarget.value as EditorNumberSpacing | "",
              )
            }
            data-testid="editor-font-dialog-advanced-number-spacing"
          >
            <option value="">{t("dialog.font.advancedDefault")}</option>
            <option value="proportional">
              {t("dialog.font.advancedNumberSpacingProportional")}
            </option>
            <option value="tabular">
              {t("dialog.font.advancedNumberSpacingTabular")}
            </option>
          </select>
        </div>
        <div class="oasis-editor-font-dialog-word-row">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.advancedNumberForm")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.advancedTabValues().numberForm}
            onChange={(e) =>
              ctrl.updateAdvancedTab(
                "numberForm",
                e.currentTarget.value as EditorNumberForm | "",
              )
            }
            data-testid="editor-font-dialog-advanced-number-form"
          >
            <option value="">{t("dialog.font.advancedDefault")}</option>
            <option value="lining">
              {t("dialog.font.advancedNumberFormLining")}
            </option>
            <option value="oldStyle">
              {t("dialog.font.advancedNumberFormOldStyle")}
            </option>
          </select>
        </div>
        <div class="oasis-editor-font-dialog-word-row">
          <label class="oasis-editor-dialog-label">
            {t("dialog.font.advancedStylisticSet")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={ctrl.advancedTabValues().stylisticSet}
            onChange={(e) =>
              ctrl.updateAdvancedTab("stylisticSet", e.currentTarget.value)
            }
            data-testid="editor-font-dialog-advanced-stylistic-set"
          >
            <option value="">{t("dialog.font.advancedDefault")}</option>
            <For each={Array.from({ length: 20 }, (_, index) => index + 1)}>
              {(set) => <option value={String(set)}>{set}</option>}
            </For>
          </select>
        </div>
        <label class="oasis-editor-dialog-style-toggle oasis-editor-font-dialog-contextual-toggle">
          <input
            type="checkbox"
            checked={ctrl.advancedTabValues().contextualAlternates}
            onChange={(e) =>
              ctrl.updateAdvancedTab(
                "contextualAlternates",
                e.currentTarget.checked,
              )
            }
            data-testid="editor-font-dialog-advanced-contextual-alternates"
          />
          <span>{t("dialog.font.advancedContextualAlternates")}</span>
        </label>
      </fieldset>

      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("dialog.font.advancedPreviewGroup")}</legend>
        <FontPreview
          class="oasis-editor-dialog-preview oasis-editor-font-dialog-advanced-preview"
          testId="editor-font-dialog-advanced-preview"
          style={ctrl.previewStyle()}
        />
      </fieldset>

      <p
        class="oasis-editor-dialog-help-text"
        data-testid="editor-font-dialog-advanced-placeholder"
      >
        {ctrl.advancedValidationError() || t("dialog.font.advancedPlaceholder")}
      </p>
    </div>
  );
}
