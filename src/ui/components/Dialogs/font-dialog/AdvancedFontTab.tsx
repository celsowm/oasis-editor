import { useI18n } from "@/i18n/I18nContext.js";

import { WORD_CHARACTER_SCALES } from "./FontDialogTypes.js";
import { Checkbox } from "@/ui/public/Checkbox.js";
import { FieldGroup } from "@/ui/public/FieldGroup.js";
import { Grid } from "@/ui/public/Grid.js";
import { SelectField } from "@/ui/public/SelectField.js";
import { StatusText } from "@/ui/public/StatusText.js";
import { TextField } from "@/ui/public/TextField.js";
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
  const t = useI18n();
  const { ctrl } = props;

  return (
    <div class="oasis-editor-font-dialog-panel oasis-editor-font-dialog-advanced-panel">
      <FieldGroup
        class="oasis-editor-font-dialog-fieldset"
        legend={t("dialog.font.advancedCharacterSpacingGroup")}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <SelectField
              label={t("dialog.font.advancedScale")}
              value={ctrl.advancedTabValues().characterScale || "100"}
              onChange={(value) =>
                ctrl.updateAdvancedTab("characterScale", value)
              }
              data-testid="editor-font-dialog-advanced-scale"
              options={WORD_CHARACTER_SCALES.map((scale) => ({
                value: String(scale),
                label: `${scale}%`,
              }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 8 }}>
                <SelectField
                  label={t("dialog.font.advancedSpacing")}
                  value={ctrl.advancedTabValues().spacingMode}
                  onChange={(value) =>
                    ctrl.updateAdvancedTab(
                      "spacingMode",
                      value as AdvancedTabValues["spacingMode"],
                    )
                  }
                  data-testid="editor-font-dialog-advanced-spacing-mode"
                  options={[
                    { value: "normal", label: t("dialog.font.advancedNormal") },
                    {
                      value: "expanded",
                      label: t("dialog.font.advancedExpanded"),
                    },
                    {
                      value: "condensed",
                      label: t("dialog.font.advancedCondensed"),
                    },
                  ]}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  class="oasis-editor-font-dialog-small-input"
                  label={t("dialog.font.advancedBy")}
                  value={ctrl.advancedTabValues().spacingAmount}
                  disabled={ctrl.advancedTabValues().spacingMode === "normal"}
                  onChange={(value) =>
                    ctrl.updateAdvancedTab("spacingAmount", value)
                  }
                  data-testid="editor-font-dialog-advanced-spacing-amount"
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <SelectField
              label={t("dialog.font.advancedPosition")}
              value={ctrl.advancedTabValues().positionMode}
              onChange={(value) =>
                ctrl.updateAdvancedTab(
                  "positionMode",
                  value as AdvancedTabValues["positionMode"],
                )
              }
              data-testid="editor-font-dialog-advanced-position-mode"
              options={[
                { value: "normal", label: t("dialog.font.advancedNormal") },
                { value: "raised", label: t("dialog.font.advancedRaised") },
                { value: "lowered", label: t("dialog.font.advancedLowered") },
              ]}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              class="oasis-editor-font-dialog-small-input"
              label={t("dialog.font.advancedBy")}
              value={ctrl.advancedTabValues().positionAmount}
              disabled={ctrl.advancedTabValues().positionMode === "normal"}
              onChange={(value) =>
                ctrl.updateAdvancedTab("positionAmount", value)
              }
              data-testid="editor-font-dialog-advanced-position-amount"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Checkbox
              class="oasis-editor-font-dialog-kerning-toggle"
              label={t("dialog.font.advancedKerning")}
              checked={ctrl.advancedTabValues().kerningEnabled}
              onChange={(checked) =>
                ctrl.setAdvancedTabValues((current) => ({
                  ...current,
                  kerningEnabled: checked,
                  kerningThreshold: checked
                    ? current.kerningThreshold || "1"
                    : current.kerningThreshold,
                }))
              }
              data-testid="editor-font-dialog-advanced-kerning-enabled"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              class="oasis-editor-font-dialog-kerning-input"
              value={ctrl.advancedTabValues().kerningThreshold}
              disabled={!ctrl.advancedTabValues().kerningEnabled}
              onChange={(value) =>
                ctrl.updateAdvancedTab("kerningThreshold", value)
              }
              data-testid="editor-font-dialog-advanced-kerning"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <StatusText class="oasis-editor-dialog-help-text oasis-editor-font-dialog-kerning-suffix">
              {t("dialog.font.advancedKerningAbove")}
            </StatusText>
          </Grid>
        </Grid>
      </FieldGroup>

      <FieldGroup
        class="oasis-editor-font-dialog-fieldset"
        legend={t("dialog.font.advancedOpenTypeGroup")}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SelectField
              label={t("dialog.font.advancedLigatures")}
              value={ctrl.advancedTabValues().ligatures}
              onChange={(value) =>
                ctrl.updateAdvancedTab(
                  "ligatures",
                  value as EditorLigatures | "",
                )
              }
              data-testid="editor-font-dialog-advanced-ligatures"
              options={[
                { value: "", label: t("dialog.font.advancedDefault") },
                {
                  value: "none",
                  label: t("dialog.font.advancedLigaturesNone"),
                },
                {
                  value: "standard",
                  label: t("dialog.font.advancedLigaturesStandard"),
                },
                {
                  value: "contextual",
                  label: t("dialog.font.advancedLigaturesContextual"),
                },
                {
                  value: "historical",
                  label: t("dialog.font.advancedLigaturesHistorical"),
                },
                {
                  value: "standardContextual",
                  label: t("dialog.font.advancedLigaturesStandardContextual"),
                },
              ]}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SelectField
              label={t("dialog.font.advancedNumberSpacing")}
              value={ctrl.advancedTabValues().numberSpacing}
              onChange={(value) =>
                ctrl.updateAdvancedTab(
                  "numberSpacing",
                  value as EditorNumberSpacing | "",
                )
              }
              data-testid="editor-font-dialog-advanced-number-spacing"
              options={[
                { value: "", label: t("dialog.font.advancedDefault") },
                {
                  value: "proportional",
                  label: t("dialog.font.advancedNumberSpacingProportional"),
                },
                {
                  value: "tabular",
                  label: t("dialog.font.advancedNumberSpacingTabular"),
                },
              ]}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SelectField
              label={t("dialog.font.advancedNumberForm")}
              value={ctrl.advancedTabValues().numberForm}
              onChange={(value) =>
                ctrl.updateAdvancedTab(
                  "numberForm",
                  value as EditorNumberForm | "",
                )
              }
              data-testid="editor-font-dialog-advanced-number-form"
              options={[
                { value: "", label: t("dialog.font.advancedDefault") },
                {
                  value: "lining",
                  label: t("dialog.font.advancedNumberFormLining"),
                },
                {
                  value: "oldStyle",
                  label: t("dialog.font.advancedNumberFormOldStyle"),
                },
              ]}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SelectField
              label={t("dialog.font.advancedStylisticSet")}
              value={ctrl.advancedTabValues().stylisticSet}
              onChange={(value) =>
                ctrl.updateAdvancedTab("stylisticSet", value)
              }
              data-testid="editor-font-dialog-advanced-stylistic-set"
              options={[
                { value: "", label: t("dialog.font.advancedDefault") },
                ...Array.from({ length: 20 }, (_, index) => index + 1).map(
                  (set) => ({ value: String(set), label: String(set) }),
                ),
              ]}
            />
          </Grid>
        </Grid>
        <Checkbox
          class="oasis-editor-font-dialog-contextual-toggle"
          label={t("dialog.font.advancedContextualAlternates")}
          checked={ctrl.advancedTabValues().contextualAlternates}
          onChange={(checked) =>
            ctrl.updateAdvancedTab("contextualAlternates", checked)
          }
          data-testid="editor-font-dialog-advanced-contextual-alternates"
        />
      </FieldGroup>

      <FieldGroup
        class="oasis-editor-font-dialog-fieldset"
        legend={t("dialog.font.advancedPreviewGroup")}
      >
        <FontPreview
          class="oasis-editor-dialog-preview oasis-editor-font-dialog-advanced-preview"
          testId="editor-font-dialog-advanced-preview"
          style={ctrl.previewStyle()}
        />
      </FieldGroup>

      <StatusText
        as="p"
        class="oasis-editor-dialog-help-text"
        data-testid="editor-font-dialog-advanced-placeholder"
      >
        {ctrl.advancedValidationError() || t("dialog.font.advancedPlaceholder")}
      </StatusText>
    </div>
  );
}
