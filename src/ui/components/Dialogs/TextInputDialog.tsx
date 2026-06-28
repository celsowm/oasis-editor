import { createEffect, createSignal } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Dialog } from "./Dialog.js";
import { DialogFooter } from "./DialogFooter.js";

export interface TextInputDialogProps {
  isOpen: boolean;
  title: string;
  label: string;
  placeholder: string;
  initialValue: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
  testIds?: {
    input?: string;
    cancel?: string;
    confirm?: string;
  };
}

export function TextInputDialog(props: TextInputDialogProps) {
  const t = useI18n();
  const [value, setValue] = createSignal(props.initialValue);
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.isOpen) {
      setValue(props.initialValue);
      setTimeout(() => inputRef?.focus(), 50);
    }
  });

  const handleConfirm = () => {
    props.onConfirm(value());
    props.onClose();
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      title={props.title}
      onClose={props.onClose}
      footer={
        <DialogFooter
          onCancel={props.onClose}
          onConfirm={handleConfirm}
          cancelLabel={t("generic.cancel")}
          confirmLabel={props.confirmLabel}
          cancelTestId={props.testIds?.cancel}
          confirmTestId={props.testIds?.confirm}
        />
      }
    >
      <div class="oasis-editor-dialog-input-group">
        <label class="oasis-editor-dialog-label">{props.label}</label>
        <input
          ref={inputRef}
          type="text"
          class="oasis-editor-dialog-input"
          value={value()}
          onInput={(e) => setValue(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          placeholder={props.placeholder}
          data-testid={props.testIds?.input}
        />
      </div>
    </Dialog>
  );
}
