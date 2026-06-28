import { useI18n } from "@/i18n/I18nContext.js";
import { TextInputDialog } from "./TextInputDialog.js";

interface ImageAltDialogProps {
  isOpen: boolean;
  initialAlt: string;
  onClose: () => void;
  onConfirm: (alt: string) => void;
}

export function ImageAltDialog(props: ImageAltDialogProps) {
  const t = useI18n();
  return (
    <TextInputDialog
      isOpen={props.isOpen}
      title={t("dialog.imageAlt.title")}
      label={t("dialog.imageAlt.label")}
      placeholder={t("dialog.imageAlt.placeholder")}
      initialValue={props.initialAlt}
      confirmLabel={t("generic.save")}
      onClose={props.onClose}
      onConfirm={props.onConfirm}
    />
  );
}
