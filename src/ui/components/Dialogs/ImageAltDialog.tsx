import { createSignal, createEffect } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Dialog } from "./Dialog.js";

interface ImageAltDialogProps {
  isOpen: boolean;
  initialAlt: string;
  onClose: () => void;
  onConfirm: (alt: string) => void;
}

export function ImageAltDialog(props: ImageAltDialogProps) {
  const t = useI18n();
  const [alt, setAlt] = createSignal(props.initialAlt);
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.isOpen) {
      setAlt(props.initialAlt);
      setTimeout(() => inputRef?.focus(), 50);
    }
  });

  const handleConfirm = () => {
    props.onConfirm(alt());
    props.onClose();
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("dialog.imageAlt.title")}
      onClose={props.onClose}
      footer={
        <>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-secondary"
            onClick={props.onClose}
          >
            {t("generic.cancel")}
          </button>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-primary"
            onClick={handleConfirm}
          >
            {t("generic.save")}
          </button>
        </>
      }
    >
      <div class="oasis-editor-dialog-input-group">
        <label class="oasis-editor-dialog-label">
          {t("dialog.imageAlt.label")}
        </label>
        <input
          ref={inputRef}
          type="text"
          class="oasis-editor-dialog-input"
          value={alt()}
          onInput={(e) => setAlt(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          placeholder={t("dialog.imageAlt.placeholder")}
        />
      </div>
    </Dialog>
  );
}
