import { useI18n } from "@/i18n/I18nContext.js";
import { Checkbox } from "@/ui/public/Checkbox.js";
import { Grid } from "@/ui/public/Grid.js";
import { SelectField } from "@/ui/public/SelectField.js";
import { Stack } from "@/ui/public/Stack.js";
import type { TablePanelProps } from "./TableTabPanel.js";
import type { TablePropertiesDialogInitialValues } from "./TablePropertiesTypes.js";
import { NumField } from "./fields.js";

export function RowTabPanel(props: TablePanelProps) {
  const t = useI18n();
  const form = () => props.ctrl.form;
  const set = props.ctrl.set;

  return (
    <div class="oasis-editor-table-properties-panel">
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          {NumField(
            t("table.rowHeight"),
            () => form().rowHeight,
            (v) => set("rowHeight", v),
            "editor-table-properties-row-height",
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SelectField
            label={t("table.rowHeightRule")}
            value={form().rowHeightRule}
            onChange={(value) =>
              set(
                "rowHeightRule",
                value as TablePropertiesDialogInitialValues["rowHeightRule"],
              )
            }
            data-testid="editor-table-properties-row-height-rule"
            options={[
              { value: "", label: t("table.rowAuto") },
              { value: "atLeast", label: t("table.rowAtLeast") },
              { value: "exact", label: t("table.rowExactly") },
            ]}
          />
        </Grid>
      </Grid>
      <Stack class="oasis-editor-dialog-style-row" direction="row" spacing={1}>
        <Checkbox
          label={t("table.repeatHeader")}
          checked={form().repeatHeader}
          onChange={(v) => set("repeatHeader", v)}
          data-testid="editor-table-properties-repeat-header"
        />
        <Checkbox
          label={t("table.allowBreakAcrossPages")}
          checked={form().allowBreakAcrossPages}
          onChange={(v) => set("allowBreakAcrossPages", v)}
          data-testid="editor-table-properties-allow-break"
        />
        <Checkbox
          label={t("table.hiddenRow")}
          checked={form().hiddenRow}
          onChange={(v) => set("hiddenRow", v)}
          data-testid="editor-table-properties-hidden-row"
        />
      </Stack>
    </div>
  );
}
