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
  /** Overrides the default `editor-dialog` test id on the dialog element. */
  testId?: string;
  /** Opt-in focus containment for dialogs that own their entire keyboard interaction. */
  initialFocusTestId?: string;
}

export function Dialog(props: DialogProps): JSX.Element {
  const t = useI18n();
  let dialogRef: HTMLDivElement | undefined;
  const fallbackTitleId = createUniqueId();
  const titleId = createMemo((): string => props.titleId ?? fallbackTitleId);
  const size = createMemo(
    (): "sm" | "md" | "lg" | "font" => props.size ?? "md",
  );
  const dialogClass = createMemo((): string =>
    ["oasis-editor-dialog", `oasis-editor-dialog-${size()}`, props.class]
      .filter(Boolean)
      .join(" "),
  );
  const bodyClass = createMemo((): string =>
    ["oasis-editor-dialog-body", props.bodyClass].filter(Boolean).join(" "),
  );

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!props.isOpen) return;
    if (e.key === "Escape") {
      if (props.initialFocusTestId) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      props.onClose();
      return;
    }
    if (e.key !== "Tab" || !props.initialFocusTestId || !dialogRef) return;
    const controls = Array.from(dialogRef.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter(el => el.tabIndex >= 0 && el.getClientRects().length > 0 &&
      !el.closest('[inert], [aria-hidden="true"]'));
    const items = controls.filter(el => {
      if (!(el instanceof HTMLInputElement) || el.type !== "radio" || !el.name) return true;
      const group = controls.filter(other => other instanceof HTMLInputElement &&
        other.type === "radio" && other.name === el.name) as HTMLInputElement[];
      return el === (group.find(radio => radio.checked) ?? group[0]);
    });
    if (!items.length) return;
    const first = items[0]!, last = items[items.length - 1]!;
    const active = document.activeElement;
    if (!dialogRef.contains(active) || active === dialogRef ||
        (e.shiftKey ? active === first : active === last)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus({preventScroll:true});
    }
    // Do not let the hidden editor input or host shortcuts process dialog Tab.
    e.stopPropagation();
  };

  onMount((): void => {
    window.addEventListener("keydown", handleKeyDown, Boolean(props.initialFocusTestId));
  });

  onCleanup((): void => {
    window.removeEventListener("keydown", handleKeyDown, Boolean(props.initialFocusTestId));
  });

  return (
    <Show when={props.isOpen}>
      <div
        class="oasis-editor-dialog-overlay"
        onClick={(): void => {
          if (props.closeOnOverlayClick ?? true) {
            props.onClose();
          }
        }}
      >
        <div
          ref={el => {
            dialogRef = el;
            if (props.initialFocusTestId) queueMicrotask(() => {
              if (!props.isOpen || !el.isConnected) return;
              el.querySelector<HTMLElement>(`[data-testid="${props.initialFocusTestId}"]`)?.focus({preventScroll:true});
            });
          }}
          class={dialogClass()}
          onClick={(e): void => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={props.ariaLabel}
          aria-labelledby={props.ariaLabel ? undefined : titleId()}
          aria-describedby={props.ariaDescribedBy}
          data-testid={props.testId ?? "editor-dialog"}
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
