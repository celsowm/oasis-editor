import { createSignal, createEffect } from "solid-js";
import { Dialog } from "./Dialog.js";
import { t } from "@/i18n/index.js";

interface LinkDialogProps {
  isOpen: boolean;
  initialHref: string;
  onClose: () => void;
  onConfirm: (href: string) => void;
}

export function LinkDialog(props: LinkDialogProps) {
  const [href, setHref] = createSignal(props.initialHref);
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.isOpen) {
      setHref(props.initialHref);
      setTimeout(() => inputRef?.focus(), 50);
    }
  });

  const handleConfirm = () => {
    props.onConfirm(href());
    props.onClose();
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("dialog.link.title")}
      onClose={props.onClose}
      footer={
        <>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-secondary"
            onClick={props.onClose}
            data-testid="editor-link-dialog-cancel"
          >
            {t("generic.cancel")}
          </button>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-primary"
            onClick={handleConfirm}
            data-testid="editor-link-dialog-apply"
          >
            {t("generic.apply")}
          </button>
        </>
      }
    >
      <div class="oasis-editor-dialog-input-group">
        <label class="oasis-editor-dialog-label">
          {t("dialog.link.label")}
        </label>
        <input
          ref={inputRef}
          type="text"
          class="oasis-editor-dialog-input"
          value={href()}
          onInput={(e) => setHref(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          placeholder={t("dialog.link.placeholder")}
          data-testid="editor-link-dialog-input"
        />
      </div>
    </Dialog>
  );
}
