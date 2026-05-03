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
      <div class="oasis-editor-2-dialog-overlay" onClick={props.onClose}>
        <div
          ref={dialogRef}
          class="oasis-editor-2-dialog"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          data-testid="editor-2-dialog"
        >
          <div class="oasis-editor-2-dialog-header">
            <h3 class="oasis-editor-2-dialog-title">{props.title}</h3>
            <button
              class="oasis-editor-2-dialog-close"
              onClick={props.onClose}
              title="Close"
              data-testid="editor-2-dialog-close"
            >
              <i data-lucide="x" />
            </button>
          </div>
          <div class="oasis-editor-2-dialog-body" data-testid="editor-2-dialog-body">
            {props.children}
          </div>
          <Show when={props.footer}>
            <div class="oasis-editor-2-dialog-footer" data-testid="editor-2-dialog-footer">
              {props.footer}
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
