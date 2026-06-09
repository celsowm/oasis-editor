import { Dialog } from "./Dialog.js";
import { Tabs } from "../Tabs/Tabs.js";
import { t } from "../../../i18n/index.js";
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
        <>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-secondary"
            onClick={props.onClose}
            data-testid="editor-font-dialog-cancel"
          >
            {t("generic.cancel")}
          </button>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-primary"
            onClick={ctrl.handleApply}
            data-testid="editor-font-dialog-apply"
          >
            {t("generic.ok")}
          </button>
        </>
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
