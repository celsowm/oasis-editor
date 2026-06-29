import { createMemo } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Checkbox } from "@/ui/public/Checkbox.js";
import { ColorField } from "@/ui/public/ColorField.js";
import { FieldGroup } from "@/ui/public/FieldGroup.js";
import { Grid } from "@/ui/public/Grid.js";
import { SelectField } from "@/ui/public/SelectField.js";
import { Stack } from "@/ui/public/Stack.js";
import type { TablePanelProps } from "./TableTabPanel.js";
import {
  DEFAULT_BORDER_COLOR,
  resolveBorder,
  type BorderStyleValue,
  type TablePropertiesDialogInitialValues,
} from "./TablePropertiesTypes.js";
import { NumField } from "./fields.js";
import type { TableFormState } from "@/ui/components/Dialogs/table-properties/TablePropertiesTypes.js";
import { JSX } from "solid-js";

export function CellTabPanel(props: TablePanelProps): JSX.Element {
  const t = useI18n();
  const form = (): TableFormState => props.ctrl.form;
  const set = props.ctrl.set;

  const borderPreview = createMemo(() => {
    const border = resolveBorder(
      form().borderStyle,
      form().borderWidth,
      form().borderColor,
    );
    const css = border
      ? `${border.width}pt ${border.type} ${border.color}`
      : undefined;
    return {
      "background-color": form().shading.trim() || undefined,
      "border-top": css && form().borderTop ? css : "1px solid #dadce0",
      "border-right": css && form().borderRight ? css : "1px solid #dadce0",
      "border-bottom": css && form().borderBottom ? css : "1px solid #dadce0",
      "border-left": css && form().borderLeft ? css : "1px solid #dadce0",
    };
  });

  const borderDisabled = (): boolean => form().borderStyle === "none";

  return (
    <div class="oasis-editor-table-properties-panel">
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          {NumField(
            t("table.cellWidth"),
            (): any => form().cellWidth,
            (v): void => set("cellWidth", v),
            "editor-table-properties-cell-width",
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SelectField
            label={t("table.verticalAlignment")}
            value={form().cellVerticalAlign}
            onChange={(value): void =>
              set(
                "cellVerticalAlign",
                value as TablePropertiesDialogInitialValues["cellVerticalAlign"],
              )
            }
            data-testid="editor-table-properties-cell-valign"
            options={[
              { value: "", label: t("table.inherit") },
              { value: "top", label: t("table.valignTop") },
              { value: "middle", label: t("table.valignMiddle") },
              { value: "bottom", label: t("table.valignBottom") },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SelectField
            label={t("table.textDirection")}
            value={form().cellTextDirection}
            onChange={(value): void =>
              set(
                "cellTextDirection",
                value as TablePropertiesDialogInitialValues["cellTextDirection"],
              )
            }
            data-testid="editor-table-properties-cell-direction"
            options={[
              { value: "", label: t("table.inherit") },
              { value: "lrTb", label: "lrTb" },
              { value: "tbRl", label: "tbRl" },
              { value: "btLr", label: "btLr" },
              { value: "lrTbV", label: "lrTbV" },
              { value: "tbRlV", label: "tbRlV" },
            ]}
          />
        </Grid>
      </Grid>
      <FieldGroup
        class="oasis-editor-font-dialog-fieldset"
        legend={t("table.options")}
      >
        <Stack
          class="oasis-editor-dialog-style-row"
          direction="row"
          spacing={1}
        >
          <Checkbox
            label={t("table.noWrap")}
            checked={form().cellNoWrap}
            onChange={(v): void => set("cellNoWrap", v)}
            data-testid="editor-table-properties-cell-nowrap"
          />
          <Checkbox
            label={t("table.fitText")}
            checked={form().cellFitText}
            onChange={(v): void => set("cellFitText", v)}
            data-testid="editor-table-properties-cell-fit-text"
          />
          <Checkbox
            label={t("table.hideMark")}
            checked={form().cellHideMark}
            onChange={(v): void => set("cellHideMark", v)}
            data-testid="editor-table-properties-cell-hide-mark"
          />
        </Stack>
      </FieldGroup>
      <FieldGroup
        class="oasis-editor-font-dialog-fieldset"
        legend={t("table.cellMargins")}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 3 }}>
            {NumField(
              t("paragraph.borderSideTop"),
              (): any => form().marginTop,
              (v): void => set("marginTop", v),
              "editor-table-properties-margin-top",
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            {NumField(
              t("paragraph.borderSideRight"),
              (): any => form().marginRight,
              (v): void => set("marginRight", v),
              "editor-table-properties-margin-right",
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            {NumField(
              t("paragraph.borderSideBottom"),
              (): any => form().marginBottom,
              (v): void => set("marginBottom", v),
              "editor-table-properties-margin-bottom",
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            {NumField(
              t("paragraph.borderSideLeft"),
              (): any => form().marginLeft,
              (v): void => set("marginLeft", v),
              "editor-table-properties-margin-left",
            )}
          </Grid>
        </Grid>
      </FieldGroup>
      <FieldGroup
        class="oasis-editor-font-dialog-fieldset"
        legend={t("paragraph.bordersSection")}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 3 }}>
            <SelectField
              label={t("paragraph.borderStyleLabel")}
              value={form().borderStyle}
              onChange={(value): void => {
                const next = value as BorderStyleValue;
                set("borderStyle", next);
                if (next === "none") {
                  set("borderTop", false);
                  set("borderRight", false);
                  set("borderBottom", false);
                  set("borderLeft", false);
                  set("borderStart", false);
                  set("borderEnd", false);
                  set("borderTlBr", false);
                  set("borderTrBl", false);
                } else if (
                  !form().borderTop &&
                  !form().borderRight &&
                  !form().borderBottom &&
                  !form().borderLeft
                ) {
                  set("borderTop", true);
                  set("borderRight", true);
                  set("borderBottom", true);
                  set("borderLeft", true);
                }
              }}
              data-testid="editor-table-properties-border-style"
              options={[
                { value: "none", label: t("paragraph.borderNone") },
                { value: "solid", label: t("paragraph.borderSolid") },
                { value: "dashed", label: t("paragraph.borderDashed") },
                { value: "dotted", label: t("paragraph.borderDotted") },
              ]}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            {NumField(
              t("paragraph.borderWidthLabel"),
              (): any => form().borderWidth,
              (v): void => set("borderWidth", v),
              "editor-table-properties-border-width",
              borderDisabled(),
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <ColorField
              label={t("paragraph.borderColorLabel")}
              value={form().borderColor || DEFAULT_BORDER_COLOR}
              disabled={borderDisabled()}
              onChange={(value): void => set("borderColor", value)}
              data-testid="editor-table-properties-border-color"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <ColorField
              label={t("paragraph.shadingLabel")}
              value={form().shading || "#ffffff"}
              onChange={(value): void => set("shading", value)}
              data-testid="editor-table-properties-shading"
            />
          </Grid>
        </Grid>
        <Stack
          class="oasis-editor-dialog-style-row"
          direction="row"
          spacing={1}
        >
          <Checkbox
            label={t("paragraph.borderSideTop")}
            checked={form().borderTop}
            disabled={borderDisabled()}
            onChange={(v): void => set("borderTop", v)}
            data-testid="editor-table-properties-border-top"
          />
          <Checkbox
            label={t("paragraph.borderSideRight")}
            checked={form().borderRight}
            disabled={borderDisabled()}
            onChange={(v): void => set("borderRight", v)}
            data-testid="editor-table-properties-border-right"
          />
          <Checkbox
            label={t("paragraph.borderSideBottom")}
            checked={form().borderBottom}
            disabled={borderDisabled()}
            onChange={(v): void => set("borderBottom", v)}
            data-testid="editor-table-properties-border-bottom"
          />
          <Checkbox
            label={t("paragraph.borderSideLeft")}
            checked={form().borderLeft}
            disabled={borderDisabled()}
            onChange={(v): void => set("borderLeft", v)}
            data-testid="editor-table-properties-border-left"
          />
          <Checkbox
            label={t("table.borderStart")}
            checked={form().borderStart}
            disabled={borderDisabled()}
            onChange={(v): void => set("borderStart", v)}
            data-testid="editor-table-properties-border-start"
          />
          <Checkbox
            label={t("table.borderEnd")}
            checked={form().borderEnd}
            disabled={borderDisabled()}
            onChange={(v): void => set("borderEnd", v)}
            data-testid="editor-table-properties-border-end"
          />
          <Checkbox
            label={t("table.borderTlBr")}
            checked={form().borderTlBr}
            disabled={borderDisabled()}
            onChange={(v): void => set("borderTlBr", v)}
            data-testid="editor-table-properties-border-tlbr"
          />
          <Checkbox
            label={t("table.borderTrBl")}
            checked={form().borderTrBl}
            disabled={borderDisabled()}
            onChange={(v): void => set("borderTrBl", v)}
            data-testid="editor-table-properties-border-trbl"
          />
        </Stack>
        <div
          class="oasis-editor-table-properties-cell-preview"
          style={borderPreview()}
          data-testid="editor-table-properties-cell-preview"
        />
      </FieldGroup>
    </div>
  );
}
