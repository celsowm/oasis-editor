import { Dialog } from "./Dialog.js";
import { DialogFooter } from "./DialogFooter.js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Tabs } from "@/ui/components/Tabs/Tabs.js";

import { useFontDialogController } from "./font-dialog/useFontDialogController.js";
import { FontTab } from "./font-dialog/FontTab.js";
import { AdvancedFontTab } from "./font-dialog/AdvancedFontTab.js";
import type { FontDialogProps } from "./font-dialog/FontDialogTypes.js";

export type {
  FontDialogInitialValues,
  FontDialogApplyValues,
  FontDialogProps,
} from "./font-dialog/FontDialogTypes.js";

export function FontDialog(props: FontDialogProps) {
  const t = useI18n();
  const ctrl = useFontDialogController(props);

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("dialog.font.title")}
      onClose={props.onClose}
      class="oasis-editor-font-dialog"
      bodyClass="oasis-editor-font-dialog-body"
      size="font"
      footer={
        <DialogFooter
          onCancel={props.onClose}
          onConfirm={ctrl.handleApply}
          cancelLabel={t("generic.cancel")}
          confirmLabel={t("generic.ok")}
          cancelTestId="editor-font-dialog-cancel"
          confirmTestId="editor-font-dialog-apply"
        />
      }
    >
      <Tabs
        class="oasis-editor-font-dialog-tabs"
        ariaLabel={t("dialog.font.title")}
        value={ctrl.activeTab()}
        onChange={(id) => ctrl.setActiveTab(id as "font" | "advanced")}
        items={[
          {
            id: "font",
            label: t("dialog.font.tabFont"),
            testId: "editor-font-dialog-tab-font",
            panel: <FontTab ctrl={ctrl} />,
          },
          {
            id: "advanced",
            label: t("dialog.font.tabAdvanced"),
            testId: "editor-font-dialog-tab-advanced",
            panel: <AdvancedFontTab ctrl={ctrl} />,
          },
        ]}
      />
    </Dialog>
  );
}
