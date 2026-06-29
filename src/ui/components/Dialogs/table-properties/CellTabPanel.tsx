import { createMemo } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Checkbox } from "@/ui/public/Checkbox.js";
import { SelectField } from "@/ui/public/SelectField.js";
import type { TablePanelProps } from "./TableTabPanel.js";
import {
  DEFAULT_BORDER_COLOR,
  resolveBorder,
  type BorderStyleValue,
  type TablePropertiesDialogInitialValues,
} from "./TablePropertiesTypes.js";
import { NumField } from "./fields.js";

export function CellTabPanel(props: TablePanelProps) {
  const t = useI18n();
  const form = () => props.ctrl.form;
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

  const borderDisabled = () => form().borderStyle === "none";

  return (
    <div class="oasis-editor-table-properties-panel">
      <div class="oasis-editor-dialog-row">
        {NumField(
          t("table.cellWidth"),
          () => form().cellWidth,
          (v) => set("cellWidth", v),
          "editor-table-properties-cell-width",
        )}
        <SelectField
          class="oasis-editor-dialog-input-group-grow"
          label={t("table.verticalAlignment")}
          value={form().cellVerticalAlign}
          onChange={(value) =>
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
        <SelectField
          class="oasis-editor-dialog-input-group-grow"
          label={t("table.textDirection")}
          value={form().cellTextDirection}
          onChange={(value) =>
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
      </div>
      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("table.options")}</legend>
        <div class="oasis-editor-dialog-style-row">
          <Checkbox
            label={t("table.noWrap")}
            checked={form().cellNoWrap}
            onChange={(v) => set("cellNoWrap", v)}
            data-testid="editor-table-properties-cell-nowrap"
          />
          <Checkbox
            label={t("table.fitText")}
            checked={form().cellFitText}
            onChange={(v) => set("cellFitText", v)}
            data-testid="editor-table-properties-cell-fit-text"
          />
          <Checkbox
            label={t("table.hideMark")}
            checked={form().cellHideMark}
            onChange={(v) => set("cellHideMark", v)}
            data-testid="editor-table-properties-cell-hide-mark"
          />
        </div>
      </fieldset>
      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("table.cellMargins")}</legend>
        <div class="oasis-editor-dialog-row">
          {NumField(
            t("paragraph.borderSideTop"),
            () => form().marginTop,
            (v) => set("marginTop", v),
            "editor-table-properties-margin-top",
          )}
          {NumField(
            t("paragraph.borderSideRight"),
            () => form().marginRight,
            (v) => set("marginRight", v),
            "editor-table-properties-margin-right",
          )}
          {NumField(
            t("paragraph.borderSideBottom"),
            () => form().marginBottom,
            (v) => set("marginBottom", v),
            "editor-table-properties-margin-bottom",
          )}
          {NumField(
            t("paragraph.borderSideLeft"),
            () => form().marginLeft,
            (v) => set("marginLeft", v),
            "editor-table-properties-margin-left",
          )}
        </div>
      </fieldset>
      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("paragraph.bordersSection")}</legend>
        <div class="oasis-editor-dialog-row">
          <SelectField
            class="oasis-editor-dialog-input-group-grow"
            label={t("paragraph.borderStyleLabel")}
            value={form().borderStyle}
            onChange={(value) => {
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
          {NumField(
            t("paragraph.borderWidthLabel"),
            () => form().borderWidth,
            (v) => set("borderWidth", v),
            "editor-table-properties-border-width",
            borderDisabled(),
          )}
          <div class="oasis-editor-dialog-input-group">
            <label class="oasis-editor-dialog-label">
              {t("paragraph.borderColorLabel")}
            </label>
            <input
              type="color"
              class="oasis-editor-dialog-input"
              value={form().borderColor || DEFAULT_BORDER_COLOR}
              disabled={borderDisabled()}
              onInput={(e) => set("borderColor", e.currentTarget.value)}
              data-testid="editor-table-properties-border-color"
            />
          </div>
          <div class="oasis-editor-dialog-input-group">
            <label class="oasis-editor-dialog-label">
              {t("paragraph.shadingLabel")}
            </label>
            <input
              type="color"
              class="oasis-editor-dialog-input"
              value={form().shading || "#ffffff"}
              onInput={(e) => set("shading", e.currentTarget.value)}
              data-testid="editor-table-properties-shading"
            />
          </div>
        </div>
        <div class="oasis-editor-dialog-style-row">
          <Checkbox
            label={t("paragraph.borderSideTop")}
            checked={form().borderTop}
            disabled={borderDisabled()}
            onChange={(v) => set("borderTop", v)}
            data-testid="editor-table-properties-border-top"
          />
          <Checkbox
            label={t("paragraph.borderSideRight")}
            checked={form().borderRight}
            disabled={borderDisabled()}
            onChange={(v) => set("borderRight", v)}
            data-testid="editor-table-properties-border-right"
          />
          <Checkbox
            label={t("paragraph.borderSideBottom")}
            checked={form().borderBottom}
            disabled={borderDisabled()}
            onChange={(v) => set("borderBottom", v)}
            data-testid="editor-table-properties-border-bottom"
          />
          <Checkbox
            label={t("paragraph.borderSideLeft")}
            checked={form().borderLeft}
            disabled={borderDisabled()}
            onChange={(v) => set("borderLeft", v)}
            data-testid="editor-table-properties-border-left"
          />
          <Checkbox
            label={t("table.borderStart")}
            checked={form().borderStart}
            disabled={borderDisabled()}
            onChange={(v) => set("borderStart", v)}
            data-testid="editor-table-properties-border-start"
          />
          <Checkbox
            label={t("table.borderEnd")}
            checked={form().borderEnd}
            disabled={borderDisabled()}
            onChange={(v) => set("borderEnd", v)}
            data-testid="editor-table-properties-border-end"
          />
          <Checkbox
            label={t("table.borderTlBr")}
            checked={form().borderTlBr}
            disabled={borderDisabled()}
            onChange={(v) => set("borderTlBr", v)}
            data-testid="editor-table-properties-border-tlbr"
          />
          <Checkbox
            label={t("table.borderTrBl")}
            checked={form().borderTrBl}
            disabled={borderDisabled()}
            onChange={(v) => set("borderTrBl", v)}
            data-testid="editor-table-properties-border-trbl"
          />
        </div>
        <div
          class="oasis-editor-table-properties-cell-preview"
          style={borderPreview()}
          data-testid="editor-table-properties-cell-preview"
        />
      </fieldset>
    </div>
  );
}
