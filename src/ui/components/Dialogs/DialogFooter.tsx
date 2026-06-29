import type { JSX } from "solid-js";
import { Button } from "@/ui/public/Button.js";

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
      <Button
        variant="secondary"
        onClick={props.onCancel}
        data-testid={props.cancelTestId}
      >
        {props.cancelLabel}
      </Button>
      <Button
        variant="primary"
        onClick={props.onConfirm}
        data-testid={props.confirmTestId}
      >
        {props.confirmLabel}
      </Button>
    </>
  );
}
