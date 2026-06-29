import { useI18n } from "@/i18n/I18nContext.js";
import type { TablePanelProps } from "./TableTabPanel.js";
import { NumField } from "./fields.js";

export function ColumnTabPanel(props: TablePanelProps) {
  const t = useI18n();
  const form = () => props.ctrl.form;
  const set = props.ctrl.set;

  return (
    <div class="oasis-editor-table-properties-panel">
      <div class="oasis-editor-dialog-row">
        {NumField(
          t("table.columnWidth"),
          () => form().columnWidth,
          (v) => set("columnWidth", v),
          "editor-table-properties-column-width",
        )}
      </div>
    </div>
  );
}
