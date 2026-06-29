import { createEffect, createSignal } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { TextField } from "@/ui/public/TextField.js";
import { Dialog } from "./Dialog.js";
import { DialogFooter } from "./DialogFooter.js";
import { JSX } from "solid-js";

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

export function TextInputDialog(props: TextInputDialogProps): JSX.Element {
  const t = useI18n();
  const [value, setValue] = createSignal(props.initialValue);
  let inputRef: HTMLInputElement | undefined;

  createEffect((): void => {
    if (props.isOpen) {
      setValue(props.initialValue);
      setTimeout((): void | undefined => inputRef?.focus(), 50);
    }
  });

  const handleConfirm = (): void => {
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
      <TextField
        ref={inputRef}
        label={props.label}
        value={value()}
        onChange={setValue}
        onKeyDown={(e): false | void => e.key === "Enter" && handleConfirm()}
        placeholder={props.placeholder}
        data-testid={props.testIds?.input}
      />
    </Dialog>
  );
}
