import { Text } from "../public/Text.js";
import { IconButton } from "../public/IconButton.js";
import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  type JSX,
} from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { TranslationKey } from "@/i18n/index.js";
import type { ClipboardNotice } from "../app/createEditorClipboardActions.js";
import { ToolIcon } from "../utils/customIcons.js";

export function ClipboardFeedback(props: {
  notice: () => ClipboardNotice | undefined;
  onDismiss: () => void;
}): JSX.Element {
  const t = useI18n();
  let region: HTMLDivElement | undefined;
  const [top, setTop] = createSignal(12);
  createEffect((): void => {
    if (!props.notice()) return;
    const owner = region?.parentElement;
    if (!owner) return;
    const measure = (): void => {
      const bounds = owner.getBoundingClientRect();
      const toolbar = owner.querySelector<HTMLElement>(".oasis-editor-toolbar");
      const preferred = toolbar
        ? toolbar.getBoundingClientRect().bottom - bounds.top + 8
        : 12;
      const minimum = Math.max(12, 12 - bounds.top);
      const maximum =
        window.innerHeight - bounds.top - (region?.offsetHeight ?? 0) - 12;
      setTop(Math.max(minimum, Math.min(preferred, maximum)));
    };
    queueMicrotask(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(owner);
    if (region) observer.observe(region);
    const toolbar = owner.querySelector(".oasis-editor-toolbar");
    if (toolbar) observer.observe(toolbar);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    onCleanup((): void => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    });
  });
  const message = (notice: ClipboardNotice): string => {
    const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+";
    const shortcut = `${mod}${notice.action === "copy" ? "C" : notice.action === "cut" ? "X" : "V"}`;
    const key: TranslationKey =
      notice.issue === "access-denied"
        ? `clipboard.${notice.action}Denied`
        : notice.issue === "empty"
          ? "clipboard.empty"
          : notice.issue === "document-changed"
            ? "clipboard.documentChanged"
            : notice.mode && notice.mode !== "rich"
              ? "clipboard.unsupportedOption"
              : "clipboard.unsupported";
    return t(key, [shortcut]);
  };
  return (
    <div
      ref={region}
      style={{ top: `${top()}px` }}
      class="oasis-editor-clipboard-feedback"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Show when={props.notice()}>
        {(notice): JSX.Element => (
          <div
            class="oasis-editor-clipboard-feedback-message"
            data-testid="editor-clipboard-feedback"
          >
            <ToolIcon name="clipboard" />
            <Text>{message(notice())}</Text>
            <IconButton
              variant="ghost"
              size="sm"
              icon="x"
              label={t("generic.close")}
              onClick={props.onDismiss}
              data-testid="editor-clipboard-feedback-close"
            />
          </div>
        )}
      </Show>
    </div>
  );
}
