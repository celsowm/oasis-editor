import { useI18n } from "@/i18n/I18nContext.js";
import { TextInputDialog } from "./TextInputDialog.js";

interface ImageCaptionDialogProps {
  isOpen: boolean;
  initialCaption: string;
  onClose: () => void;
  onConfirm: (caption: string) => void;
}

export function ImageCaptionDialog(props: ImageCaptionDialogProps) {
  const t = useI18n();
  return (
    <TextInputDialog
      isOpen={props.isOpen}
      title={t("dialog.imageCaption.title")}
      label={t("dialog.imageCaption.label")}
      placeholder={t("dialog.imageCaption.placeholder")}
      initialValue={props.initialCaption}
      confirmLabel={t("generic.save")}
      onClose={props.onClose}
      onConfirm={props.onConfirm}
    />
  );
}
