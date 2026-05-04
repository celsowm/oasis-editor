import { createEffect, onCleanup, onMount, Show, type JSX } from "solid-js";
import "./Dialog.css";

interface DialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: JSX.Element;
  footer?: JSX.Element;
}

export function Dialog(props: DialogProps) {
  let dialogRef: HTMLDivElement | undefined;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.isOpen) {
      props.onClose();
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <Show when={props.isOpen}>
      <div class="oasis-editor-dialog-overlay" onClick={props.onClose}>
        <div
          ref={dialogRef}
          class="oasis-editor-dialog"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          data-testid="editor-dialog"
        >
          <div class="oasis-editor-dialog-header">
            <h3 class="oasis-editor-dialog-title">{props.title}</h3>
            <button
              class="oasis-editor-dialog-close"
              onClick={props.onClose}
              title="Close"
              data-testid="editor-dialog-close"
            >
              <i data-lucide="x" />
            </button>
          </div>
          <div class="oasis-editor-dialog-body" data-testid="editor-dialog-body">
            {props.children}
          </div>
          <Show when={props.footer}>
            <div class="oasis-editor-dialog-footer" data-testid="editor-dialog-footer">
              {props.footer}
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
