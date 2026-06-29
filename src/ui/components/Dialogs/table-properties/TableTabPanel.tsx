import { Show } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Checkbox } from "@/ui/public/Checkbox.js";
import { FieldGroup } from "@/ui/public/FieldGroup.js";
import { Grid } from "@/ui/public/Grid.js";
import { Radio, RadioGroup } from "@/ui/public/Radio.js";
import { SelectField } from "@/ui/public/SelectField.js";
import { Stack } from "@/ui/public/Stack.js";
import type { TablePropertiesController } from "./TablePropertiesController.js";
import type { TablePropertiesDialogInitialValues } from "./TablePropertiesTypes.js";
import { NumField } from "./fields.js";
import type { TableFormState } from "@/ui/components/Dialogs/table-properties/TablePropertiesTypes.js";
import { JSX } from "solid-js";

export interface TablePanelProps {
  ctrl: TablePropertiesController;
}

export function TableTabPanel(props: TablePanelProps): JSX.Element {
  const t = useI18n();
  const form = (): TableFormState => props.ctrl.form;
  const set = props.ctrl.set;

  return (
    <div class="oasis-editor-table-properties-panel">
      <FieldGroup
        class="oasis-editor-font-dialog-fieldset"
        legend={t("table.sizeSection")}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            {NumField(
              t("table.preferredWidth"),
              (): any => form().tableWidth,
              (v): void => set("tableWidth", v),
              "editor-table-properties-table-width",
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SelectField
              label={t("table.measureIn")}
              value={form().tableWidthUnit}
              onChange={(value): void =>
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
          </Grid>
        </Grid>
      </FieldGroup>
      <FieldGroup
        class="oasis-editor-font-dialog-fieldset"
        legend={t("table.alignmentSection")}
      >
        <RadioGroup
          class="oasis-editor-dialog-style-row"
          name="table-align"
          value={form().tableAlign}
          onChange={(value): void =>
            set(
              "tableAlign",
              value as TablePropertiesDialogInitialValues["tableAlign"],
            )
          }
        >
          {(["left", "center", "right"] as const).map((align): JSX.Element => (
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
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            {NumField(
              t("table.indentFromLeft"),
              (): any => form().tableIndentLeft,
              (v): void => set("tableIndentLeft", v),
              "editor-table-properties-indent-left",
            )}
          </Grid>
        </Grid>
      </FieldGroup>
      <FieldGroup
        class="oasis-editor-font-dialog-fieldset"
        legend={t("table.textWrappingSection")}
      >
        <Stack
          class="oasis-editor-dialog-style-row"
          direction="row"
          spacing={1}
        >
          <Checkbox
            label={t("table.wrapNone")}
            checked={form().tableWrapping === "none"}
            onChange={(): void => set("tableWrapping", "none")}
            data-testid="editor-table-properties-wrap-none"
          />
          <Checkbox
            label={t("table.wrapAround")}
            checked={form().tableWrapping === "around"}
            onChange={(): void => set("tableWrapping", "around")}
            data-testid="editor-table-properties-wrap-around"
          />
        </Stack>
        <Show when={form().tableWrapping === "around"}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SelectField
                label={t("table.horizontalAnchor")}
                value={form().floatingHorizontalAnchor}
                onChange={(value): void =>
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
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SelectField
                label={t("table.verticalAnchor")}
                value={form().floatingVerticalAnchor}
                onChange={(value): void =>
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
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              {NumField(
                t("table.positionX"),
                (): any => form().floatingX,
                (v): void => set("floatingX", v),
                "editor-table-properties-floating-x",
                Boolean(form().floatingXAlign),
                true,
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              {NumField(
                t("table.positionY"),
                (): any => form().floatingY,
                (v): void => set("floatingY", v),
                "editor-table-properties-floating-y",
                Boolean(form().floatingYAlign),
                true,
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <SelectField
                label={t("table.horizontalAlignment")}
                value={form().floatingXAlign}
                onChange={(value): void =>
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
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <SelectField
                label={t("table.verticalAlignment")}
                value={form().floatingYAlign}
                onChange={(value): void =>
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
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              {NumField(
                t("table.distanceTop"),
                (): any => form().floatingDistanceTop,
                (v): void => set("floatingDistanceTop", v),
                "editor-table-properties-floating-distance-top",
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              {NumField(
                t("table.distanceRight"),
                (): any => form().floatingDistanceRight,
                (v): void => set("floatingDistanceRight", v),
                "editor-table-properties-floating-distance-right",
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              {NumField(
                t("table.distanceBottom"),
                (): any => form().floatingDistanceBottom,
                (v): void => set("floatingDistanceBottom", v),
                "editor-table-properties-floating-distance-bottom",
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              {NumField(
                t("table.distanceLeft"),
                (): any => form().floatingDistanceLeft,
                (v): void => set("floatingDistanceLeft", v),
                "editor-table-properties-floating-distance-left",
              )}
            </Grid>
          </Grid>
          <Checkbox
            label={t("table.allowOverlap")}
            checked={form().floatingOverlap === "overlap"}
            onChange={(value): void =>
              set("floatingOverlap", value ? "overlap" : "never")
            }
            data-testid="editor-table-properties-floating-overlap"
          />
        </Show>
      </FieldGroup>
    </div>
  );
}
