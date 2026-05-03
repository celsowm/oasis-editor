import { createSignal, createEffect } from "solid-js";
import { Dialog } from "./Dialog.js";

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
      title="Insert Link"
      onClose={props.onClose}
      footer={
        <>
          <button
            class="oasis-editor-2-dialog-button oasis-editor-2-dialog-button-secondary"
            onClick={props.onClose}
            data-testid="editor-2-link-dialog-cancel"
          >
            Cancel
          </button>
          <button
            class="oasis-editor-2-dialog-button oasis-editor-2-dialog-button-primary"
            onClick={handleConfirm}
            data-testid="editor-2-link-dialog-apply"
          >
            Apply
          </button>
        </>
      }
    >
      <div class="oasis-editor-2-dialog-input-group">
        <label class="oasis-editor-2-dialog-label">Link URL</label>
        <input
          ref={inputRef}
          type="text"
          class="oasis-editor-2-dialog-input"
          value={href()}
          onInput={(e) => setHref(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          placeholder="https://example.com"
          data-testid="editor-2-link-dialog-input"
        />
      </div>
    </Dialog>
  );
}
