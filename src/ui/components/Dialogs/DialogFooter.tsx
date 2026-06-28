import type { JSX } from "solid-js";

interface DialogFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel: string;
  confirmLabel: string;
  cancelTestId?: string;
  confirmTestId?: string;
}

export function DialogFooter(props: DialogFooterProps): JSX.Element {
  return (
    <>
      <button
        class="oasis-editor-dialog-button oasis-editor-dialog-button-secondary"
        onClick={props.onCancel}
        data-testid={props.cancelTestId}
      >
        {props.cancelLabel}
      </button>
      <button
        class="oasis-editor-dialog-button oasis-editor-dialog-button-primary"
        onClick={props.onConfirm}
        data-testid={props.confirmTestId}
      >
        {props.confirmLabel}
      </button>
    </>
  );
}
