import type { JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Dialog } from "./Dialog.js";
import { DialogFooter } from "./DialogFooter.js";

export interface NewDocumentConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function NewDocumentConfirmationDialog(
  props: NewDocumentConfirmationDialogProps,
): JSX.Element {
  const t = useI18n();

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("dialog.newDocument.title")}
      onClose={props.onClose}
      closeOnOverlayClick={false}
      size="sm"
      footer={
        <DialogFooter
          onCancel={props.onClose}
          onConfirm={props.onConfirm}
          cancelLabel={t("generic.cancel")}
          confirmLabel={t("dialog.newDocument.discard")}
          cancelTestId="editor-new-document-cancel"
          confirmTestId="editor-new-document-discard"
        />
      }
    >
      <p data-testid="editor-new-document-message">
        {t("dialog.newDocument.message")}
      </p>
    </Dialog>
  );
}
