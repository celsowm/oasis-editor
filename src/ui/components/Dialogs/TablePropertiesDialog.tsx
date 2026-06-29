import type { JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Dialog } from "./Dialog.js";
import { DialogFooter } from "./DialogFooter.js";
import { Tabs } from "@/ui/components/Tabs/Tabs.js";

import { useTablePropertiesController } from "./table-properties/useTablePropertiesController.js";
import { TableTabPanel } from "./table-properties/TableTabPanel.js";
import { RowTabPanel } from "./table-properties/RowTabPanel.js";
import { ColumnTabPanel } from "./table-properties/ColumnTabPanel.js";
import { CellTabPanel } from "./table-properties/CellTabPanel.js";
import { AltTextTabPanel } from "./table-properties/AltTextTabPanel.js";
import type { TablePropertiesDialogProps } from "./table-properties/TablePropertiesTypes.js";

export type {
  TablePropertiesDialogInitialValues,
  TablePropertiesDialogBorders,
  TablePropertiesDialogApplyValues,
  TablePropertiesDialogProps,
} from "./table-properties/TablePropertiesTypes.js";

export function TablePropertiesDialog(
  props: TablePropertiesDialogProps,
): JSX.Element {
  const t = useI18n();
  const ctrl = useTablePropertiesController(props);

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("table.propertiesTitle")}
      onClose={props.onClose}
      size="lg"
      class="oasis-editor-table-properties-dialog"
      bodyClass="oasis-editor-table-properties-body"
      footer={
        <DialogFooter
          onCancel={props.onClose}
          onConfirm={ctrl.handleApply}
          cancelLabel={t("generic.cancel")}
          confirmLabel={t("generic.ok")}
          cancelTestId="editor-table-properties-cancel"
          confirmTestId="editor-table-properties-apply"
        />
      }
    >
      <Tabs
        value={ctrl.form.activeTab}
        onChange={(tab) => ctrl.set("activeTab", tab)}
        ariaLabel={t("table.propertiesTitle")}
        class="oasis-editor-table-properties-tabs"
        items={[
          {
            id: "table",
            label: t("table.tabTable"),
            testId: "editor-table-properties-tab-table",
            panel: <TableTabPanel ctrl={ctrl} />,
          },
          {
            id: "row",
            label: t("table.tabRow"),
            testId: "editor-table-properties-tab-row",
            panel: <RowTabPanel ctrl={ctrl} />,
          },
          {
            id: "column",
            label: t("table.tabColumn"),
            testId: "editor-table-properties-tab-column",
            panel: <ColumnTabPanel ctrl={ctrl} />,
          },
          {
            id: "cell",
            label: t("table.tabCell"),
            testId: "editor-table-properties-tab-cell",
            panel: <CellTabPanel ctrl={ctrl} />,
          },
          {
            id: "altText",
            label: t("table.tabAltText"),
            testId: "editor-table-properties-tab-alt-text",
            panel: <AltTextTabPanel ctrl={ctrl} />,
          },
        ]}
      />
    </Dialog>
  );
}
