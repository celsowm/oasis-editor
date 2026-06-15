import { createEffect, createSignal } from "solid-js";
import { Dialog } from "./Dialog.js";
import { t } from "../../../i18n/index.js";

interface ImageCaptionDialogProps {
  isOpen: boolean;
  initialCaption: string;
  onClose: () => void;
  onConfirm: (caption: string) => void;
}

export function ImageCaptionDialog(props: ImageCaptionDialogProps) {
  const [caption, setCaption] = createSignal(props.initialCaption);
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.isOpen) {
      setCaption(props.initialCaption);
      setTimeout(() => inputRef?.focus(), 50);
    }
  });

  const handleConfirm = () => {
    props.onConfirm(caption());
    props.onClose();
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("dialog.imageCaption.title")}
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
          {t("dialog.imageCaption.label")}
        </label>
        <input
          ref={inputRef}
          type="text"
          class="oasis-editor-dialog-input"
          value={caption()}
          onInput={(e) => setCaption(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          placeholder={t("dialog.imageCaption.placeholder")}
        />
      </div>
    </Dialog>
  );
}
