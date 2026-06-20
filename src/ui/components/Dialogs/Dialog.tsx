import {
  createMemo,
  createUniqueId,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import "./Dialog.css";
import { useI18n } from "@/i18n/I18nContext.js";

export interface DialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: JSX.Element;
  footer?: JSX.Element;
  class?: string;
  bodyClass?: string;
  titleId?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  size?: "sm" | "md" | "lg" | "font";
  closeOnOverlayClick?: boolean;
}

export function Dialog(props: DialogProps) {
  const t = useI18n();
  let dialogRef: HTMLDivElement | undefined;
  const fallbackTitleId = createUniqueId();
  const titleId = createMemo(() => props.titleId ?? fallbackTitleId);
  const size = createMemo(() => props.size ?? "md");
  const dialogClass = createMemo(() =>
    ["oasis-editor-dialog", `oasis-editor-dialog-${size()}`, props.class]
      .filter(Boolean)
      .join(" "),
  );
  const bodyClass = createMemo(() =>
    ["oasis-editor-dialog-body", props.bodyClass].filter(Boolean).join(" "),
  );

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
      <div
        class="oasis-editor-dialog-overlay"
        onClick={() => {
          if (props.closeOnOverlayClick ?? true) {
            props.onClose();
          }
        }}
      >
        <div
          ref={dialogRef}
          class={dialogClass()}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={props.ariaLabel}
          aria-labelledby={props.ariaLabel ? undefined : titleId()}
          aria-describedby={props.ariaDescribedBy}
          data-testid="editor-dialog"
        >
          <div class="oasis-editor-dialog-header">
            <h3 id={titleId()} class="oasis-editor-dialog-title">
              {props.title}
            </h3>
            <button
              class="oasis-editor-dialog-close"
              onClick={props.onClose}
              title={t("generic.close")}
              data-testid="editor-dialog-close"
            >
              <i data-lucide="x" />
            </button>
          </div>
          <div class={bodyClass()} data-testid="editor-dialog-body">
            {props.children}
          </div>
          <Show when={props.footer}>
            <div
              class="oasis-editor-dialog-footer"
              data-testid="editor-dialog-footer"
            >
              {props.footer}
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
