import type { JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { TextAreaField } from "@/ui/public/TextAreaField.js";
import { TextField } from "@/ui/public/TextField.js";
import type { TablePanelProps } from "./TableTabPanel.js";
import type { TableFormState } from "./TablePropertiesTypes.js";

export function AltTextTabPanel(props: TablePanelProps): JSX.Element {
  const t = useI18n();
  const form = (): TableFormState => props.ctrl.form;
  const set = props.ctrl.set;

  return (
    <div class="oasis-editor-table-properties-panel">
      <TextField
        label={t("table.altTitle")}
        value={form().altTitle}
        onChange={(v) => set("altTitle", v)}
        data-testid="editor-table-properties-alt-title"
      />
      <TextAreaField
        class="oasis-editor-dialog-input-group"
        label={t("table.altDescription")}
        controlClass="oasis-editor-table-properties-textarea"
        value={form().altDescription}
        onChange={(value) => set("altDescription", value)}
        data-testid="editor-table-properties-alt-description"
      />
    </div>
  );
}
