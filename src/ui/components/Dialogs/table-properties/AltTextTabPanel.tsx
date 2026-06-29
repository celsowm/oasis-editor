import { useI18n } from "@/i18n/I18nContext.js";
import { TextField } from "@/ui/public/TextField.js";
import type { TablePanelProps } from "./TableTabPanel.js";

export function AltTextTabPanel(props: TablePanelProps) {
  const t = useI18n();
  const form = () => props.ctrl.form;
  const set = props.ctrl.set;

  return (
    <div class="oasis-editor-table-properties-panel">
      <TextField
        label={t("table.altTitle")}
        value={form().altTitle}
        onChange={(v) => set("altTitle", v)}
        data-testid="editor-table-properties-alt-title"
      />
      <div class="oasis-editor-dialog-input-group">
        <label class="oasis-editor-dialog-label">
          {t("table.altDescription")}
        </label>
        <textarea
          class="oasis-editor-ui-input oasis-editor-table-properties-textarea"
          value={form().altDescription}
          onInput={(e) => set("altDescription", e.currentTarget.value)}
          data-testid="editor-table-properties-alt-description"
        />
      </div>
    </div>
  );
}
