import { Show } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Checkbox } from "@/ui/public/Checkbox.js";
import { Radio, RadioGroup } from "@/ui/public/Radio.js";
import { SelectField } from "@/ui/public/SelectField.js";
import type { TablePropertiesController } from "./TablePropertiesController.js";
import type { TablePropertiesDialogInitialValues } from "./TablePropertiesTypes.js";
import { NumField } from "./fields.js";

export interface TablePanelProps {
  ctrl: TablePropertiesController;
}

export function TableTabPanel(props: TablePanelProps) {
  const t = useI18n();
  const form = () => props.ctrl.form;
  const set = props.ctrl.set;

  return (
    <div class="oasis-editor-table-properties-panel">
      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("table.sizeSection")}</legend>
        <div class="oasis-editor-dialog-row">
          {NumField(
            t("table.preferredWidth"),
            () => form().tableWidth,
            (v) => set("tableWidth", v),
            "editor-table-properties-table-width",
          )}
          <SelectField
            label={t("table.measureIn")}
            value={form().tableWidthUnit}
            onChange={(value) =>
              set(
                "tableWidthUnit",
                value as TablePropertiesDialogInitialValues["tableWidthUnit"],
              )
            }
            data-testid="editor-table-properties-table-width-unit"
            options={[
              { value: "points", label: t("table.points") },
              { value: "percent", label: t("table.percent") },
            ]}
          />
        </div>
      </fieldset>
      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("table.alignmentSection")}</legend>
        <RadioGroup
          class="oasis-editor-dialog-style-row"
          name="table-align"
          value={form().tableAlign}
          onChange={(value) =>
            set(
              "tableAlign",
              value as TablePropertiesDialogInitialValues["tableAlign"],
            )
          }
        >
          {(["left", "center", "right"] as const).map((align) => (
            <Radio
              value={align}
              label={t(
                `table.align${align[0]!.toUpperCase()}${align.slice(1)}` as Parameters<
                  typeof t
                >[0],
              )}
              data-testid={`editor-table-properties-align-${align}`}
            />
          ))}
        </RadioGroup>
        <div class="oasis-editor-dialog-row">
          {NumField(
            t("table.indentFromLeft"),
            () => form().tableIndentLeft,
            (v) => set("tableIndentLeft", v),
            "editor-table-properties-indent-left",
          )}
        </div>
      </fieldset>
      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("table.textWrappingSection")}</legend>
        <div class="oasis-editor-dialog-style-row">
          <Checkbox
            label={t("table.wrapNone")}
            checked={form().tableWrapping === "none"}
            onChange={() => set("tableWrapping", "none")}
            data-testid="editor-table-properties-wrap-none"
          />
          <Checkbox
            label={t("table.wrapAround")}
            checked={form().tableWrapping === "around"}
            onChange={() => set("tableWrapping", "around")}
            data-testid="editor-table-properties-wrap-around"
          />
        </div>
        <Show when={form().tableWrapping === "around"}>
          <div class="oasis-editor-dialog-row">
            <SelectField
              class="oasis-editor-dialog-input-group-grow"
              label={t("table.horizontalAnchor")}
              value={form().floatingHorizontalAnchor}
              onChange={(value) =>
                set(
                  "floatingHorizontalAnchor",
                  value as TablePropertiesDialogInitialValues["floatingHorizontalAnchor"],
                )
              }
              data-testid="editor-table-properties-floating-h-anchor"
              options={[
                { value: "margin", label: t("table.anchorMargin") },
                { value: "page", label: t("table.anchorPage") },
                { value: "text", label: t("table.anchorText") },
              ]}
            />
            <SelectField
              class="oasis-editor-dialog-input-group-grow"
              label={t("table.verticalAnchor")}
              value={form().floatingVerticalAnchor}
              onChange={(value) =>
                set(
                  "floatingVerticalAnchor",
                  value as TablePropertiesDialogInitialValues["floatingVerticalAnchor"],
                )
              }
              data-testid="editor-table-properties-floating-v-anchor"
              options={[
                { value: "margin", label: t("table.anchorMargin") },
                { value: "page", label: t("table.anchorPage") },
                { value: "text", label: t("table.anchorText") },
              ]}
            />
          </div>
          <div class="oasis-editor-dialog-row">
            {NumField(
              t("table.positionX"),
              () => form().floatingX,
              (v) => set("floatingX", v),
              "editor-table-properties-floating-x",
              Boolean(form().floatingXAlign),
              true,
            )}
            {NumField(
              t("table.positionY"),
              () => form().floatingY,
              (v) => set("floatingY", v),
              "editor-table-properties-floating-y",
              Boolean(form().floatingYAlign),
              true,
            )}
            <SelectField
              class="oasis-editor-dialog-input-group-grow"
              label={t("table.horizontalAlignment")}
              value={form().floatingXAlign}
              onChange={(value) =>
                set(
                  "floatingXAlign",
                  value as TablePropertiesDialogInitialValues["floatingXAlign"],
                )
              }
              data-testid="editor-table-properties-floating-x-align"
              options={[
                { value: "", label: t("table.explicitOffset") },
                ...(
                  ["left", "center", "right", "inside", "outside"] as const
                ).map((value) => ({ value, label: value })),
              ]}
            />
            <SelectField
              class="oasis-editor-dialog-input-group-grow"
              label={t("table.verticalAlignment")}
              value={form().floatingYAlign}
              onChange={(value) =>
                set(
                  "floatingYAlign",
                  value as TablePropertiesDialogInitialValues["floatingYAlign"],
                )
              }
              data-testid="editor-table-properties-floating-y-align"
              options={[
                { value: "", label: t("table.explicitOffset") },
                ...(
                  ["top", "center", "bottom", "inside", "outside"] as const
                ).map((value) => ({ value, label: value })),
              ]}
            />
          </div>
          <div class="oasis-editor-dialog-row">
            {NumField(
              t("table.distanceTop"),
              () => form().floatingDistanceTop,
              (v) => set("floatingDistanceTop", v),
              "editor-table-properties-floating-distance-top",
            )}
            {NumField(
              t("table.distanceRight"),
              () => form().floatingDistanceRight,
              (v) => set("floatingDistanceRight", v),
              "editor-table-properties-floating-distance-right",
            )}
            {NumField(
              t("table.distanceBottom"),
              () => form().floatingDistanceBottom,
              (v) => set("floatingDistanceBottom", v),
              "editor-table-properties-floating-distance-bottom",
            )}
            {NumField(
              t("table.distanceLeft"),
              () => form().floatingDistanceLeft,
              (v) => set("floatingDistanceLeft", v),
              "editor-table-properties-floating-distance-left",
            )}
          </div>
          <Checkbox
            label={t("table.allowOverlap")}
            checked={form().floatingOverlap === "overlap"}
            onChange={(value) =>
              set("floatingOverlap", value ? "overlap" : "never")
            }
            data-testid="editor-table-properties-floating-overlap"
          />
        </Show>
      </fieldset>
    </div>
  );
}
