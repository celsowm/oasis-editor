import type { JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { TextInputDialog } from "./TextInputDialog.js";

interface LinkDialogProps {
  isOpen: boolean;
  initialHref: string;
  onClose: () => void;
  onConfirm: (href: string) => void;
}

export function LinkDialog(props: LinkDialogProps): JSX.Element {
  const t = useI18n();
  return (
    <TextInputDialog
      isOpen={props.isOpen}
      title={t("dialog.link.title")}
      label={t("dialog.link.label")}
      placeholder={t("dialog.link.placeholder")}
      initialValue={props.initialHref}
      confirmLabel={t("generic.apply")}
      onClose={props.onClose}
      onConfirm={props.onConfirm}
      testIds={{
        input: "editor-link-dialog-input",
        cancel: "editor-link-dialog-cancel",
        confirm: "editor-link-dialog-apply",
      }}
    />
  );
}
