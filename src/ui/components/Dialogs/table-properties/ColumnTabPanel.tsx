import type { JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Grid } from "@/ui/public/Grid.js";
import type { TablePanelProps } from "./TableTabPanel.js";
import type { TableFormState } from "./TablePropertiesTypes.js";
import { NumField } from "./fields.js";

export function ColumnTabPanel(props: TablePanelProps): JSX.Element {
  const t = useI18n();
  const form = (): TableFormState => props.ctrl.form;
  const set = props.ctrl.set;

  return (
    <div class="oasis-editor-table-properties-panel">
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          {NumField(
            t("table.columnWidth"),
            () => form().columnWidth,
            (v) => set("columnWidth", v),
            "editor-table-properties-column-width",
          )}
        </Grid>
      </Grid>
    </div>
  );
}
