import { createSignal, createEffect } from "solid-js";
import { Dialog } from "./Dialog.js";

interface ImageAltDialogProps {
  isOpen: boolean;
  initialAlt: string;
  onClose: () => void;
  onConfirm: (alt: string) => void;
}

export function ImageAltDialog(props: ImageAltDialogProps) {
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
      title="Image Alt Text"
      onClose={props.onClose}
      footer={
        <>
          <button
            class="oasis-editor-2-dialog-button oasis-editor-2-dialog-button-secondary"
            onClick={props.onClose}
          >
            Cancel
          </button>
          <button
            class="oasis-editor-2-dialog-button oasis-editor-2-dialog-button-primary"
            onClick={handleConfirm}
          >
            Save
          </button>
        </>
      }
    >
      <div class="oasis-editor-2-dialog-input-group">
        <label class="oasis-editor-2-dialog-label">Description (Alt text)</label>
        <input
          ref={inputRef}
          type="text"
          class="oasis-editor-2-dialog-input"
          value={alt()}
          onInput={(e) => setAlt(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          placeholder="Describe the image"
        />
      </div>
    </Dialog>
  );
}
